// Booking API behind CloudFront under /api/* (Lambda function URL with origin access control, so only the
// distribution can call it). Contracts: docs/TECH.md §4.
//   GET  /api/config     services, salon details, notice
//   GET  /api/slots      free start times per day for one service
//   GET  /api/challenge  invisible bot check (guard.ts)
//   POST /api/book       create a booking
//   POST /api/cancel     cancel with the token from the confirmation mail
// The same function runs daily from EventBridge and deletes old bookings (cleanup()).
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { canReceiveMail, count, DAY, issueChallenge, lockSlot, redeemChallenge, unlockSlot, validate, withinLimit } from "./guard";
import { confirmCustomer, customerMailEnabled, longWhen, notifyOwner, shortWhen } from "./mail";
import { normalizePhone } from "./phone";
import { findByCancelHash, loadCalendar, loadConfig, mutate, type Config } from "./sanity";
import { bookingWindow, freeDays, isFree } from "./slots";
import { addDays, berlinDate, DAY as DAY_MS, isDate, MINUTE, TIME_ZONE } from "./time";

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

const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const address = (c: Config) => [c.salon.street, [c.salon.zip, c.salon.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");

async function config(params: Record<string, string | undefined>) {
  const c = await loadConfig();
  // Visits per source (QR code in the salon vs. direct); best effort, never fails the page
  const src = params.src && SOURCES.test(params.src) ? params.src : "direct";
  await count(`visit#${src}`).catch(() => undefined);
  return json(200, {
    salon: { ...c.salon },
    bookingEnabled: c.bookingEnabled,
    notice: c.notice,
    horizonDays: c.rules.horizonDays,
    services: c.services,
    customerMail: customerMailEnabled(),
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
  const today = berlinDate(now);
  const from = isDate(params.from) && params.from > today ? params.from : today;
  const days = Math.min(Math.max(Number(params.days) || c.rules.horizonDays + 1, 1), 62);
  const window = bookingWindow(c.rules, now);
  const calendar = await loadCalendar(c, { start: Date.parse(`${from}T00:00:00Z`) - DAY_MS, end: Math.min(Date.parse(`${addDays(from, days)}T00:00:00Z`), window.end) + DAY_MS });
  const result = freeDays(calendar, from, days, service.duration, now).map((d) => ({ date: d.date, slots: d.slots.map((s) => new Date(s).toISOString()) }));
  return json(200, { service: service.id, duration: service.duration, days: result });
}

async function book(ip: string, body: Record<string, unknown>) {
  const checked = validate(body, {
    service: { required: true, max: 100 },
    start: { required: true, max: 40 },
    name: { required: true, max: 120 },
    phone: { required: true, max: 40 },
    email: { max: 200, email: true },
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
  if (v.email && !(await canReceiveMail(v.email))) return json(400, { error: "email_unreachable" });
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

    const token = randomBytes(24).toString("base64url");
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
          email: v.email || undefined,
          note: v.note || undefined,
          status: "confirmed",
          source: "online",
          channel: src,
          cancelTokenHash: hash(token),
          createdAt: new Date(now).toISOString(),
        },
      },
    ]);
    await count(`booking#${src}`).catch(() => undefined);

    const mails: Promise<unknown>[] = [];
    const ownerTo = c.notifyEmail || process.env.MAIL_FALLBACK_TO;
    if (ownerTo) {
      mails.push(
        notifyOwner(ownerTo, `Neue Buchung: ${shortWhen(start)}, ${service.name}, ${v.name}`, [
          `${service.name} (${service.duration} Min.)`,
          longWhen(start),
          "",
          `Name: ${v.name}`,
          `Telefon: ${phone}`,
          `E-Mail: ${v.email || "–"}`,
          `Notiz: ${v.note || "–"}`,
          `Quelle: ${src === "qr" ? "QR-Code im Salon" : src}`,
        ], v.email || null),
      );
    }
    if (v.email && customerMailEnabled()) {
      mails.push(
        confirmCustomer({
          to: v.email,
          salonName: c.salon.name,
          salonPhone: c.salon.phone,
          replyTo: c.notifyEmail,
          when: start,
          service: service.name,
          cancelUrl: `${process.env.SITE_URL}/storno/?t=${token}`,
          cancelHours: c.cancelHours,
          address: address(c),
        }),
      );
    }
    // A failed mail must not undo a booking that is already in the calendar
    for (const r of await Promise.allSettled(mails)) if (r.status === "rejected") console.error("mail failed", r.reason);

    return json(200, {
      ok: true,
      booking: { id, service: service.name, duration: service.duration, start: new Date(start).toISOString(), end: new Date(end).toISOString(), name: v.name },
      confirmationMail: Boolean(v.email && customerMailEnabled()),
    });
  } finally {
    await unlockSlot(start, end).catch((error) => console.error("unlock failed", error));
  }
}

async function cancel(ip: string, body: Record<string, unknown>) {
  if (!(await withinLimit(ip, "cancel", 20))) return json(429, { error: "rate_limited" });
  const token = typeof body.token === "string" && /^[A-Za-z0-9_-]{20,64}$/.test(body.token) ? body.token : null;
  if (!token) return json(404, { error: "not_found" });
  const booking = await findByCancelHash(hash(token));
  if (!booking) return json(404, { error: "not_found" });
  const c = await loadConfig();
  const start = Date.parse(booking.start);
  const summary = { service: booking.service, start: booking.start, status: booking.status, phone: c.salon.phone, salon: c.salon.name };
  const deadline = start - c.cancelHours * 60 * MINUTE;
  if (booking.status !== "confirmed") return json(409, { error: "not_active", booking: summary });
  if (Date.now() > deadline) return json(409, { error: "too_late", booking: summary });
  // First call shows what would be cancelled, the second (confirm: true) cancels
  if (body.confirm !== true) return json(200, { ok: true, booking: summary });

  await mutate([{ patch: { id: booking.id, set: { status: "cancelled" } } }]);
  const ownerTo = c.notifyEmail || process.env.MAIL_FALLBACK_TO;
  if (ownerTo) {
    await notifyOwner(ownerTo, `Abgesagt: ${shortWhen(start)}, ${booking.service}, ${booking.customerName}`, [
      `${booking.customerName} hat den Termin über den Link in der Bestätigungsmail abgesagt.`,
      `${booking.service}, ${longWhen(start)}`,
      "Der Termin ist wieder online buchbar.",
    ]).catch((error) => console.error("mail failed", error));
  }
  return json(200, { ok: true, cancelled: true, booking: { ...summary, status: "cancelled" } });
}

// Deletes bookings and blocks whose appointment is older than the retention period (docs/TECH.md §8),
// including leftover drafts in the Studio
export async function cleanup() {
  const days = Number(process.env.RETENTION_DAYS) || 30;
  const before = new Date(Date.now() - days * DAY_MS).toISOString();
  const groq = `*[_type in ["booking", "block"] && dateTime(coalesce(end, start)) < dateTime($before)]`;
  await mutate([{ delete: { query: groq, params: { before } } }]);
  console.log(`cleanup: deleted bookings and blocks before ${before}`);
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
    if (method === "POST" && path === "/api/cancel") return await cancel(ip, parseBody(http));
    return json(404, { error: "not_found" });
  } catch (error) {
    console.error(`${method} ${path} failed`, error);
    return json(500, { error: "server_error" });
  }
}
