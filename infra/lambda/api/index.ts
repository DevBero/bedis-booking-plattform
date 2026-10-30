// Booking API behind CloudFront under /api/* (Lambda function URL with origin access control, so only the
// distribution can call it). Contracts: docs/TECH.md §4.
//   GET  /api/config     services, notice, booking rules
//   GET  /api/slots      free start times per day for one service
//   GET  /api/challenge  invisible bot check (guard.ts)
//   POST /api/book       create a booking
// No mails and no self-service cancelling: the owner sees bookings in the Studio (plus a Telegram message),
// customers cancel by phone.
// The same function runs daily from EventBridge and deletes old bookings and shifts (cleanup()).
import { randomUUID } from "node:crypto";
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { count, DAY, issueChallenge, lockSlot, redeemChallenge, unlockSlot, validate, withinLimit } from "./guard";
import { normalizePhone } from "./phone";
import { loadCalendar, loadConfig, mutate } from "./sanity";
import { bookingWindow, isFree, shiftDays } from "./slots";
import { notifyBooking } from "./telegram";
import { DAY as DAY_MS, MINUTE, TIME_ZONE } from "./time";

// Bookings per IP and day; more from one address is abuse, not a customer
const BOOKINGS_PER_DAY = 3;
const SOURCES = /^[a-z0-9_-]{1,24}$/;

function json(statusCode: number, body: unknown, maxAge = 0): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { "content-type": "application/json", "cache-control": maxAge ? `public, max-age=${maxAge}` : "no-store" },
    body: JSON.stringify(body),
  };
}

// The visitor's IP: CloudFront passes it in CloudFront-Viewer-Address ("ip:port", IPv6 included)
function viewerIp(event: APIGatewayProxyEventV2) {
  const address = event.headers["cloudfront-viewer-address"];
  return address ? address.slice(0, address.lastIndexOf(":")) : event.requestContext.http.sourceIp;
}

function parseBody(event: APIGatewayProxyEventV2): Record<string, unknown> {
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body ?? "", "base64").toString("utf8") : (event.body ?? "");
    const body = JSON.parse(raw);
    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
}

async function config(params: Record<string, string | undefined>) {
  const c = await loadConfig();
  // Visits per source (QR code in the salon vs. direct); best effort, never fails the page
  const src = params.src && SOURCES.test(params.src) ? params.src : "direct";
  await count(`visit#${src}`).catch(() => undefined);
  return json(200, {
    bookingEnabled: c.bookingEnabled,
    notice: c.notice,
    horizonDays: c.rules.horizonDays,
    services: c.services,
    timeZone: TIME_ZONE,
  });
}

async function slots(ip: string, params: Record<string, string | undefined>) {
  if (!(await withinLimit(ip, "slots", 300))) return json(429, { error: "rate_limited" });
  const c = await loadConfig();
  const service = c.services.find((s) => s.id === params.service);
  if (!service) return json(404, { error: "service_unknown" });
  if (!c.bookingEnabled) return json(200, { days: [] });
  const now = Date.now();
  const calendar = await loadCalendar(c, { start: now, end: bookingWindow(c.rules, now).end + DAY_MS });
  const result = shiftDays(calendar, service.duration, now).map((d) => ({ date: d.date, slots: d.slots.map((s) => new Date(s).toISOString()) }));
  return json(200, { service: service.id, duration: service.duration, days: result });
}

