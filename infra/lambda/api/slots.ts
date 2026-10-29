// Free start times per day. Pure functions on plain data, so they run in the Lambda, in the browser mock and in
// the tests (slots.test.ts). All instants are UTC ms; opening hours are Berlin wall-clock times.
import { addDays, berlinDate, berlinToUtc, MINUTE, weekday } from "./time";

export interface Interval {
  start: number;
  end: number;
}

export interface Rules {
  slotMinutes: number;
  minNoticeHours: number;
  horizonDays: number;
  bufferMinutes: number;
}

// Per ISO weekday (1 = Monday) a list of windows "HH:MM"; missing or empty = closed
export type WeekHours = Record<number, { from: string; to: string }[]>;

export interface Calendar {
  rules: Rules;
  hours: WeekHours;
  // Whole days off, Berlin dates inclusive
  closures: { from: string; to: string }[];
  // Active bookings (the buffer is added after them) and blocks (taken as they are)
  bookings: Interval[];
  blocks: Interval[];
}

export interface Day {
  date: string;
  slots: number[];
}

const overlaps = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end;

export function isClosed(calendar: Pick<Calendar, "closures">, date: string) {
  return calendar.closures.some((c) => c.from <= date && date <= c.to);
}

// The first and last instant a booking may start at
export function bookingWindow(rules: Rules, now: number): Interval {
  return { start: now + rules.minNoticeHours * 60 * MINUTE, end: berlinToUtc(addDays(berlinDate(now), rules.horizonDays), "23:59") };
}

// Free starts on one Berlin date for a service of the given length. A start is free when the service fits
// completely into an opening window, lies in the booking window, and service + buffer touch no booking (with its
// own buffer) or block.
export function daySlots(calendar: Calendar, date: string, durationMinutes: number, now: number): number[] {
  if (isClosed(calendar, date)) return [];
  const { rules } = calendar;
  const window = bookingWindow(rules, now);
  const length = durationMinutes * MINUTE;
  const buffer = rules.bufferMinutes * MINUTE;
  const step = rules.slotMinutes * MINUTE;
  const busy = [...calendar.bookings.map((b) => ({ start: b.start, end: b.end + buffer })), ...calendar.blocks];
  const slots: number[] = [];
  for (const w of calendar.hours[weekday(date)] ?? []) {
    const open = berlinToUtc(date, w.from);
    const close = berlinToUtc(date, w.to);
    for (let start = open; start + length <= close; start += step) {
      if (start < window.start || start > window.end) continue;
      const taken = { start, end: start + length + buffer };
      if (!busy.some((b) => overlaps(b, taken))) slots.push(start);
    }
  }
  return [...new Set(slots)].sort((a, b) => a - b);
}

// Consecutive Berlin dates from `from`, each with its free starts
export function freeDays(calendar: Calendar, from: string, days: number, durationMinutes: number, now: number): Day[] {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(from, i);
    return { date, slots: daySlots(calendar, date, durationMinutes, now) };
  });
}

export function isFree(calendar: Calendar, start: number, durationMinutes: number, now: number) {
  return daySlots(calendar, berlinDate(start), durationMinutes, now).includes(start);
}
