# Technik

## 1. Stack

TypeScript (strict), pnpm 11 Workspace (Root = Seite + Infrastruktur, `studio/` = Sanity Studio), Node ≥ 22.
Next.js 16 (`output: "export"`, `trailingSlash`), React 19, Tailwind CSS 4, lucide-react, cva/clsx/tailwind-merge.
Sanity Studio 6 mit `@sanity/locale-de-de`. API: AWS Lambda (Node 22, ARM64, esbuild) mit DynamoDB, SSM;
Sanity über die HTTP-API (`fetch`). Infrastruktur: AWS CDK v2. CI/CD: GitHub Actions mit OIDC.

## 2. Ordner

```
src/app/                 Seiten: / (Buchung), 404, robots.txt
src/components/booking/  Buchungsablauf (booking-flow.tsx orchestriert)
src/components/ui/       Grundbausteine (Button, Field, Notice, Spinner, Container)
src/lib/                 API-Client, Mock-API, Bot-Schutz, Formate, .ics, URL-Zustand, Salon-Stammdaten
studio/                  Sanity Studio (Schemas, Struktur, Kalender-Tool)
infra/config.ts          Alles Konto-/Domain-spezifische an einer Stelle
infra/lib/               CDK-Stacks (Site, GitHub)
infra/lambda/api/        API: index (Routen), slots + time (reine Logik, getestet), sanity, guard, phone
scripts/                 deploy-site, set-secret, seed, qr, budget, site-check
```

## 3. Datenmodell (Sanity, Dataset `production`, privat)

| Typ | Felder |
|---|---|
| `settings` (Singleton `_id: settings`) | name, bookingEnabled, notice, slotMinutes, minNoticeHours, horizonDays, bufferMinutes |
| `shift` („Schneidezeit“) | date (YYYY-MM-DD), from, to (`HH:MM`, Berliner Zeit) – die einzige Quelle freier Zeiten |
| `service` | name, duration (min), price (€ brutto), priceFrom, description, order, active |
| `booking` | service (Ref), start, end (optional → start + Dauer), customerName, phone (E.164), note, status (`confirmed`/`cancelled`/`noshow`), source (`online`/`manual`), channel (z. B. `qr`), createdAt, staff (v2) |

Nur **veröffentlichte** Dokumente zählen (`perspective=published`); Entwürfe im Studio belegen nichts.
Zeitzone ist fest `Europe/Berlin`; gespeichert wird UTC.

## 4. API (`/api/*`, Lambda hinter CloudFront)

| Route | Antwort |
|---|---|
| `GET /api/config?src=qr` | `{ salon: { name }, bookingEnabled, notice, horizonDays, services[], timeZone }` – 60 s Cache in der Lambda; zählt Besuche je `src` |
| `GET /api/slots?service=<id>` | `{ service, duration, days: [{ date, slots: [ISO…] }] }` – nur Tage mit Schneidezeit bis zum Horizont; ausgebuchte mit leerem `slots` |
| `GET /api/challenge` | `{ id, difficulty }` Proof-of-Work |
| `POST /api/book` | Body `{ service, start, name, phone, note?, src?, website (Honeypot), challenge, nonce }` → `{ ok, booking }` · Fehler `400 <feld>_invalid…`, `409 slot_taken`, `409 booking_disabled`, `429 rate_limited` |
| EventBridge täglich 03:00 UTC | löscht Buchungen und Schneidezeiten älter als `RETENTION_DAYS` |

Keine Mails, keine Online-Absage: Der Inhaber sieht Buchungen im Studio, Kunden sagen telefonisch ab.

POSTs brauchen den Header `x-amz-content-sha256` (SHA-256 des Bodys), weil CloudFront die Anfrage an die Function URL
signiert (OAC); `src/lib/api.ts` setzt ihn.

## 5. Slot-Logik (`infra/lambda/api/slots.ts`, Tests in `slots.test.ts`)

Für jeden Berliner Kalendertag mit Schneidezeit: Startzeiten im Raster (`slotMinutes`) ab Beginn der Schneidezeit, die
Leistung muss komplett hineinpassen. Ausgeschlossen: Starts vor `jetzt + Mindestvorlauf` oder nach dem Horizont;
Überschneidung von `[Start, Start + Dauer + Puffer)` mit einer Buchung (deren Ende + Puffer).
Tests decken Zeitumstellung, zwei Schneidezeiten an einem Tag, Puffer, Vorlauf und Horizont ab.

## 6. Doppelbuchungen

1. `lockSlot`: DynamoDB `TransactWriteItems` auf jede 5-Minuten-Einheit des Termins (`pk = slot#<iso>`), Bedingung
   `attribute_not_exists(pk) OR expires < now`. Fehlschlag → `409 slot_taken`.
2. Direkt danach frische GROQ-Abfrage aller Schneidezeiten und Buchungen → `isFree` (deckt im Studio
   eingetragene Termine ab).
3. Buchung mit eigener `_id` anlegen (`visibility=sync`, damit die nächste Abfrage sie sieht), dann Sperren freigeben.

**Abweichung vom Briefing:** Die Sperren leben nur 60 s statt bis nach dem Termin. Grund: Nach dem Anlegen belegt die
Buchung in Sanity den Slot ohnehin; lange Sperren würden einen im Studio stornierten Termin bis zum Ablauf blockieren.
5-Minuten-Einheiten statt 15, damit Leistungen mit z. B. 20 oder 25 Minuten direkt aneinander buchbar bleiben.

## 7. Missbrauchsschutz (`guard.ts`)

Honeypot `website` und zu schnelle Einsendungen (< 3 s nach Challenge) → Schein-Erfolg. Proof-of-Work (SHA-256, 15
Null-Bits, einmal einlösbar, 1 h gültig). Rate-Limits pro gekürztem, gesalzenem IP-Hash: 3 Buchungen/Tag,
300 Slot-Abfragen/h, 30 Challenges/h. Telefon → E.164 (DE-Default).

## 8. Datenschutz

Keine Cookies, kein Tracking, keine Fremd-Requests (Schrift selbst gehostet). Buchungen werden 30 Tage nach dem Termin
gelöscht (Aufräum-Job); DynamoDB-Einträge laufen per TTL ab.

Nicht indexierbar: `robots.txt` sperrt alles, jede Seite trägt `<meta name="robots" content="noindex, nofollow">`,
CloudFront setzt zusätzlich `X-Robots-Tag: noindex, nofollow` auf jede Antwort (auch Studio und API).

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
Gegen die echte API: deployen und auf der Live-Domain testen (die Lambda braucht CloudFront + SSM).
