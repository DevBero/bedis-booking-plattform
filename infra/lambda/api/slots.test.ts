import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { daySlots, isFree, shiftDays, type Calendar } from "./slots";
import { addDays, berlinDate, berlinToUtc, weekday } from "./time";

const iso = (ms: number) => new Date(ms).toISOString();
const shift = (date: string, from: string, to: string) => ({ start: berlinToUtc(date, from), end: berlinToUtc(date, to) });
const local = (ms: number) => new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", timeStyle: "short" }).format(ms);

function calendar(overrides: Partial<Calendar> = {}): Calendar {
  return {
    rules: { slotMinutes: 15, minNoticeHours: 0, horizonDays: 400, bufferMinutes: 0 },
    shifts: [shift("2026-11-02", "18:00", "22:00")],
    bookings: [],
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
  it("fills a shift in the raster and keeps the service inside", () => {
    const slots = daySlots(calendar(), "2026-11-02", 30, NOW);
    assert.equal(local(slots[0]), "18:00");
    // last start 21:30 so a 30-min service ends at 22:00
    assert.equal(local(slots.at(-1)!), "21:30");
    assert.equal(slots.length, 15);
  });

  it("offers nothing on days without a shift", () => {
    assert.deepEqual(daySlots(calendar(), "2026-11-03", 30, NOW), []);
  });

  it("uses local shift times across the time change", () => {
    const c = calendar({ shifts: ["2026-10-24", "2026-10-25", "2026-10-26"].map((d) => shift(d, "09:00", "12:00")) });
    for (const date of ["2026-10-24", "2026-10-25", "2026-10-26"]) {
      const slots = daySlots(c, date, 60, NOW);
      assert.equal(slots.length, 9, date);
      assert.equal(slots[0], berlinToUtc(date, "09:00"), date);
    }
  });

  it("combines two shifts on one day", () => {
    const c = calendar({ shifts: [shift("2026-11-02", "10:00", "11:00"), shift("2026-11-02", "18:00", "19:00")] });
    const slots = daySlots(c, "2026-11-02", 45, NOW).map(local);
    assert.deepEqual(slots, ["10:00", "10:15", "18:00", "18:15"]);
  });

  it("keeps bookings and their buffer free", () => {
    const booking = shift("2026-11-02", "19:00", "19:30");
    const c = calendar({ bookings: [booking], rules: { slotMinutes: 15, minNoticeHours: 0, horizonDays: 400, bufferMinutes: 15 } });
    const slots = daySlots(c, "2026-11-02", 30, NOW).map(local);
    // 18:15 + 30 + 15 buffer = 19:00 -> fits exactly; 18:30 would collide
    assert.ok(slots.includes("18:15"));
    assert.ok(!slots.includes("18:30"));
    // booking ends 19:30, its buffer until 19:45
    assert.ok(!slots.includes("19:30"));
    assert.ok(slots.includes("19:45"));
  });

  it("applies minimum notice and horizon", () => {
    const now = berlinToUtc("2026-11-02", "17:05");
    const c = calendar({ rules: { slotMinutes: 15, minNoticeHours: 2, horizonDays: 2, bufferMinutes: 0 }, shifts: [shift("2026-11-02", "18:00", "22:00"), shift("2026-11-05", "18:00", "22:00")] });
    assert.equal(local(daySlots(c, "2026-11-02", 30, now)[0]), "19:15");
    assert.deepEqual(daySlots(c, "2026-11-05", 30, now), []);
  });

  it("checks a single start", () => {
    const c = calendar();
    assert.ok(isFree(c, berlinToUtc("2026-11-02", "18:15"), 30, NOW));
    assert.ok(!isFree(c, berlinToUtc("2026-11-02", "18:10"), 30, NOW)); // off the raster
    assert.ok(!isFree(c, berlinToUtc("2026-11-02", "21:45"), 30, NOW)); // runs past the end of the shift
    assert.ok(!isFree(c, berlinToUtc("2026-11-03", "18:00"), 30, NOW)); // no shift that day
  });
});

describe("shiftDays", () => {
  it("lists only shift days, in order, fully booked ones without slots", () => {
    const c = calendar({
      shifts: [shift("2026-11-09", "18:00", "19:00"), shift("2026-11-02", "18:00", "18:30"), shift("2026-11-02", "20:00", "21:00")],
      bookings: [shift("2026-11-09", "18:00", "19:00")],
    });
    const days = shiftDays(c, 30, NOW);
    assert.deepEqual(days.map((d) => d.date), ["2026-11-02", "2026-11-09"]);
    assert.equal(days[0].slots.length, 4);
    assert.deepEqual(days[1].slots, []);
  });

  it("drops shifts that are over or beyond the horizon", () => {
    const now = berlinToUtc("2026-11-02", "23:00");
    const c = calendar({ rules: { slotMinutes: 15, minNoticeHours: 0, horizonDays: 7, bufferMinutes: 0 }, shifts: [shift("2026-11-02", "18:00", "22:00"), shift("2026-11-04", "18:00", "22:00"), shift("2026-11-20", "18:00", "22:00")] });
    assert.deepEqual(shiftDays(c, 30, now).map((d) => d.date), ["2026-11-04"]);
  });
});
