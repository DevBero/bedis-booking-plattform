// Mails via Amazon SES (identity of the salon domain, SharedStack). Plain text, German.
// Owner notification works in the SES sandbox as long as the inbox is verified; confirmations to customers need
// production access (docs/HOSTING.md, Schritt 9) and stay off until CUSTOMER_MAIL is "true".
import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";
import { TIME_ZONE } from "./time";

const ses = new SESv2Client({});
const PREFIX = process.env.STAGE === "production" ? "" : "[Staging] ";

export const customerMailEnabled = () => process.env.CUSTOMER_MAIL === "true";

// "Di 04.11. 10:30"
export function shortWhen(instant: number) {
  const day = new Intl.DateTimeFormat("de-DE", { timeZone: TIME_ZONE, weekday: "short", day: "2-digit", month: "2-digit" }).format(instant);
  const time = new Intl.DateTimeFormat("de-DE", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" }).format(instant);
  return `${day.replace(",", "")} ${time}`;
}

// "Dienstag, 4. November 2026 um 10:30 Uhr"
export function longWhen(instant: number) {
  const day = new Intl.DateTimeFormat("de-DE", { timeZone: TIME_ZONE, dateStyle: "full" }).format(instant);
  const time = new Intl.DateTimeFormat("de-DE", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" }).format(instant);
  return `${day} um ${time} Uhr`;
}

async function send(from: string, to: string, subject: string, lines: string[], replyTo?: string | null) {
  await ses.send(
    new SendEmailCommand({
      FromEmailAddress: `${from} <${process.env.MAIL_FROM}>`,
      Destination: { ToAddresses: [to] },
      ReplyToAddresses: replyTo ? [replyTo] : undefined,
      Content: { Simple: { Subject: { Data: `${PREFIX}${subject}`, Charset: "UTF-8" }, Body: { Text: { Data: lines.join("\n"), Charset: "UTF-8" } } } },
    }),
  );
}

export async function notifyOwner(to: string, subject: string, lines: string[], replyTo?: string | null) {
  await send("Online-Buchung", to, subject, [...lines, "", `Alle Termine: ${process.env.SITE_URL}/admin/`], replyTo);
}

export async function confirmCustomer(opts: { to: string; salonName: string; salonPhone: string; replyTo: string | null; when: number; service: string; cancelUrl: string; cancelHours: number; address: string }) {
  await send(opts.salonName, opts.to, `Dein Termin am ${shortWhen(opts.when)}`, [
    "Hallo,",
    "",
    `dein Termin ist gebucht: ${opts.service} am ${longWhen(opts.when)}.`,
    opts.address ? `Adresse: ${opts.address}` : "",
    "",
    opts.cancelHours > 0
      ? `Du kannst nicht? Bitte sag bis ${opts.cancelHours} Stunden vorher ab, damit jemand anderes den Termin bekommt:`
      : "Du kannst nicht? Hier kannst du absagen:",
    opts.cancelUrl,
    opts.salonPhone ? `Oder ruf uns an: ${opts.salonPhone}` : "",
    "",
    "Bis bald!",
    opts.salonName,
  ].filter((line, i, all) => line !== "" || all[i - 1] !== ""), opts.replyTo);
}
