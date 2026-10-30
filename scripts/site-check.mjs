// Weekly health check (GitHub Actions, site-check.yml; also pnpm site-check): pages answer 200, the API delivers
// config and free slots, the TLS certificate is valid for at least 21 more days. Exit code 1 on any problem.
import { connect } from "node:tls";

const base = (process.env.SITE_URL ?? process.argv[2] ?? "").replace(/\/$/, "");
if (!base.startsWith("https://")) {
  console.error("Usage: SITE_URL=https://… pnpm site-check");
  process.exit(1);
}
const problems = [];
const check = async (label, fn) => {
  try {
    await fn();
    console.log(`✓ ${label}`);
  } catch (error) {
    problems.push(`${label}: ${error.message}`);
    console.log(`✗ ${label}: ${error.message}`);
  }
};
const get = async (path) => {
  const res = await fetch(`${base}${path}`, { redirect: "manual" });
  if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
  return res;
};

for (const path of ["/", "/admin/", "/robots.txt"]) await check(`GET ${path}`, () => get(path));

await check("noindex", async () => {
  const res = await get("/");
  if (!res.headers.get("x-robots-tag")?.includes("noindex")) throw new Error("X-Robots-Tag fehlt");
  if (!(await res.text()).includes("noindex")) throw new Error("meta robots fehlt");
});

let service;
await check("GET /api/config", async () => {
  const config = await (await get("/api/config?src=monitor")).json();
  if (!config.services?.length) throw new Error("keine Leistungen");
  service = config.services[0];
});
if (service) {
  await check(`GET /api/slots (${service.name})`, async () => {
    const slots = await (await get(`/api/slots?service=${encodeURIComponent(service.id)}`)).json();
    if (!Array.isArray(slots.days)) throw new Error("keine Tage");
    const free = slots.days.reduce((n, d) => n + d.slots.length, 0);
    console.log(`  ${free} freie Zeiten in ${slots.days.length} Tagen`);
  });
}

await check("TLS-Zertifikat", () =>
  new Promise((resolve, reject) => {
    const host = new URL(base).hostname;
    const socket = connect({ host, port: 443, servername: host }, () => {
      const cert = socket.getPeerCertificate();
      socket.end();
      const days = Math.floor((Date.parse(cert.valid_to) - Date.now()) / 86_400_000);
      console.log(`  gültig bis ${cert.valid_to} (${days} Tage)`);
      days < 21 ? reject(new Error(`läuft in ${days} Tagen ab`)) : resolve();
    });
    socket.on("error", reject);
  }),
);

if (problems.length) {
  console.error(`\n${problems.length} Problem(e):\n${problems.join("\n")}`);
  process.exit(1);
}
console.log("\nAlles in Ordnung.");
