# Technik

## 1. Stack

TypeScript (strict), pnpm 11 Workspace (Root = Seite + Infrastruktur, `studio/` = Sanity Studio), Node ≥ 22.
Next.js 16 (`output: "export"`, `trailingSlash`), React 19, Tailwind CSS 4, lucide-react, cva/clsx/tailwind-merge.
Sanity Studio 6 mit `@sanity/locale-de-de`. API: AWS Lambda (Node 22, ARM64, esbuild) mit DynamoDB, SES, SSM;
Sanity über die HTTP-API (`fetch`). Infrastruktur: AWS CDK v2. CI/CD: GitHub Actions mit OIDC.

## 2. Ordner

```
src/app/                 Seiten: / (Buchung), /storno/, /impressum/, /datenschutz/, 404, robots.txt
src/components/booking/  Buchungsablauf (booking-flow.tsx orchestriert)
src/components/cancel/   Absage per Link
src/components/ui/       Grundbausteine (Button, Field, Notice, Spinner, Container)
src/lib/                 API-Client, Mock-API, Bot-Schutz, Formate, .ics, URL-Zustand, Salon-Stammdaten
studio/                  Sanity Studio (Schemas, Struktur, Kalender-Tool)
infra/config.ts          Alles Konto-/Domain-spezifische an einer Stelle
infra/lib/               CDK-Stacks (Site je Umgebung, Shared, GitHub)
infra/lambda/api/        API: index (Routen), slots + time (reine Logik, getestet), sanity, guard, mail, phone
scripts/                 deploy-site, set-secret, seed, qr, budget, site-check
```

## 3. Datenmodell (Sanity, Dataset `staging` / `production`, beide privat)

| Typ | Felder |
|---|---|
| `settings` (Singleton `_id: settings`) | name, street, zip, city, phone, notifyEmail, bookingEnabled, notice, slotMinutes, minNoticeHours, horizonDays, bufferMinutes, cancelHours |
| `openingHours` (Singleton) | monday … sunday: `[{ from: "HH:MM", to: "HH:MM" }]`, leer = geschlossen |
| `closure` | from, to (Datum, inklusiv), reason |
| `service` | name, duration (min), price (€ brutto), priceFrom, description, order, active |
| `booking` | service (Ref), start, end (optional → start + Dauer), customerName, phone (E.164), email, note, status (`confirmed`/`cancelled`/`noshow`), source (`online`/`manual`), channel (z. B. `qr`), createdAt, cancelTokenHash, staff (v2) |
| `block` | start, end, reason |

Nur **veröffentlichte** Dokumente zählen (`perspective=published`); Entwürfe im Studio belegen nichts.
Zeitzone ist fest `Europe/Berlin`; gespeichert wird UTC.

## 4. API (`/api/*`, Lambda hinter CloudFront)

| Route | Antwort |
|---|---|
| `GET /api/config?src=qr` | `{ salon, bookingEnabled, notice, horizonDays, services[], customerMail, timeZone }` – 60 s Cache in der Lambda; zählt Besuche je `src` |
| `GET /api/slots?service=<id>[&from=YYYY-MM-DD&days=n]` | `{ service, duration, days: [{ date, slots: [ISO…] }] }` – Standard: heute bis Horizont |
| `GET /api/challenge` | `{ id, difficulty }` Proof-of-Work |
| `POST /api/book` | Body `{ service, start, name, phone, email?, note?, src?, website (Honeypot), challenge, nonce }` → `{ ok, booking, confirmationMail }` · Fehler `400 <feld>_invalid…`, `409 slot_taken`, `409 booking_disabled`, `429 rate_limited` |
| `POST /api/cancel` | `{ token }` → Vorschau; `{ token, confirm: true }` → storniert · `404 not_found`, `409 too_late` / `not_active` |
| EventBridge täglich 03:00 UTC | löscht Buchungen und Blockzeiten älter als `RETENTION_DAYS` |

POSTs brauchen den Header `x-amz-content-sha256` (SHA-256 des Bodys), weil CloudFront die Anfrage an die Function URL
signiert (OAC); `src/lib/api.ts` setzt ihn.

## 5. Slot-Logik (`infra/lambda/api/slots.ts`, Tests in `slots.test.ts`)

Für jeden Berliner Kalendertag: Zeitfenster des Wochentags → Startzeiten im Raster (`slotMinutes`), die Leistung muss
komplett ins Fenster passen. Ausgeschlossen: geschlossene Tage; Starts vor `jetzt + Mindestvorlauf` oder nach dem
Horizont; Überschneidung von `[Start, Start + Dauer + Puffer)` mit einer Buchung (deren Ende + Puffer) oder Blockzeit.
Tests decken Sommerzeit-Wechsel (29.03.2026, 25.10.2026), Mittagspause, Puffer, Vorlauf und Horizont ab.

## 6. Doppelbuchungen

1. `lockSlot`: DynamoDB `TransactWriteItems` auf jede 5-Minuten-Einheit des Termins (`pk = slot#<iso>`), Bedingung
   `attribute_not_exists(pk) OR expires < now`. Fehlschlag → `409 slot_taken`.
2. Direkt danach frische GROQ-Abfrage aller Buchungen/Blockzeiten/geschlossenen Tage → `isFree` (deckt im Studio
   eingetragene Termine ab).
3. Buchung mit eigener `_id` anlegen (`visibility=sync`, damit die nächste Abfrage sie sieht), dann Sperren freigeben.

**Abweichung vom Briefing:** Die Sperren leben nur 60 s statt bis nach dem Termin. Grund: Nach dem Anlegen belegt die
Buchung in Sanity den Slot ohnehin; lange Sperren würden einen im Studio stornierten Termin bis zum Ablauf blockieren.
5-Minuten-Einheiten statt 15, damit Leistungen mit z. B. 20 oder 25 Minuten direkt aneinander buchbar bleiben.

## 7. Missbrauchsschutz (`guard.ts`)

Honeypot `website` und zu schnelle Einsendungen (< 3 s nach Challenge) → Schein-Erfolg. Proof-of-Work (SHA-256, 15
Null-Bits, einmal einlösbar, 1 h gültig). Rate-Limits pro gekürztem, gesalzenem IP-Hash: 3 Buchungen/Tag,
300 Slot-Abfragen/h, 30 Challenges/h, 20 Absage-Versuche/h. MX-Prüfung der E-Mail-Domain. Telefon → E.164 (DE-Default).

## 8. Datenschutz

Keine Cookies, kein Tracking, keine Fremd-Requests (Schrift selbst gehostet). Buchungen werden 30 Tage nach dem Termin
gelöscht (Aufräum-Job); DynamoDB-Einträge laufen per TTL ab. Der Absage-Token wird nur als SHA-256 gespeichert.

## 9. URL-Regeln

| URL | Ziel |
|---|---|
| `www.<domain>/*` | 301 → `<domain>/*` |
| `/pfad` | 301 → `/pfad/` → `/pfad/index.html` |
| `/admin`, `/admin/...` (ohne Dateiendung) | `/admin/index.html` (Studio-SPA) |
| `/api/*` | Lambda |
| fehlt | `/404.html` mit Status 404 |
| Buchungsschritte | `/?leistung=<id>&tag=YYYY-MM-DD&zeit=<ISO>` (Zurück-Taste funktioniert) |

## 10. Lokale Entwicklung

`pnpm dev:mock` beantwortet `/api/*` im Browser (`src/lib/mock-api.ts`) mit Beispieldaten und der echten Slot-Logik.
Gegen echtes Staging: Seite deployen und dort testen (die Lambda braucht CloudFront + SSM).
