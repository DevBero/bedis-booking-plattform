// German display formats, always in the salon's time zone (a visitor abroad still sees salon time)
const TZ = "Europe/Berlin";

const fmt = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("de-DE", { timeZone: TZ, ...options });
const TIME = fmt({ hour: "2-digit", minute: "2-digit" });
const LONG_DAY = fmt({ weekday: "long", day: "numeric", month: "long" });
const WEEKDAY_SHORT = fmt({ weekday: "short" });
const DAY_NUM = fmt({ day: "numeric" });
const MONTH_SHORT = fmt({ month: "short" });

// Calendar dates ("YYYY-MM-DD") are formatted at noon UTC, which is the same date in Berlin all year
const noon = (date: string) => new Date(`${date}T12:00:00Z`);

export const time = (iso: string) => TIME.format(new Date(iso));
export const longDay = (isoOrDate: string) => LONG_DAY.format(isoOrDate.length === 10 ? noon(isoOrDate) : new Date(isoOrDate));
export const dayParts = (date: string) => ({
  weekday: WEEKDAY_SHORT.format(noon(date)).replace(".", ""),
  day: DAY_NUM.format(noon(date)).replace(".", ""),
  month: MONTH_SHORT.format(noon(date)).replace(".", ""),
});

export function price(value: number | null, from: boolean) {
  if (value === null) return null;
  const amount = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: value % 1 ? 2 : 0 }).format(value);
  return from ? `ab ${amount}` : amount;
}

export const duration = (minutes: number) => (minutes >= 60 && minutes % 60 === 0 ? `${minutes / 60} Std.` : minutes > 60 ? `${Math.floor(minutes / 60)} Std. ${minutes % 60} Min.` : `${minutes} Min.`);

// Berlin calendar date of an instant
export const berlinDate = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso));
