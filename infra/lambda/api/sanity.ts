// Sanity Content Lake over the plain HTTP API. The dataset is private (bookings hold personal data), so every
// call carries the Editor token from SSM; the browser never talks to Sanity directly.
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import type { Calendar, Interval, Rules } from "./slots";
import { berlinDate, berlinToUtc, isDate, MINUTE } from "./time";

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
  salon: { name: string };
  bookingEnabled: boolean;
  notice: string | null;
  rules: Rules;
  services: Service[];
}

interface RawConfig {
  settings: Record<string, unknown> | null;
  services: (Omit<Service, "priceFrom"> & { priceFrom?: boolean })[];
}

const num = (value: unknown, min: number, max: number, fallback: number) => (typeof value === "number" && value >= min && value <= max ? value : fallback);
const str = (value: unknown) => (typeof value === "string" ? value : "");

// Only well-formed values from the Studio count; everything else falls back to safe defaults
function toConfig(raw: RawConfig): Config {
  const s = raw.settings ?? {};
  return {
    salon: { name: str(s.name) || "Salon" },
    bookingEnabled: s.bookingEnabled !== false,
    notice: str(s.notice) || null,
    rules: {
      slotMinutes: [5, 10, 15, 20, 30, 60].includes(s.slotMinutes as number) ? (s.slotMinutes as number) : 15,
      minNoticeHours: num(s.minNoticeHours, 0, 336, 2),
      horizonDays: Math.round(num(s.horizonDays, 1, 180, 28)),
      bufferMinutes: num(s.bufferMinutes, 0, 120, 0),
    },
    services: raw.services
      .filter((x) => x.name && Number.isInteger(x.duration) && x.duration >= 5 && x.duration <= 480)
      .map((x) => ({ ...x, priceFrom: Boolean(x.priceFrom), price: typeof x.price === "number" ? x.price : null })),
  };
}

const CONFIG_QUERY = `{
  "settings": *[_id == "settings"][0],
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

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

// Shifts and bookings between two instants, read fresh (no cache) because they decide about free slots.
// Shifts are Berlin date + wall-clock times; bookings without an end last as long as their service.
export async function loadCalendar(config: Config, range: Interval): Promise<Calendar> {
  const busy = await query<{ shifts: { date?: string; from?: string; to?: string }[]; bookings: { start: string; end?: string; duration?: number }[] }>(
    `{
      "shifts": *[_type == "shift" && date >= $fromDate && date <= $toDate]{ date, from, to },
      "bookings": *[_type == "booking" && status != "cancelled" && dateTime(start) < dateTime($to) && dateTime(start) > dateTime($from) - 60*60*24]{
        start, end, "duration": service->duration
      }
    }`,
    {
      from: new Date(range.start).toISOString(),
      to: new Date(range.end).toISOString(),
      fromDate: berlinDate(range.start),
      toDate: berlinDate(range.end),
    },
  );
  const shifts = busy.shifts.flatMap((s) =>
    isDate(s.date) && TIME.test(s.from ?? "") && TIME.test(s.to ?? "") && s.from! < s.to! ? [{ start: berlinToUtc(s.date, s.from!), end: berlinToUtc(s.date, s.to!) }] : [],
  );
  const bookings = busy.bookings.flatMap((b) => {
    const start = Date.parse(b.start);
    const end = b.end ? Date.parse(b.end) : start + (b.duration ?? 30) * MINUTE;
    return Number.isFinite(start) && Number.isFinite(end) ? [{ start, end }] : [];
  });
  return { rules: config.rules, shifts, bookings };
}