async function book(ip: string, body: Record<string, unknown>) {
  const checked = validate(body, {
    service: { required: true, max: 100 },
    start: { required: true, max: 40 },
    name: { required: true, max: 120 },
    phone: { required: true, max: 40 },
    note: { max: 1000 },
    src: { max: 24 },
  });
  if ("error" in checked) return json(400, { error: checked.error });
  const v = checked.values;

  // Honeypot or a bot that is faster than any person: fake success, so it learns nothing
  if (body.website) return json(200, { ok: true });
  const verdict = await redeemChallenge(body.challenge, body.nonce);
  if (verdict === "too_fast") return json(200, { ok: true });
  if (verdict === "invalid") return json(400, { error: "challenge_invalid" });

  const phone = normalizePhone(v.phone);
  if (!phone) return json(400, { error: "phone_invalid" });
  if (v.name.length < 2) return json(400, { error: "name_required" });
  // Counted only for requests that pass all checks, so fixing a typo never uses up the limit
  if (!(await withinLimit(ip, "book", BOOKINGS_PER_DAY, DAY))) return json(429, { error: "rate_limited" });

  const c = await loadConfig();
  if (!c.bookingEnabled) return json(409, { error: "booking_disabled" });
  const service = c.services.find((s) => s.id === v.service);
  if (!service) return json(400, { error: "service_unknown" });
  const start = Date.parse(v.start);
  if (!Number.isFinite(start)) return json(400, { error: "start_invalid" });
  const end = start + service.duration * MINUTE;

  // Lock first, then check the calendar in Sanity: covers parallel online bookings (lock) and appointments the
  // owner entered in the Studio (query), both right before the booking is written
  if (!(await lockSlot(start, end))) return json(409, { error: "slot_taken" });
  try {
    const now = Date.now();
    const calendar = await loadCalendar(c, { start: start - DAY_MS, end: end + DAY_MS });
    if (!isFree(calendar, start, service.duration, now)) return json(409, { error: "slot_taken" });

    const id = `booking-${randomUUID()}`;
    const src = v.src && SOURCES.test(v.src) ? v.src : "direct";
    await mutate([
      {
        create: {
          _id: id,
          _type: "booking",
          service: { _type: "reference", _ref: service.id },
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          customerName: v.name,
          phone,
          note: v.note || undefined,
          status: "confirmed",
          source: "online",
          channel: src,
          createdAt: new Date(now).toISOString(),
        },
      },
    ]);
    await Promise.all([
      count(`booking#${src}`).catch(() => undefined),
      notifyBooking({ start, service: service.name, duration: service.duration, name: v.name, phone, note: v.note }),
    ]);

    return json(200, {
      ok: true,
      booking: { id, service: service.name, duration: service.duration, start: new Date(start).toISOString(), end: new Date(end).toISOString(), name: v.name },
    });
  } finally {
    await unlockSlot(start, end).catch((error) => console.error("unlock failed", error));
  }
}

// Deletes bookings and shifts that are older than the retention period (docs/TECH.md §8), including leftover
// drafts in the Studio
export async function cleanup() {
  const days = Number(process.env.RETENTION_DAYS) || 30;
  const before = new Date(Date.now() - days * DAY_MS).toISOString();
  await mutate([
    { delete: { query: `*[_type == "booking" && dateTime(coalesce(end, start)) < dateTime($before)]`, params: { before } } },
    { delete: { query: `*[_type == "shift" && date < $day]`, params: { day: before.slice(0, 10) } } },
  ]);
  console.log(`cleanup: deleted bookings and shifts before ${before}`);
}

export async function handler(event: APIGatewayProxyEventV2 | { source?: string }): Promise<APIGatewayProxyResultV2 | void> {
  if ("source" in event && event.source === "aws.events") return cleanup();
  const http = event as APIGatewayProxyEventV2;
  const { method, path } = http.requestContext.http;
  const ip = viewerIp(http);
  const params = http.queryStringParameters ?? {};
  try {
    if (method === "GET" && path === "/api/config") return await config(params);
    if (method === "GET" && path === "/api/slots") return await slots(ip, params);
    if (method === "GET" && path === "/api/challenge") {
      if (!(await withinLimit(ip, "challenge", 30))) return json(429, { error: "rate_limited" });
      return json(200, await issueChallenge());
    }
    if (method === "POST" && path === "/api/book") return await book(ip, parseBody(http));
    return json(404, { error: "not_found" });
  } catch (error) {
    console.error(`${method} ${path} failed`, error);
    return json(500, { error: "server_error" });
  }
}
