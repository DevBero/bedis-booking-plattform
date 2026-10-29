import type { ValidationContext } from "sanity";

const API_VERSION = "2025-02-19";

// Warns (does not block) when a booking or block overlaps another active booking or block. Bookings without
// an end take the duration of their service, the same rule the API uses (infra/lambda/api/sanity.ts).
export async function overlapWarning(start: string | undefined, end: string | undefined, ctx: ValidationContext) {
  if (!start || !end || end <= start) return true;
  const id = (ctx.document?._id ?? "").replace(/^drafts\./, "");
  const hits = await ctx.getClient({ apiVersion: API_VERSION }).fetch<{ label: string }[]>(
    `*[
      ((_type == "booking" && status != "cancelled") || _type == "block")
      && !(_id in [$id, "drafts." + $id])
      && !(_id in path("drafts.**"))
      && dateTime(start) < dateTime($end)
      && dateTime(coalesce(end, dateTime(start) + coalesce(service->duration, 30) * 60)) > dateTime($start)
    ][0...3]{ "label": coalesce(customerName, reason, "Blockzeit") }`,
    { id, start, end },
  );
  if (!hits.length) return true;
  return `Überschneidet sich mit: ${hits.map((h) => h.label).join(", ")}`;
}
