import { UserIcon } from "@sanity/icons/User";
import { defineField, defineType } from "sanity";
import { overlapWarning } from "./overlap";

export const BOOKING_STATUS = [
  { title: "Bestätigt", value: "confirmed" },
  { title: "Storniert", value: "cancelled" },
  { title: "Nicht erschienen", value: "noshow" },
];

const TIME = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" });
const DAY = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", weekday: "short", day: "2-digit", month: "2-digit" });

// Online bookings come from POST /api/book; the owner adds phone and walk-in appointments here. Both take the
// slot in the same way. Customers cancel by phone; the owner then sets the status to "Storniert", which frees the
// slot again. Personal data: deleted automatically some days after the appointment (docs/TECH.md §8).
export const booking = defineType({
  name: "booking",
  title: "Termin",
  type: "document",
  icon: UserIcon,
  fields: [
    defineField({
      name: "service",
      title: "Leistung",
      type: "reference",
      to: [{ type: "service" }],
      validation: (r) => r.required(),
    }),
    defineField({
      name: "start",
      title: "Beginn",
      type: "datetime",
      options: { dateFormat: "DD.MM.YYYY", timeFormat: "HH:mm", timeStep: 15 },
      validation: (r) =>
        r.required().custom((start: string | undefined, ctx) => {
          // Only new appointments must not lie in the past; old ones stay editable (e.g. "nicht erschienen")
          const created = (ctx.document as { _createdAt?: string } | undefined)?._createdAt;
          if (!start || created) return true;
          return Date.parse(start) < Date.now() - 5 * 60_000 ? "Der Termin liegt in der Vergangenheit" : true;
        }),
    }),
    defineField({
      name: "end",
      title: "Ende",
      type: "datetime",
      options: { dateFormat: "DD.MM.YYYY", timeFormat: "HH:mm", timeStep: 15 },
      description: "Leer lassen = Beginn + Dauer der Leistung.",
      validation: (r) => [
        r.custom((end: string | undefined, ctx) => {
          const start = (ctx.document as { start?: string } | undefined)?.start;
          return start && end && end <= start ? "Das Ende muss nach dem Beginn liegen" : true;
        }),
        r
          .custom(async (end: string | undefined, ctx) => {
            const doc = ctx.document as { start?: string; status?: string; service?: { _ref?: string } } | undefined;
            if (!doc?.start || doc.status === "cancelled") return true;
            let until = end;
            if (!until && doc.service?._ref) {
              const minutes = await ctx.getClient({ apiVersion: "2025-02-19" }).fetch<number | null>(`*[_id == $id][0].duration`, { id: doc.service._ref });
              until = new Date(Date.parse(doc.start) + (minutes ?? 30) * 60_000).toISOString();
            }
            return overlapWarning(doc.start, until, ctx);
          })
          .warning(),
      ],
    }),
    defineField({ name: "customerName", title: "Name", type: "string", validation: (r) => r.required().max(120) }),
    defineField({ name: "phone", title: "Telefon", type: "string", validation: (r) => r.max(40) }),
    defineField({ name: "note", title: "Notiz", type: "text", rows: 3 }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      initialValue: "confirmed",
      options: { list: BOOKING_STATUS, layout: "radio", direction: "horizontal" },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "source",
      title: "Gebucht über",
      type: "string",
      initialValue: "manual",
      readOnly: true,
      options: { list: [{ title: "Online", value: "online" }, { title: "Im Studio eingetragen", value: "manual" }] },
    }),
    defineField({ name: "channel", title: "Online-Kanal", type: "string", readOnly: true, hidden: ({ document }) => document?.source !== "online", description: "z. B. qr = QR-Code im Salon" }),
    defineField({ name: "createdAt", title: "Gebucht am", type: "datetime", readOnly: true, hidden: ({ value }) => !value }),
    // v2: several chairs. Empty in v1 so no migration is needed later.
    defineField({ name: "staff", type: "string", hidden: true }),
  ],
  orderings: [{ title: "Beginn", name: "startAsc", by: [{ field: "start", direction: "asc" }] }],
  preview: {
    select: { start: "start", name: "customerName", service: "service.name", status: "status" },
    prepare: ({ start, name, service, status }) => {
      const at = start ? new Date(start) : null;
      const mark = status === "cancelled" ? " (storniert)" : status === "noshow" ? " (nicht erschienen)" : "";
      return {
        title: `${at ? TIME.format(at) : "--:--"} · ${service ?? "Leistung?"} · ${name ?? "Name?"}${mark}`,
        subtitle: at ? DAY.format(at) : undefined,
      };
    },
  },
});
