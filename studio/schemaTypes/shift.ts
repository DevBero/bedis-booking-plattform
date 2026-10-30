import { ClockIcon } from "@sanity/icons/Clock";
import { defineField, defineType } from "sanity";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const time = (name: string, title: string, placeholder: string) =>
  defineField({
    name,
    title,
    type: "string",
    placeholder,
    validation: (r) => r.required().regex(TIME, { name: "Uhrzeit (HH:MM)" }).error(`Bitte als Uhrzeit eingeben, z. B. ${placeholder}`),
  });

const DAY = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });

// The only source of free times: customers can book exactly inside these windows, nothing else. Two windows on one
// day = two documents. Read by the API (infra/lambda/api/sanity.ts) as Berlin wall-clock times.
export const shift = defineType({
  name: "shift",
  title: "Schneidezeit",
  type: "document",
  icon: ClockIcon,
  fields: [
    defineField({ name: "date", title: "Tag", type: "date", options: { dateFormat: "DD.MM.YYYY" }, validation: (r) => r.required() }),
    time("from", "Von", "18:00"),
    defineField({
      ...time("to", "Bis", "22:00"),
      validation: (r) =>
        r
          .required()
          .regex(TIME, { name: "Uhrzeit (HH:MM)" })
          .error("Bitte als Uhrzeit eingeben, z. B. 22:00")
          .custom((to: string | undefined, ctx) => {
            const from = (ctx.document as { from?: string } | undefined)?.from;
            return from && to && to <= from ? "„Bis“ muss nach „Von“ liegen" : true;
          }),
    }),
  ],
  orderings: [{ title: "Tag", name: "dateAsc", by: [{ field: "date", direction: "asc" }, { field: "from", direction: "asc" }] }],
  preview: {
    select: { date: "date", from: "from", to: "to" },
    prepare: ({ date, from, to }) => ({
      title: date ? DAY.format(new Date(`${date}T00:00:00Z`)) : "Tag?",
      subtitle: `${from ?? "?"} – ${to ?? "?"} Uhr`,
    }),
  },
});
