// Message to the salon's Telegram channel for every online booking. Best effort: off while TELEGRAM_CHAT_ID is
// empty, and a missing token or a Telegram outage only logs, it never fails the booking.
import { secret } from "./ssm";
import { TIME_ZONE } from "./time";

// "Mo 02.11. 18:30"
const WHEN = new Intl.DateTimeFormat("de-DE", { timeZone: TIME_ZONE, weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export async function notifyBooking(b: { start: number; service: string; duration: number; name: string; phone: string; note?: string }) {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) return;
  const text = [
    `✂️ Neue Buchung: ${WHEN.format(b.start).replace(",", "")} Uhr`,
    `${b.service} (${b.duration} Min.)`,
    `${b.name} · ${b.phone}`,
    b.note ? `Notiz: ${b.note}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  try {
    const token = await secret(process.env.TELEGRAM_TOKEN_PARAM!);
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      // The customer waits for the booking response; Telegram must not hold it up
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) console.error(`telegram ${res.status}: ${(await res.text()).slice(0, 300)}`);
  } catch (error) {
    console.error("telegram failed", error);
  }
}
