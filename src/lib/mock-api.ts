// Local stand-in for /api/* (pnpm dev:mock): sample salon, real slot logic, bookings kept in memory. Lets the
// booking flow be developed and tested in the browser without AWS or Sanity. Never part of a deploy build.
import type { ApiResult } from "@/lib/api";
import { isFree, shiftDays, type Calendar } from "../../infra/lambda/api/slots";
import { addDays, berlinDate, berlinToUtc } from "../../infra/lambda/api/time";

const SERVICES = [
  { id: "service-herren", name: "Herren Haarschnitt", duration: 30, price: 25, priceFrom: false, description: "Waschen, Schneiden, Styling" },
  { id: "service-kombi", name: "Herren Haare + Bart", duration: 45, price: 35, priceFrom: false, description: "Das Komplettpaket" },
  { id: "service-bart", name: "Nur Bart", duration: 15, price: 12, priceFrom: false, description: null },
];

const day = (n: number) => addDays(berlinDate(Date.now()), n);
const at = (n: number, from: string, to: string) => ({ start: berlinToUtc(day(n), from), end: berlinToUtc(day(n), to) });
const calendar: Calendar = {
  rules: { slotMinutes: 15, minNoticeHours: 2, horizonDays: 28, bufferMinutes: 0 },
  // A few evenings and one Saturday-style morning, like the owner would enter them
  shifts: [at(1, "18:00", "22:00"), at(3, "18:00", "22:00"), at(6, "10:00", "14:00"), at(8, "18:00", "19:00"), at(13, "18:00", "22:00")],
  // A few taken slots so the grid has gaps; day 8 is fully booked
  bookings: [at(1, "18:30", "19:15"), at(1, "20:00", "20:30"), at(3, "19:00", "19:45"), at(8, "18:00", "19:00")],
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ok = <T,>(data: unknown): ApiResult<T> => ({ ok: true, data: data as T });
const fail = <T,>(status: number, error: string, data?: unknown): ApiResult<T> => ({ ok: false, status, error, data: data as T });

export async function mockFetch<T>(path: string, init: RequestInit): Promise<ApiResult<T>> {
  await delay(250);
  const url = new URL(path, "http://mock");
  if (url.pathname === "/api/config") {
    return ok({
      salon: { name: "Bedis Hairsalon" },
      bookingEnabled: true,
      notice: "Bitte sei 5 Minuten vor deinem Termin da. (Beispieldaten)",
      horizonDays: calendar.rules.horizonDays,
      services: SERVICES,
      timeZone: "Europe/Berlin",
    });
  }
  if (url.pathname === "/api/slots") {
    const service = SERVICES.find((s) => s.id === url.searchParams.get("service"));
    if (!service) return fail(404, "service_unknown");
    const days = shiftDays(calendar, service.duration, Date.now());
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
    return ok({ ok: true, booking: { id: "booking-mock", service: service.name, duration: service.duration, start: body.start, end: new Date(end).toISOString(), name: body.name } });
  }
  return fail(404, "not_found");
}
