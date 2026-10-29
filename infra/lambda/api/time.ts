// Europe/Berlin wall-clock <-> UTC. The salon thinks in local times (opening hours, "Di 10:30"), storage and the
// API use UTC instants. Shared by the Lambda, the browser mock and the tests.
export const TIME_ZONE = "Europe/Berlin";
export const MINUTE = 60_000;
export const DAY = 24 * 60 * MINUTE;

const PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

// Offset of Berlin from UTC at an instant in ms (+1 h winter, +2 h summer)
function zoneOffset(instant: number) {
  const p = Object.fromEntries(PARTS.formatToParts(instant).map((x) => [x.type, Number(x.value)]));
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instant / 1000) * 1000;
}

// Berlin date ("YYYY-MM-DD") and time ("HH:MM") -> UTC ms. Times in the skipped hour of the spring change resolve
// one hour later; opening hours never fall into that night anyway.
export function berlinToUtc(date: string, time: string) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const naive = Date.UTC(y, m - 1, d, hh, mm);
  return naive - zoneOffset(naive - zoneOffset(naive));
}

const DATE = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE });

// Berlin calendar date of an instant
export function berlinDate(instant: number) {
  return DATE.format(instant);
}

// ISO weekday of a calendar date, 1 = Monday
export function weekday(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return ((new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7) + 1;
}

// Calendar date plus n days (pure date math, no time zone involved)
export function addDays(date: string, n: number) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export const isDate = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
