// Studio of the salon, served from our own domain under /admin (docs/HOSTING.md). Project and dataset come
// from studio/.env or the deploy script (SANITY_STUDIO_PROJECT_ID, SANITY_STUDIO_DATASET).
import { deDELocale } from "@sanity/locale-de-de";
import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { calendarTool } from "./components/CalendarTool";
import { schemaTypes, SINGLETONS } from "./schemaTypes";
import { structure } from "./structure";

const dataset = process.env.SANITY_STUDIO_DATASET || "production";

export default defineConfig({
  name: "salon",
  title: dataset === "production" ? "Salon" : "Salon (Test)",
  projectId: process.env.SANITY_STUDIO_PROJECT_ID!,
  dataset,
  plugins: [
    structureTool({ structure, title: "Verwaltung" }),
    calendarTool(),
    deDELocale(),
    // GROQ playground for the developer; hidden from editors would need roles (paid plan)
    visionTool({ title: "Abfragen" }),
  ],
  schema: {
    types: schemaTypes,
    templates: (templates) => [
      // Singletons exist once; no "new document" for them
      ...templates.filter((t) => !SINGLETONS.includes(t.schemaType)),
      // Appointments entered in the Studio are always "manual"
      { id: "booking-manual", title: "Termin (Telefon / vor Ort)", schemaType: "booking", value: { source: "manual", status: "confirmed" } },
    ],
  },
  document: {
    // No delete or duplicate for singletons; new bookings from "+" use the manual template
    actions: (actions, { schemaType }) =>
      SINGLETONS.includes(schemaType) ? actions.filter((a) => !["delete", "duplicate", "unpublish"].includes(a.action ?? "")) : actions,
    newDocumentOptions: (items) => items.filter((i) => !SINGLETONS.includes(i.templateId) && i.templateId !== "booking"),
  },
});
