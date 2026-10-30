import { CogIcon } from "@sanity/icons/Cog";
import { defineField, defineType } from "sanity";

// Singleton (_id "settings"): booking rules. Read by the API (infra/lambda/api/sanity.ts);
// changes are live within a minute, no rebuild.
export const settings = defineType({
  name: "settings",
  title: "Einstellungen",
  type: "document",
  icon: CogIcon,
  fields: [
    defineField({
      name: "bookingEnabled",
      title: "Online-Buchung eingeschaltet",
      type: "boolean",
      initialValue: true,
      description: "Ausschalten, wenn gerade niemand online buchen soll. Die Seite zeigt dann einen Hinweis.",
    }),
    defineField({
      name: "notice",
      title: "Hinweis auf der Buchungsseite",
      type: "text",
      rows: 3,
      description: "Optional, z. B. „Bitte 5 Minuten vorher da sein.“",
    }),
    defineField({
      name: "slotMinutes",
      title: "Zeitraster (Minuten)",
      type: "number",
      initialValue: 15,
      options: { list: [10, 15, 20, 30] },
      description: "Termine beginnen nur zu diesen Zeiten, z. B. 9:00, 9:15, 9:30 …",
    }),
    defineField({
      name: "minNoticeHours",
      title: "Mindestvorlauf (Stunden)",
      type: "number",
      initialValue: 2,
      description: "So viele Stunden vorher muss online gebucht werden.",
      validation: (r) => r.min(0).max(336),
    }),
    defineField({
      name: "horizonDays",
      title: "Buchbar für die nächsten … Tage",
      type: "number",
      initialValue: 28,
      validation: (r) => r.min(1).max(180),
    }),
    defineField({
      name: "bufferMinutes",
      title: "Puffer nach jedem Termin (Minuten)",
      type: "number",
      initialValue: 0,
      description: "Zeit zum Aufräumen nach einem Termin; in dieser Zeit ist nichts buchbar.",
      validation: (r) => r.min(0).max(120),
    }),
  ],
  preview: { prepare: () => ({ title: "Einstellungen" }) },
});
