"use client";

import { CalendarPlus, CircleCheck, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { duration, longDay, time } from "@/lib/format";
import { downloadIcs, icsFile } from "@/lib/ics";
import type { SalonConfig } from "@/lib/types";

type Booking = { id: string; service: string; duration: number; start: string; end: string; name: string };

export function Confirmation({ booking, salon, mailSent, onRestart }: { booking: Booking; salon: SalonConfig["salon"]; mailSent: boolean; onRestart: () => void }) {
  const address = [salon.street, [salon.zip, salon.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");

  function addToCalendar() {
    downloadIcs(
      "termin.ics",
      icsFile({
        id: booking.id,
        start: booking.start,
        end: booking.end,
        title: `${booking.service} – ${salon.name}`,
        location: [salon.name, address].filter(Boolean).join(", "),
        description: salon.phone ? `Absagen oder verschieben: ${salon.phone}` : "",
        host: window.location.host,
      }),
    );
  }

  return (
    <section aria-labelledby="done" className="animate-rise flex flex-col gap-6">
      <div className="flex flex-col items-start gap-3">
        <CircleCheck aria-hidden className="size-10 text-success" />
        <h2 id="done" tabIndex={-1} className="text-display focus:outline-none">
          Dein Termin ist gebucht.
        </h2>
        <p className="text-lead text-muted">Danke, {booking.name.split(" ")[0]}! Wir freuen uns auf dich.</p>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 rounded-lg bg-card p-5 shadow-card">
        <dt className="text-muted">Leistung</dt>
        <dd className="font-semibold">
          {booking.service} <span className="font-normal text-muted">· {duration(booking.duration)}</span>
        </dd>
        <dt className="text-muted">Wann</dt>
        <dd className="font-semibold">
          {longDay(booking.start)}, {time(booking.start)} Uhr
        </dd>
        {address && (
          <>
            <dt className="text-muted">Wo</dt>
            <dd>
              {salon.name}, {address}
            </dd>
          </>
        )}
      </dl>

      <Button variant="primary" width="full" onClick={addToCalendar} icon={<CalendarPlus aria-hidden className="size-5" />}>
        Zum Kalender hinzufügen
      </Button>

      <p className="text-small text-muted">
        {mailSent ? "Eine Bestätigung mit Link zum Absagen ist unterwegs in dein Postfach. " : ""}
        Du kannst doch nicht? Bitte sag kurz Bescheid, dann bekommt jemand anderes den Termin.
      </p>
      {salon.phone && (
        <a href={`tel:${salon.phone.replace(/[^\d+]/g, "")}`} className="inline-flex min-h-touch items-center gap-2 self-start font-semibold text-accent">
          <Phone aria-hidden className="size-4" />
          {salon.phone}
        </a>
      )}
      <Button variant="ghost" onClick={onRestart} className="self-start">
        Weiteren Termin buchen
      </Button>
    </section>
  );
}
