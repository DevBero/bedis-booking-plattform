import { CogIcon } from "@sanity/icons/Cog";
import { defineField, defineType } from "sanity";

// Singleton (_id "settings"): salon name and booking rules. Read by the API (infra/lambda/api/sanity.ts);
// changes are live within a minute, no rebuild.
export const settings = defineType({
  name: "settings",
  title: "Einstellungen",
  type: "document",
  icon: CogIcon,
  groups: [
    { name: "salon", title: "Salon", default: true },
    { name: "booking", title: "Online-Buchung" },
  ],
  fields: [
    defineField({ name: "name", title: "Name des Salons", type: "string", group: "salon", validation: (r) => r.required() }),
    defineField({
      name: "bookingEnabled",
      title: "Online-Buchung eingeschaltet",
      type: "boolean",
      group: "booking",
      initialValue: true,
      description: "Ausschalten, wenn gerade niemand online buchen soll. Die Seite zeigt dann einen Hinweis.",
    }),
    defineField({
      name: "notice",
      title: "Hinweis auf der Buchungsseite",
      type: "text",
      rows: 3,
      group: "booking",
      description: "Optional, z. B. „Bitte 5 Minuten vorher da sein.“",
    }),
    defineField({
      name: "slotMinutes",
      title: "Zeitraster (Minuten)",
      type: "number",
      group: "booking",
      initialValue: 15,
      options: { list: [10, 15, 20, 30] },
      description: "Termine beginnen nur zu diesen Zeiten, z. B. 9:00, 9:15, 9:30 …",
    }),
    defineField({
      name: "minNoticeHours",
      title: "Mindestvorlauf (Stunden)",
      type: "number",
      group: "booking",
      initialValue: 2,
      description: "So viele Stunden vorher muss online gebucht werden.",
      validation: (r) => r.min(0).max(336),
    }),
    defineField({
      name: "horizonDays",
      title: "Buchbar für die nächsten … Tage",
      type: "number",
      group: "booking",
      initialValue: 28,
      validation: (r) => r.min(1).max(180),
    }),
    defineField({
      name: "bufferMinutes",
      title: "Puffer nach jedem Termin (Minuten)",
      type: "number",
      group: "booking",
      initialValue: 0,
      description: "Zeit zum Aufräumen nach einem Termin; in dieser Zeit ist nichts buchbar.",
      validation: (r) => r.min(0).max(120),
    }),
  ],
  preview: { prepare: () => ({ title: "Einstellungen" }) },
});
