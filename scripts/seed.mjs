// Initial content for a fresh dataset: settings and sample services. Shifts ("Schneidezeiten") the owner adds himself. Creates documents only if
// they do not exist yet (createIfNotExists), so it never overwrites what the owner changed.
// Usage: SANITY_PROJECT_ID=… SANITY_DATASET=production SANITY_TOKEN=… pnpm seed   (or values in .env)
const { SANITY_PROJECT_ID: project, SANITY_DATASET: dataset = "production", SANITY_TOKEN: token } = process.env;
if (!project || !token) {
  console.error("SANITY_PROJECT_ID und SANITY_TOKEN fehlen (.env oder Umgebung).");
  process.exit(1);
}

const docs = [
  {
    _id: "settings",
    _type: "settings",
    bookingEnabled: true,
    slotMinutes: 15,
    minNoticeHours: 2,
    horizonDays: 28,
    bufferMinutes: 0,
  },
  { _id: "service-herren", _type: "service", name: "Herren Haarschnitt", duration: 30, price: 25, order: 10, active: true },
  { _id: "service-kombi", _type: "service", name: "Herren Haare + Bart", duration: 45, price: 35, order: 20, active: true },
  { _id: "service-bart", _type: "service", name: "Nur Bart", duration: 15, price: 12, order: 30, active: true },
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
