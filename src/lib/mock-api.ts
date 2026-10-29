// Local stand-in for /api/* (pnpm dev:mock): sample salon, real slot logic, bookings kept in memory. Lets the
// booking flow be developed and tested in the browser without AWS or Sanity. Never part of a deploy build.
import type { ApiResult } from "@/lib/api";
import { freeDays, isFree, type Calendar } from "../../infra/lambda/api/slots";
import { addDays, berlinDate, berlinToUtc } from "../../infra/lambda/api/time";

const SERVICES = [
  { id: "service-herren", name: "Herrenschnitt", duration: 30, price: 25, priceFrom: false, description: "Waschen, Schneiden, Styling" },
  { id: "service-bart", name: "Bart trimmen", duration: 15, price: 12, priceFrom: false, description: null },
  { id: "service-kombi", name: "Haarschnitt + Bart", duration: 45, price: 35, priceFrom: false, description: "Das Komplettpaket" },
  { id: "service-damen", name: "Damenschnitt", duration: 60, price: 39, priceFrom: true, description: "Preis je nach Haarlänge" },
  { id: "service-kinder", name: "Kinderschnitt (bis 12)", duration: 20, price: 15, priceFrom: false, description: null },
];

const WORKDAY = [{ from: "09:00", to: "13:00" }, { from: "14:00", to: "18:00" }];
const calendar: Calendar = {
  rules: { slotMinutes: 15, minNoticeHours: 2, horizonDays: 28, bufferMinutes: 0 },
  hours: { 2: WORKDAY, 3: WORKDAY, 4: WORKDAY, 5: WORKDAY, 6: [{ from: "09:00", to: "14:00" }] },
  closures: [{ from: addDays(berlinDate(Date.now()), 9), to: addDays(berlinDate(Date.now()), 10) }],
  // A few taken slots so the grid has gaps
  bookings: [1, 2, 3, 4, 5].flatMap((d) => {
    const date = addDays(berlinDate(Date.now()), d);
    return ["10:00", "11:30", "15:00"].map((t) => ({ start: berlinToUtc(date, t), end: berlinToUtc(date, t) + 45 * 60_000 }));
  }),
  blocks: [],
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ok = <T,>(data: unknown): ApiResult<T> => ({ ok: true, data: data as T });
const fail = <T,>(status: number, error: string, data?: unknown): ApiResult<T> => ({ ok: false, status, error, data: data as T });

export async function mockFetch<T>(path: string, init: RequestInit): Promise<ApiResult<T>> {
  await delay(250);
  const url = new URL(path, "http://mock");
  if (url.pathname === "/api/config") {
    return ok({
      salon: { name: "Salon Bedi", street: "Musterstraße 1", zip: "12345", city: "Musterstadt", phone: "+49 123 456789" },
      bookingEnabled: true,
      notice: "Bitte sei 5 Minuten vor deinem Termin da. (Beispieldaten)",
      horizonDays: calendar.rules.horizonDays,
      services: SERVICES,
      customerMail: true,
      timeZone: "Europe/Berlin",
    });
  }
  if (url.pathname === "/api/slots") {
    const service = SERVICES.find((s) => s.id === url.searchParams.get("service"));
    if (!service) return fail(404, "service_unknown");
    const days = freeDays(calendar, berlinDate(Date.now()), calendar.rules.horizonDays + 1, service.duration, Date.now());
    return ok({ service: service.id, duration: service.duration, days: days.map((d) => ({ date: d.date, slots: d.slots.map((s) => new Date(s).toISOString()) })) });
  }
  if (url.pathname === "/api/challenge") return ok({ id: "0".repeat(32), difficulty: 1 });
  if (url.pathname === "/api/book") {
    const body = JSON.parse(String(init.body));
    const service = SERVICES.find((s) => s.id === body.service);
    const start = Date.parse(body.start);
    if (!service) return fail(400, "service_unknown");
    if (!/^[+\d][\d\s()/.-]{6,}$/.test(body.phone ?? "")) return fail(400, "phone_invalid");
    if (String(body.name ?? "").trim().length < 2) return fail(400, "name_required");
    if (!isFree(calendar, start, service.duration, Date.now())) return fail(409, "slot_taken");
    const end = start + service.duration * 60_000;
    calendar.bookings.push({ start, end });
    return ok({ ok: true, booking: { id: "booking-mock", service: service.name, duration: service.duration, start: body.start, end: new Date(end).toISOString(), name: body.name }, confirmationMail: Boolean(body.email) });
  }
  if (url.pathname === "/api/cancel") {
    const body = JSON.parse(String(init.body));
    const booking = { service: "Herrenschnitt", start: new Date(Date.now() + 2 * 86_400_000).toISOString(), status: "confirmed", phone: "+49 123 456789", salon: "Salon Bedi" };
    if (body.token === "spaet") return fail(409, "too_late", { error: "too_late", booking });
    return ok(body.confirm ? { ok: true, cancelled: true, booking: { ...booking, status: "cancelled" } } : { ok: true, booking });
  }
  return fail(404, "not_found");
}
