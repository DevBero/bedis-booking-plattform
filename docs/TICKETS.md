# Tickets

Status: ⬜ offen · 🟨 in Arbeit · 🟦 wartet · ✅ erledigt. Wer: **Du** = Entwickler/Inhaber per Hand, **Dev** = im Code.
Die Handarbeit in Reihenfolge steht zusätzlich in [`../TICKET.md`](../TICKET.md).

## Phase 1 – Fundament

| ID | Titel | Prio | Wer | Abh. | Status | Doku |
|---|---|---|---|---|---|---|
| BD-101 | Repo, pnpm-Workspace (Seite + `studio/`), TS strict, ESLint | P0 | Dev | – | ✅ | TECH §1 |
| BD-102 | Doku-Dateien (CLAUDE, BRIEF, TECH, HOSTING, STUDIO, DESIGN, COMPONENTS, TICKETS) | P0 | Dev | – | ✅ | – |
| BD-103 | CI-Workflow (typecheck, lint, test, build Seite + Studio) | P1 | Dev | – | ✅ | HOSTING §5 |
| BD-104 | Mit dem Inhaber klären: Leistungen (Dauer, Preis), Vorlauf, Raster | P0 | Du | – | ⬜ | BRIEF „Annahmen“ |
| BD-105 | Umbau auf internes Werkzeug: Schneidezeiten statt Öffnungszeiten, keine Mails, keine Online-Absage, kein Impressum, noindex (2026-10-29) | P0 | Dev | – | ✅ | BRIEF, TECH §3–5 |

## Phase 2 – AWS-Basis

| ID | Titel | Prio | Wer | Abh. | Status | Doku |
|---|---|---|---|---|---|---|
| BD-200 | Konto beyou (geteilt), Profil `beyou`, `aws login` | P0 | Du | – | ✅ | HOSTING §1 |
| BD-201 | Subdomain `bedis-hairsalon.be-you.pro` in der Zone be-you.pro (Konto beyou, Records per CDK) | P0 | Dev | BD-200 | ✅ | HOSTING §2 |
| BD-202 | ACM-Zertifikat us-east-1 für `bedis-hairsalon.be-you.pro`, ARN eintragen | P0 | Du | BD-201 | ✅ | HOSTING §3 |
| BD-203 | CDK-Stacks Site/Shared/GitHub (Code) | P0 | Dev | – | ✅ | HOSTING §4 |
| BD-204 | `pnpm deploy` (Bootstrap im Konto schon da) | P0 | Du | BD-202, BD-301 | ⬜ | HOSTING §4 |
| BD-205 | GitHub-Environments + `AWS_DEPLOY_ROLE_ARN`, `SITE_CHECK_URL` | P1 | Du | BD-204 | ⬜ | HOSTING §5 |
| BD-206 | Deploy-, Site-Check-Workflow und Scripts (Code) | P1 | Dev | – | ✅ | HOSTING §5 |
| BD-207 | Kostenalarm `pnpm budget` | P2 | Du | BD-200 | ⬜ | HOSTING §4 |

## Phase 3 – Sanity

| ID | Titel | Prio | Wer | Abh. | Status | Doku |
|---|---|---|---|---|---|---|
| BD-301 | Sanity-Projekt (`zpfep43i` ✓), Dataset `production` auf privat stellen (ist öffentlich) | P0 | Du | – | 🟨 | HOSTING §6 |
| BD-302 | Schemas, Studio-Struktur, deutsche Oberfläche, Überschneidungs-Warnung, Kalender-Tool (mit Schneidezeiten + Terminzahl je Tag) | P0 | Dev | – | ✅ | TECH §3, STUDIO |
| BD-303 | CORS-Origins mit Credentials | P0 | Du | BD-301, BD-201 | ⬜ | HOSTING §6 |
| BD-304 | Editor-Token → SSM `/bedi/sanity/token` | P0 | Du | BD-301, BD-200 | ⬜ | HOSTING §6 |
| BD-305 | Startinhalte `pnpm seed` (Einstellungen, Leistungen) | P1 | Du | BD-304 | ⬜ | HOSTING §6 |
| BD-306 | Studio unter `/admin` prüfen (Login, CSP in der Konsole) | P0 | Du | BD-204 | ⬜ | HOSTING §7 |
| BD-307 | Inhaber einladen | P1 | Du | BD-301 | ⬜ | HOSTING §6 |

