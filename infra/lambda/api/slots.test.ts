import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { daySlots, freeDays, isFree, type Calendar } from "./slots";
import { addDays, berlinDate, berlinToUtc, weekday } from "./time";

const iso = (ms: number) => new Date(ms).toISOString();
const NINE_TO_SIX = { from: "09:00", to: "18:00" };

function calendar(overrides: Partial<Calendar> = {}): Calendar {
  return {
    rules: { slotMinutes: 15, minNoticeHours: 0, horizonDays: 400, bufferMinutes: 0 },
    hours: { 1: [NINE_TO_SIX], 2: [NINE_TO_SIX], 3: [NINE_TO_SIX], 4: [NINE_TO_SIX], 5: [NINE_TO_SIX], 6: [NINE_TO_SIX], 7: [NINE_TO_SIX] },
    closures: [],
    bookings: [],
    blocks: [],
    ...overrides,
  };
}

// A fixed "now" well before the dates under test
const NOW = Date.parse("2026-01-01T00:00:00Z");

describe("time helpers", () => {
  it("converts winter and summer time", () => {
    assert.equal(iso(berlinToUtc("2026-01-15", "09:00")), "2026-01-15T08:00:00.000Z");
    assert.equal(iso(berlinToUtc("2026-07-15", "09:00")), "2026-07-15T07:00:00.000Z");
  });
  it("handles the days of the time change", () => {
    // 29 March 2026: clocks go 02:00 -> 03:00
    assert.equal(iso(berlinToUtc("2026-03-29", "01:30")), "2026-03-29T00:30:00.000Z");
    assert.equal(iso(berlinToUtc("2026-03-29", "09:00")), "2026-03-29T07:00:00.000Z");
    // 25 October 2026: clocks go 03:00 -> 02:00
    assert.equal(iso(berlinToUtc("2026-10-25", "09:00")), "2026-10-25T08:00:00.000Z");
    assert.equal(iso(berlinToUtc("2026-10-24", "09:00")), "2026-10-24T07:00:00.000Z");
  });
  it("knows weekdays and dates", () => {
    assert.equal(weekday("2026-11-02"), 1);
    assert.equal(weekday("2026-11-08"), 7);
    assert.equal(addDays("2026-12-31", 1), "2027-01-01");
    // 23:30 UTC on 31 Oct is already 1 Nov in Berlin
    assert.equal(berlinDate(Date.parse("2026-10-31T23:30:00Z")), "2026-11-01");
  });
});

describe("daySlots", () => {
  it("fills the opening hours in the raster and keeps the service inside", () => {
    const slots = daySlots(calendar(), "2026-11-03", 30, NOW);
    assert.equal(iso(slots[0]), "2026-11-03T08:00:00.000Z");
    // last start 17:30 local so a 30-min service ends at 18:00
    assert.equal(iso(slots.at(-1)!), "2026-11-03T16:30:00.000Z");
    assert.equal(slots.length, 35);
  });

  it("uses local opening times across both time changes", () => {
    for (const date of ["2026-03-28", "2026-03-29", "2026-03-30", "2026-10-24", "2026-10-25", "2026-10-26"]) {
      const slots = daySlots(calendar(), date, 60, NOW);
      assert.equal(slots.length, 33, date);
      assert.equal(slots[0], berlinToUtc(date, "09:00"), date);
      assert.equal(slots.at(-1), berlinToUtc(date, "17:00"), date);
    }
  });

  it("respects a lunch break and closed weekdays", () => {
    const c = calendar({ hours: { 2: [{ from: "09:00", to: "12:00" }, { from: "13:00", to: "18:00" }] } });
    const slots = daySlots(c, "2026-11-03", 45, NOW).map((s) => iso(s));
    assert.ok(slots.includes("2026-11-03T10:15:00.000Z")); // 11:15-12:00
    assert.ok(!slots.includes("2026-11-03T10:30:00.000Z")); // would run into the break
    assert.ok(!slots.includes("2026-11-03T11:00:00.000Z"));
    assert.ok(slots.includes("2026-11-03T12:00:00.000Z")); // 13:00 local
    assert.deepEqual(daySlots(c, "2026-11-02", 45, NOW), []); // Monday not configured
  });

  it("skips closures", () => {
    const c = calendar({ closures: [{ from: "2026-12-24", to: "2026-12-26" }] });
    assert.deepEqual(daySlots(c, "2026-12-25", 30, NOW), []);
    assert.ok(daySlots(c, "2026-12-27", 30, NOW).length > 0);
  });

  it("keeps bookings, their buffer and blocks free", () => {
    const booking = { start: berlinToUtc("2026-11-03", "10:00"), end: berlinToUtc("2026-11-03", "10:30") };
    const block = { start: berlinToUtc("2026-11-03", "14:00"), end: berlinToUtc("2026-11-03", "15:00") };
    const c = calendar({ bookings: [booking], blocks: [block], rules: { slotMinutes: 15, minNoticeHours: 0, horizonDays: 400, bufferMinutes: 15 } });
    const local = daySlots(c, "2026-11-03", 30, NOW).map((s) => new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", timeStyle: "short" }).format(s));
    // 09:15 + 30 + 15 buffer = 10:00 -> fits exactly; 09:30 would collide
    assert.ok(local.includes("09:15"));
    assert.ok(!local.includes("09:30"));
    // booking ends 10:30, its buffer until 10:45
    assert.ok(!local.includes("10:30"));
    assert.ok(local.includes("10:45"));
    // block 14:00-15:00, new service needs 30 + 15 buffer before it
    assert.ok(local.includes("13:15"));
    assert.ok(!local.includes("13:30"));
    assert.ok(local.includes("15:00"));
  });

  it("applies minimum notice and horizon", () => {
    const now = berlinToUtc("2026-11-03", "10:05");
    const c = calendar({ rules: { slotMinutes: 15, minNoticeHours: 2, horizonDays: 2, bufferMinutes: 0 } });
    const first = daySlots(c, "2026-11-03", 30, now)[0];
    assert.equal(first, berlinToUtc("2026-11-03", "12:15"));
    assert.ok(daySlots(c, "2026-11-05", 30, now).length > 0);
    assert.deepEqual(daySlots(c, "2026-11-06", 30, now), []);
  });

  it("checks a single start and lists days", () => {
    const c = calendar();
    assert.ok(isFree(c, berlinToUtc("2026-11-03", "09:15"), 30, NOW));
    assert.ok(!isFree(c, berlinToUtc("2026-11-03", "09:10"), 30, NOW)); // off the raster
    assert.ok(!isFree(c, berlinToUtc("2026-11-03", "17:45"), 30, NOW)); // runs past closing
    const days = freeDays(c, "2026-10-24", 3, 30, NOW);
    assert.deepEqual(days.map((d) => d.date), ["2026-10-24", "2026-10-25", "2026-10-26"]);
  });
});
