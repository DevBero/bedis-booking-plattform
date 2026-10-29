import { ClockIcon } from "@sanity/icons/Clock";
import { defineArrayMember, defineField, defineType } from "sanity";

export const WEEKDAYS = [
  { name: "monday", title: "Montag" },
  { name: "tuesday", title: "Dienstag" },
  { name: "wednesday", title: "Mittwoch" },
  { name: "thursday", title: "Donnerstag" },
  { name: "friday", title: "Freitag" },
  { name: "saturday", title: "Samstag" },
  { name: "sunday", title: "Sonntag" },
] as const;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const time = (name: string, title: string) =>
  defineField({
    name,
    title,
    type: "string",
    placeholder: "09:00",
    validation: (r) => r.required().regex(TIME, { name: "Uhrzeit (HH:MM)" }).error("Bitte als Uhrzeit eingeben, z. B. 09:00"),
  });

// Singleton (_id "openingHours"): per weekday a list of time windows; two windows = lunch break, none = closed
export const openingHours = defineType({
  name: "openingHours",
  title: "Öffnungszeiten",
  type: "document",
  icon: ClockIcon,
  fields: WEEKDAYS.map((day) =>
    defineField({
      name: day.name,
      title: day.title,
      type: "array",
      description: "Leer lassen = geschlossen. Zwei Zeiten = Mittagspause dazwischen.",
      of: [
        defineArrayMember({
          type: "object",
          name: "window",
          title: "Zeitfenster",
          fields: [time("from", "Von"), time("to", "Bis")],
          validation: (r) =>
            r.custom((w: { from?: string; to?: string } | undefined) =>
              w?.from && w?.to && w.from >= w.to ? "„Bis“ muss nach „Von“ liegen" : true,
            ),
          preview: {
            select: { from: "from", to: "to" },
            prepare: ({ from, to }) => ({ title: `${from ?? "?"} – ${to ?? "?"} Uhr` }),
          },
        }),
      ],
    }),
  ),
  preview: { prepare: () => ({ title: "Öffnungszeiten" }) },
});
