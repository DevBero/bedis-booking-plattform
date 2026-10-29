import { BlockElementIcon } from "@sanity/icons/BlockElement";
import { defineField, defineType } from "sanity";
import { overlapWarning } from "./overlap";

const FORMAT = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const TIME = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" });

// Time without a customer (doctor, break); takes slots like a booking
export const block = defineType({
  name: "block",
  title: "Blockzeit",
  type: "document",
  icon: BlockElementIcon,
  fields: [
    defineField({ name: "start", title: "Von", type: "datetime", options: { dateFormat: "DD.MM.YYYY", timeFormat: "HH:mm", timeStep: 15 }, validation: (r) => r.required() }),
    defineField({
      name: "end",
      title: "Bis",
      type: "datetime",
      options: { dateFormat: "DD.MM.YYYY", timeFormat: "HH:mm", timeStep: 15 },
      validation: (r) => [
        r.required().custom((end: string | undefined, ctx) => {
          const start = (ctx.document as { start?: string } | undefined)?.start;
          return start && end && end <= start ? "„Bis“ muss nach „Von“ liegen" : true;
        }),
        r.custom((end: string | undefined, ctx) => overlapWarning((ctx.document as { start?: string } | undefined)?.start, end, ctx)).warning(),
      ],
    }),
    defineField({ name: "reason", title: "Grund", type: "string", placeholder: "Arzttermin, Pause …" }),
  ],
  orderings: [{ title: "Beginn", name: "startAsc", by: [{ field: "start", direction: "asc" }] }],
  preview: {
    select: { start: "start", end: "end", reason: "reason" },
    prepare: ({ start, end, reason }) => ({
      title: reason || "Blockzeit",
      subtitle: start && end ? `${FORMAT.format(new Date(start))} – ${TIME.format(new Date(end))}` : undefined,
    }),
  },
});
