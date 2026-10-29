// Sanity Content Lake over the plain HTTP API. The dataset is private (bookings hold personal data), so every
// call carries the Editor token from SSM; the browser never talks to Sanity directly.
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import type { Calendar, Interval, Rules, WeekHours } from "./slots";
import { MINUTE } from "./time";

const API = `https://${process.env.SANITY_PROJECT_ID}.api.sanity.io/v2025-02-19`;
const DATASET = process.env.SANITY_DATASET!;
const ssm = new SSMClient({});
let token: Promise<string> | null = null;

function getToken() {
  token ??= ssm
    .send(new GetParameterCommand({ Name: process.env.SANITY_TOKEN_PARAM!, WithDecryption: true }))
    .then((r) => r.Parameter!.Value!)
    .catch((error) => {
      token = null;
      throw error;
    });
  return token;
}

async function call<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${await getToken()}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Sanity ${path} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as T;
}

// Published documents only: drafts in the Studio never take slots or appear on the site
export async function query<T>(groq: string, params: Record<string, unknown> = {}) {
  const { result } = await call<{ result: T }>(`/data/query/${DATASET}?perspective=published`, { query: groq, params });
  return result;
}

// visibility "sync": the next query already sees the change (needed for the double-booking check)
export async function mutate(mutations: unknown[]) {
  return call<{ results: { id: string }[] }>(`/data/mutate/${DATASET}?visibility=sync&returnIds=true`, { mutations });
}

export interface Service {
  id: string;
  name: string;
  duration: number;
  price: number | null;
  priceFrom: boolean;
  description: string | null;
}

export interface Config {
  salon: { name: string; street: string; zip: string; city: string; phone: string };
  notifyEmail: string | null;
  bookingEnabled: boolean;
  notice: string | null;
  cancelHours: number;
  rules: Rules;
  hours: WeekHours;
  services: Service[];
}

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

interface RawConfig {
  settings: Record<string, unknown> | null;
  hours: Record<string, { from?: string; to?: string }[] | undefined> | null;
  services: (Omit<Service, "priceFrom"> & { priceFrom?: boolean })[];
}

const num = (value: unknown, min: number, max: number, fallback: number) => (typeof value === "number" && value >= min && value <= max ? value : fallback);
const str = (value: unknown) => (typeof value === "string" ? value : "");

// Only well-formed values from the Studio count; everything else falls back to safe defaults
function toConfig(raw: RawConfig): Config {
  const s = raw.settings ?? {};
  const hours: WeekHours = {};
  DAYS.forEach((day, i) => {
    hours[i + 1] = (raw.hours?.[day] ?? []).filter((w): w is { from: string; to: string } => TIME.test(w.from ?? "") && TIME.test(w.to ?? "") && w.from! < w.to!);
  });
  return {
    salon: { name: str(s.name) || "Salon", street: str(s.street), zip: str(s.zip), city: str(s.city), phone: str(s.phone) },
    notifyEmail: str(s.notifyEmail) || null,
    bookingEnabled: s.bookingEnabled !== false,
    notice: str(s.notice) || null,
    cancelHours: num(s.cancelHours, 0, 168, 12),
    rules: {
      slotMinutes: [5, 10, 15, 20, 30, 60].includes(s.slotMinutes as number) ? (s.slotMinutes as number) : 15,
      minNoticeHours: num(s.minNoticeHours, 0, 336, 2),
      horizonDays: Math.round(num(s.horizonDays, 1, 180, 28)),
      bufferMinutes: num(s.bufferMinutes, 0, 120, 0),
    },
    hours,
    services: raw.services
      .filter((x) => x.name && Number.isInteger(x.duration) && x.duration >= 5 && x.duration <= 480)
      .map((x) => ({ ...x, priceFrom: Boolean(x.priceFrom), price: typeof x.price === "number" ? x.price : null })),
  };
}

const CONFIG_QUERY = `{
  "settings": *[_id == "settings"][0],
  "hours": *[_id == "openingHours"][0],
  "services": *[_type == "service" && active != false] | order(order asc, name asc) {
    "id": _id, name, duration, price, priceFrom, description
  }
}`;

// Cached per Lambda instance: changes in the Studio show up within a minute
const CACHE_MS = 60_000;
let cached: { at: number; config: Config } | null = null;

export async function loadConfig(): Promise<Config> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.config;
  const config = toConfig(await query<RawConfig>(CONFIG_QUERY));
  cached = { at: Date.now(), config };
  return config;
}

// Everything that takes time between two instants, read fresh (no cache) because it decides about free slots.
// Bookings without an end last as long as their service.
export async function loadCalendar(config: Config, range: Interval): Promise<Calendar> {
  const busy = await query<{ bookings: { start: string; end?: string; duration?: number }[]; blocks: { start: string; end: string }[]; closures: { from: string; to: string }[] }>(
    `{
      "bookings": *[_type == "booking" && status != "cancelled" && dateTime(start) < dateTime($to) && dateTime(start) > dateTime($from) - 60*60*24]{
        start, end, "duration": service->duration
      },
      "blocks": *[_type == "block" && dateTime(start) < dateTime($to) && dateTime(end) > dateTime($from)]{ start, end },
      "closures": *[_type == "closure" && to >= $fromDate && from <= $toDate]{ from, to }
    }`,
    {
      from: new Date(range.start).toISOString(),
      to: new Date(range.end).toISOString(),
      fromDate: new Date(range.start - 86_400_000).toISOString().slice(0, 10),
      toDate: new Date(range.end + 86_400_000).toISOString().slice(0, 10),
    },
  );
  const bookings = busy.bookings.flatMap((b) => {
    const start = Date.parse(b.start);
    const end = b.end ? Date.parse(b.end) : start + (b.duration ?? 30) * MINUTE;
    return Number.isFinite(start) && Number.isFinite(end) ? [{ start, end }] : [];
  });
  const blocks = busy.blocks.map((b) => ({ start: Date.parse(b.start), end: Date.parse(b.end) })).filter((b) => b.end > b.start);
  return { rules: config.rules, hours: config.hours, closures: busy.closures.filter((c) => c.from && c.to), bookings, blocks };
}

export interface BookingSummary {
  id: string;
  start: string;
  end: string;
  status: string;
  customerName: string;
  service: string;
}

export async function findByCancelHash(hash: string) {
  return query<BookingSummary | null>(
    `*[_type == "booking" && cancelTokenHash == $hash][0]{ "id": _id, start, "end": coalesce(end, start), status, customerName, "service": service->name }`,
    { hash },
  );
}
