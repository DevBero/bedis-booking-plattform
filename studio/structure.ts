import { CalendarIcon } from "@sanity/icons/Calendar";
import { ClockIcon } from "@sanity/icons/Clock";
import { CogIcon } from "@sanity/icons/Cog";
import { DocumentTextIcon } from "@sanity/icons/DocumentText";
import { UserIcon } from "@sanity/icons/User";
import type { StructureResolver } from "sanity/structure";

const DAY = 24 * 60 * 60 * 1000;

// Local midnight of the browser (the owner is in Germany), shifted by whole days
function midnight(offsetDays = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString();
}

// Local date "YYYY-MM-DD" of today, for the date field of shifts
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Monday 00:00 of the next week
function nextMonday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  return d.toISOString();
}

type Range = { title: string; id: string; filter: string; params: () => Record<string, string>; desc?: boolean };

// Computed when the list opens (child factory), so "Heute" is right even after the Studio stayed open overnight
const RANGES: Range[] = [
  { title: "Heute", id: "today", filter: "start >= $from && start < $to", params: () => ({ from: midnight(), to: midnight(1) }) },
  { title: "Morgen", id: "tomorrow", filter: "start >= $from && start < $to", params: () => ({ from: midnight(1), to: midnight(2) }) },
  { title: "Diese Woche", id: "week", filter: "start >= $from && start < $to", params: () => ({ from: midnight(), to: nextMonday() }) },
  { title: "Kommende", id: "upcoming", filter: "start >= $from", params: () => ({ from: midnight() }) },
  { title: "Vergangene", id: "past", filter: "start < $to", params: () => ({ to: midnight() }), desc: true },
];

export const structure: StructureResolver = (S) =>
  S.list()
    .title("Salon")
    .items([
      S.listItem()
        .title("Schneidezeiten")
        .id("shifts")
        .icon(ClockIcon)
        .child(
          S.list()
            .title("Schneidezeiten")
            .items([
              S.listItem()
                .title("Kommende")
                .id("shiftsUpcoming")
                .icon(ClockIcon)
                .child(() =>
                  S.documentList()
                    .title("Kommende Schneidezeiten")
                    .schemaType("shift")
                    .apiVersion("2025-02-19")
                    .filter(`_type == "shift" && date >= $today`)
                    .params({ today: today() })
                    .defaultOrdering([{ field: "date", direction: "asc" }, { field: "from", direction: "asc" }]),
                ),
              S.listItem()
                .title("Vergangene")
                .id("shiftsPast")
                .icon(ClockIcon)
                .child(() =>
                  S.documentList()
                    .title("Vergangene Schneidezeiten")
                    .schemaType("shift")
                    .apiVersion("2025-02-19")
                    .filter(`_type == "shift" && date < $today`)
                    .params({ today: today() })
                    .defaultOrdering([{ field: "date", direction: "desc" }]),
                ),
            ]),
        ),
      S.listItem()
        .title("Termine")
        .id("bookings")
        .icon(UserIcon)
        .child(
          S.list()
            .title("Termine")
            .items([
              ...RANGES.map((range) =>
                S.listItem()
                  .title(range.title)
                  .id(range.id)
                  .icon(CalendarIcon)
                  .child(() =>
                    S.documentList()
                      .title(range.title)
                      .schemaType("booking")
                      .apiVersion("2025-02-19")
                      .filter(`_type == "booking" && status != "cancelled" && ${range.filter}`)
                      .params(range.params())
                      .defaultOrdering([{ field: "start", direction: range.desc ? "desc" : "asc" }])
                      .initialValueTemplates([S.initialValueTemplateItem("booking-manual")]),
                  ),
              ),
              S.listItem()
                .title("Storniert")
                .id("cancelled")
                .icon(CalendarIcon)
                .child(
                  S.documentList()
                    .title("Storniert")
                    .schemaType("booking")
                    .apiVersion("2025-02-19")
                    .filter(`_type == "booking" && status == "cancelled"`)
                    .defaultOrdering([{ field: "start", direction: "desc" }]),
                ),
              S.divider(),
              S.documentTypeListItem("booking").title("Alle Termine"),
            ]),
        ),
      S.divider(),
      S.documentTypeListItem("service").title("Leistungen").icon(DocumentTextIcon),
      S.listItem().title("Einstellungen").id("settings").icon(CogIcon).child(S.document().schemaType("settings").documentId("settings").title("Einstellungen")),
    ]);
