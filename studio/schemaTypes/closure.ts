import { CalendarIcon } from "@sanity/icons/Calendar";
import { defineField, defineType } from "sanity";

// Whole days without online bookings (holiday, vacation). Bookings that already exist stay untouched.
export const closure = defineType({
  name: "closure",
  title: "Geschlossener Tag",
  type: "document",
  icon: CalendarIcon,
  fields: [
    defineField({ name: "from", title: "Von (erster freier Tag)", type: "date", options: { dateFormat: "DD.MM.YYYY" }, validation: (r) => r.required() }),
    defineField({
      name: "to",
      title: "Bis (letzter freier Tag)",
      type: "date",
      options: { dateFormat: "DD.MM.YYYY" },
      description: "Für einen einzelnen Tag dasselbe Datum wie bei „Von“.",
      validation: (r) =>
        r.required().custom((to, ctx) => {
          const from = (ctx.document as { from?: string } | undefined)?.from;
          return from && to && to < from ? "„Bis“ darf nicht vor „Von“ liegen" : true;
        }),
    }),
    defineField({ name: "reason", title: "Grund", type: "string", placeholder: "Urlaub, Feiertag …" }),
  ],
  orderings: [{ title: "Datum", name: "fromAsc", by: [{ field: "from", direction: "asc" }] }],
  preview: {
    select: { from: "from", to: "to", reason: "reason" },
    prepare: ({ from, to, reason }) => {
      const de = (d?: string) => (d ? d.split("-").reverse().join(".") : "?");
      return { title: from === to ? de(from) : `${de(from)} – ${de(to)}`, subtitle: reason };
    },
  },
});
