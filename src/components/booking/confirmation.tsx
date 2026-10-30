"use client";

import { CalendarPlus, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { duration, longDay, time } from "@/lib/format";
import { downloadIcs, icsFile } from "@/lib/ics";

type Booking = { id: string; service: string; duration: number; start: string; end: string; name: string };

export function Confirmation({ booking, onRestart }: { booking: Booking; onRestart: () => void }) {

  function addToCalendar() {
    downloadIcs(
      "termin.ics",
      icsFile({
        id: booking.id,
        start: booking.start,
        end: booking.end,
        title: `Friseurtermin: ${booking.service}`,
        description: "",
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
      </dl>

      <Button variant="primary" width="full" onClick={addToCalendar} icon={<CalendarPlus aria-hidden className="size-5" />}>
        Zum Kalender hinzufügen
      </Button>

      <p className="text-small text-muted">Falls du den Termin nicht wahrnehmen kannst, sag bitte telefonisch ab.</p>
      <Button variant="ghost" onClick={onRestart} className="self-start">
        Weiteren Termin buchen
      </Button>
    </section>
  );
}