## Phase 4 – API

| ID | Titel | Prio | Wer | Abh. | Status | Doku |
|---|---|---|---|---|---|---|
| BD-401 | `/api/config`, `/api/slots` (Slot-Logik + Tests inkl. Sommerzeit) | P0 | Dev | – | ✅ | TECH §4–5 |
| BD-402 | `/api/challenge`, Honeypot, Rate-Limit, Telefon E.164 | P0 | Dev | – | ✅ | TECH §7 |
| BD-403 | `/api/book` mit DynamoDB-Sperre + GROQ-Prüfung | P0 | Dev | – | ✅ | TECH §6 |
| BD-405 | Täglicher Aufräum-Job | P1 | Dev | – | ✅ | TECH §8 |

## Phase 5 – Buchungsseite

| ID | Titel | Prio | Wer | Abh. | Status | Doku |
|---|---|---|---|---|---|---|
| BD-501 | Ablauf Leistung → Tag → Uhrzeit → Daten → Bestätigung, Zustand in der URL | P0 | Dev | – | ✅ | TECH §9 |
| BD-502 | Fehlerfälle (Slot vergeben → neu laden, Netz, Rate-Limit), Ladezustände | P0 | Dev | – | ✅ | – |
| BD-503 | Bestätigung + `.ics` + Hinweis „telefonisch absagen“ | P0 | Dev | – | ✅ | – |
| BD-504 | Barrierefreiheit (Fokus, ARIA, Tastatur), Mock-Modus `pnpm dev:mock` | P1 | Dev | – | ✅ | DESIGN |
| BD-505 | Lighthouse ≥ 95 auf der Live-Domain messen | P1 | Du | BD-204 | ⬜ | – |

## Phase 6 – Recht & Launch

| ID | Titel | Prio | Wer | Abh. | Status | Doku |
|---|---|---|---|---|---|---|
| BD-602 | Impressum + Datenschutz: entfällt, internes Werkzeug ohne Indexierung (Entscheidung 2026-10-29) | – | Du | – | ✅ | – |
| BD-603 | Aufbewahrungsfrist mit Inhaber festlegen (Standard 30 Tage) | P1 | Du | – | ⬜ | TECH §8 |
| BD-604 | Branding (Logo, Farben) → Tokens | P2 | Du/Dev | BD-104 | ⬜ | DESIGN |
| BD-605 | Sanity-DPA abschließen | P0 | Du | BD-301 | ⬜ | HOSTING §6 |
| BD-606 | Testbuchungen (online, manuell, Überschneidung, parallel) | P0 | Du | BD-306 | ⬜ | HOSTING Checkliste |
| BD-607 | Production-Deploy | P0 | Du | alle P0 | ⬜ | HOSTING §5 |
| BD-608 | QR-Aufsteller drucken (`pnpm qr`) | P1 | Du | BD-201 | ⬜ | – |
| BD-609 | Inhaber-Schulung mit `STUDIO.md` | P1 | Du | BD-607 | ⬜ | STUDIO |

## Phase 7 – Danach

| ID | Titel | Prio | Wer | Abh. | Status | Doku |
|---|---|---|---|---|---|---|
| BD-702 | Google-Unternehmensprofil: Link „Termin buchen“, `googleProfile` in `salon.ts` | P2 | Du | BD-607 | ⬜ | – |
| BD-703 | v2: mehrere Mitarbeiter (`staff`) | P2 | Dev | – | ⬜ | BRIEF |
| BD-704 | SMS-Erinnerung | P2 | Dev | – | ⬜ | – |
