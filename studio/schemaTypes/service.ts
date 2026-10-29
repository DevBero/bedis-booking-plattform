import { DocumentTextIcon } from "@sanity/icons/DocumentText";
import { defineField, defineType } from "sanity";

export const service = defineType({
  name: "service",
  title: "Leistung",
  type: "document",
  icon: DocumentTextIcon,
  fields: [
    defineField({ name: "name", title: "Name", type: "string", validation: (r) => r.required().max(60) }),
    defineField({
      name: "duration",
      title: "Dauer (Minuten)",
      type: "number",
      description: "So lange ist der Stuhl belegt.",
      validation: (r) => r.required().min(5).max(480).integer(),
    }),
    defineField({
      name: "price",
      title: "Preis (€, inkl. MwSt.)",
      type: "number",
      description: "Endpreis für Kunden. Leer lassen, wenn kein Preis angezeigt werden soll.",
      validation: (r) => r.min(0).precision(2),
    }),
    defineField({ name: "priceFrom", title: "„ab“ vor den Preis setzen", type: "boolean", initialValue: false }),
    defineField({ name: "description", title: "Kurzbeschreibung", type: "text", rows: 2, validation: (r) => r.max(200) }),
    defineField({ name: "order", title: "Reihenfolge", type: "number", description: "Kleinere Zahl = weiter oben.", initialValue: 10 }),
    defineField({
      name: "active",
      title: "Online buchbar",
      type: "boolean",
      initialValue: true,
      description: "Ausschalten blendet die Leistung auf der Buchungsseite aus.",
    }),
  ],
  orderings: [{ title: "Reihenfolge", name: "orderAsc", by: [{ field: "order", direction: "asc" }] }],
  preview: {
    select: { name: "name", duration: "duration", price: "price", from: "priceFrom", active: "active" },
    prepare: ({ name, duration, price, from, active }) => ({
      title: active === false ? `${name} (ausgeblendet)` : name,
      subtitle: [duration && `${duration} Min.`, typeof price === "number" && `${from ? "ab " : ""}${price.toFixed(2).replace(".", ",")} €`]
        .filter(Boolean)
        .join(" · "),
    }),
  },
});
