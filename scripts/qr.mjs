// QR code for the salon: print/qr.svg, print/qr.png, a print-ready A6 table card print/aufsteller-a6.pdf
// (salon name, "Termin buchen", code, readable URL) and an A4 poster print/plakat-a4.pdf (headline + big code). Target: https://<domain>/?src=qr, so the API can count
// bookings that come from the code. Usage: pnpm qr [url]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";

const config = readFileSync("infra/config.ts", "utf8");
const domain = config.match(/DOMAIN = "([^"]+)"/)[1];
const salon = readFileSync("src/lib/salon.ts", "utf8").match(/name: "([^"]+)"/)[1];
const url = process.argv[2] ?? `https://${domain}/?src=qr`;
if (url.includes("TODO")) {
  console.error("Domain fehlt noch in infra/config.ts (ZONE_NAME) – oder URL angeben: pnpm qr https://…");
  process.exit(1);
}

// Error correction "Q" (25 %) survives scratches and a small logo sticker
const options = { errorCorrectionLevel: "Q", margin: 2, color: { dark: "#1d1b18", light: "#ffffff" } };
mkdirSync("print", { recursive: true });
writeFileSync("print/qr.svg", await QRCode.toString(url, { ...options, type: "svg" }));
const png = await QRCode.toBuffer(url, { ...options, type: "png", width: 2000 });
writeFileSync("print/qr.png", png);

// A6 portrait in points (105 x 148 mm)
const mm = (v) => (v * 72) / 25.4;
const pdf = await PDFDocument.create();
pdf.setTitle(`${salon} – Termin buchen`);
const page = pdf.addPage([mm(105), mm(148)]);
const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
const regular = await pdf.embedFont(StandardFonts.Helvetica);
const ink = rgb(0.114, 0.106, 0.094);
const accent = rgb(0.122, 0.29, 0.239);
const center = (text, font, size, y, color = ink) =>
  page.drawText(text, { x: (page.getWidth() - font.widthOfTextAtSize(text, size)) / 2, y, size, font, color });

center(salon, bold, 20, mm(130));
center("Termin buchen", regular, 13, mm(121), accent);
const qr = await pdf.embedPng(png);
const size = mm(70);
page.drawImage(qr, { x: (page.getWidth() - size) / 2, y: mm(42), width: size, height: size });
center("Code mit der Handy-Kamera scannen", regular, 9, mm(34));
const shortUrl = url.replace(/^https:\/\//, "").replace(/\/?\?src=qr$/, "");
center(shortUrl, bold, 12, mm(24), accent);
center("Leistung wählen · Uhrzeit aussuchen · fertig", regular, 8, mm(14));
writeFileSync("print/aufsteller-a6.pdf", await pdf.save());

// A4 portrait (210 x 297 mm): headline and a 150 mm code, centred as one block so it reads from a few metres away
const poster = await PDFDocument.create();
poster.setTitle(`${salon} – Friseurtermin buchen`);
const sheet = poster.addPage([mm(210), mm(297)]);
const posterBold = await poster.embedFont(StandardFonts.HelveticaBold);
const headline = "Friseurtermin buchen";
// Largest size up to 48 pt that keeps 20 mm side margins
const headlineSize = Math.min(48, (mm(170) / posterBold.widthOfTextAtSize(headline, 1)) | 0);
const capHeight = posterBold.heightAtSize(headlineSize, { descender: false });
const qrSize = mm(150);
const gap = mm(18);
const top = (sheet.getHeight() + capHeight + gap + qrSize) / 2;
sheet.drawText(headline, {
  x: (sheet.getWidth() - posterBold.widthOfTextAtSize(headline, headlineSize)) / 2,
  y: top - capHeight,
  size: headlineSize,
  font: posterBold,
  color: ink,
});
sheet.drawImage(await poster.embedPng(png), { x: (sheet.getWidth() - qrSize) / 2, y: top - capHeight - gap - qrSize, width: qrSize, height: qrSize });
writeFileSync("print/plakat-a4.pdf", await poster.save());

console.log(`✓ print/qr.svg, print/qr.png, print/aufsteller-a6.pdf, print/plakat-a4.pdf → ${url}`);
