// Initial content for a fresh dataset: settings, opening hours and sample services. Creates documents only if
// they do not exist yet (createIfNotExists), so it never overwrites what the owner changed.
// Usage: SANITY_PROJECT_ID=… SANITY_DATASET=staging SANITY_TOKEN=… pnpm seed   (or values in .env)
const { SANITY_PROJECT_ID: project, SANITY_DATASET: dataset = "staging", SANITY_TOKEN: token } = process.env;
if (!project || !token) {
  console.error("SANITY_PROJECT_ID und SANITY_TOKEN fehlen (.env oder Umgebung).");
  process.exit(1);
}

const workday = [
  { _key: "am", _type: "window", from: "09:00", to: "13:00" },
  { _key: "pm", _type: "window", from: "14:00", to: "18:00" },
];
const docs = [
  {
    _id: "settings",
    _type: "settings",
    name: "Salon Bedi",
    bookingEnabled: true,
    slotMinutes: 15,
    minNoticeHours: 2,
    horizonDays: 28,
    bufferMinutes: 0,
    cancelHours: 12,
  },
  { _id: "openingHours", _type: "openingHours", tuesday: workday, wednesday: workday, thursday: workday, friday: workday, saturday: [{ _key: "sa", _type: "window", from: "09:00", to: "14:00" }] },
  { _id: "service-herren", _type: "service", name: "Herrenschnitt", duration: 30, price: 25, order: 10, active: true },
  { _id: "service-bart", _type: "service", name: "Bart trimmen", duration: 15, price: 12, order: 20, active: true },
  { _id: "service-kombi", _type: "service", name: "Haarschnitt + Bart", duration: 45, price: 35, order: 30, active: true },
  { _id: "service-damen", _type: "service", name: "Damenschnitt", duration: 60, price: 39, priceFrom: true, order: 40, active: true },
  { _id: "service-kinder", _type: "service", name: "Kinderschnitt (bis 12)", duration: 20, price: 15, order: 50, active: true },
];

const res = await fetch(`https://${project}.api.sanity.io/v2025-02-19/data/mutate/${dataset}`, {
  method: "POST",
  headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
  body: JSON.stringify({ mutations: docs.map((doc) => ({ createIfNotExists: doc })) }),
});
if (!res.ok) {
  console.error(`Sanity ${res.status}: ${await res.text()}`);
  process.exit(1);
}
console.log(`✓ ${docs.length} Startdokumente in ${project}/${dataset} angelegt (vorhandene unverändert)`);
