// Free start times per day. Pure functions on plain data, so they run in the Lambda, in the browser mock and in
// the tests (slots.test.ts). All instants are UTC ms.
import { addDays, berlinDate, berlinToUtc, MINUTE } from "./time";

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

export interface Calendar {
  rules: Rules;
  // The times the owner entered as "Schneidezeit"; nothing outside them is bookable
  shifts: Interval[];
  // Active bookings; the buffer is added after them
  bookings: Interval[];
}

export interface Day {
  date: string;
  slots: number[];
}

const overlaps = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end;

// The first and last instant a booking may start at
export function bookingWindow(rules: Rules, now: number): Interval {
  return { start: now + rules.minNoticeHours * 60 * MINUTE, end: berlinToUtc(addDays(berlinDate(now), rules.horizonDays), "23:59") };
}

// Free starts on one Berlin date for a service of the given length. A start is free when the service fits
// completely into a shift of that day, lies in the booking window, and service + buffer touch no booking (with
// its own buffer).
export function daySlots(calendar: Calendar, date: string, durationMinutes: number, now: number): number[] {
  const { rules } = calendar;
  const window = bookingWindow(rules, now);
  const length = durationMinutes * MINUTE;
  const buffer = rules.bufferMinutes * MINUTE;
  const step = rules.slotMinutes * MINUTE;
  const busy = calendar.bookings.map((b) => ({ start: b.start, end: b.end + buffer }));
  const slots: number[] = [];
  for (const shift of calendar.shifts) {
    if (berlinDate(shift.start) !== date) continue;
    for (let start = shift.start; start + length <= shift.end; start += step) {
      if (start < window.start || start > window.end) continue;
      const taken = { start, end: start + length + buffer };
      if (!busy.some((b) => overlaps(b, taken))) slots.push(start);
    }
  }
  return [...new Set(slots)].sort((a, b) => a - b);
}

// Every Berlin date with a shift that has not ended yet, in order, each with its free starts. Fully booked
// shift days stay in the list with no slots, so customers see the day exists but is taken.
export function shiftDays(calendar: Calendar, durationMinutes: number, now: number): Day[] {
  const window = bookingWindow(calendar.rules, now);
  const dates = [...new Set(calendar.shifts.filter((s) => s.end > now && s.start <= window.end).map((s) => berlinDate(s.start)))].sort();
  return dates.map((date) => ({ date, slots: daySlots(calendar, date, durationMinutes, now) }));
}

export function isFree(calendar: Calendar, start: number, durationMinutes: number, now: number) {
  return daySlots(calendar, berlinDate(start), durationMinutes, now).includes(start);
}
