# Tickets

Status: ⬜ offen · 🟨 in Arbeit · 🟦 wartet · ✅ erledigt. Wer: **Du** = Entwickler/Inhaber per Hand, **Dev** = im Code.
Die Handarbeit in Reihenfolge steht zusätzlich in [`../TICKET.md`](../TICKET.md).

## Phase 1 – Fundament

| ID | Titel | Prio | Wer | Abh. | Status | Doku |
|---|---|---|---|---|---|---|
| BD-101 | Repo, pnpm-Workspace (Seite + `studio/`), TS strict, ESLint | P0 | Dev | – | ✅ | TECH §1 |
| BD-102 | Doku-Dateien (CLAUDE, BRIEF, TECH, HOSTING, STUDIO, DESIGN, COMPONENTS, TICKETS) | P0 | Dev | – | ✅ | – |
| BD-103 | CI-Workflow (typecheck, lint, test, build Seite + Studio) | P1 | Dev | – | ✅ | HOSTING §5 |
| BD-104 | Offene Fragen aus dem Briefing mit dem Inhaber klären (Name, Leistungen, Zeiten, Branding …) | P0 | Du | – | ⬜ | BRIEF „Annahmen“ |

## Phase 2 – AWS-Basis

| ID | Titel | Prio | Wer | Abh. | Status | Doku |
|---|---|---|---|---|---|---|
| BD-200 | AWS-Mitgliedskonto + Profil `bedi`, `aws login` | P0 | Du | – | ⬜ | HOSTING §1 |
| BD-201 | Domain registrieren/übertragen, Hosted Zone, `ZONE_NAME` eintragen | P0 | Du | BD-200 | ⬜ | HOSTING §2 |
| BD-202 | ACM-Zertifikate us-east-1 (prod + staging), ARNs eintragen | P0 | Du | BD-201 | ⬜ | HOSTING §3 |
| BD-203 | CDK-Stacks Site/Shared/GitHub (Code) | P0 | Dev | – | ✅ | HOSTING §4 |
| BD-204 | `pnpm bootstrap` + `pnpm deploy:staging` | P0 | Du | BD-202, BD-301 | ⬜ | HOSTING §4 |
| BD-205 | GitHub-Environments + `AWS_DEPLOY_ROLE_ARN`, `SITE_CHECK_URL` | P1 | Du | BD-204 | ⬜ | HOSTING §5 |
| BD-206 | Deploy-, Site-Check-Workflow und Scripts (Code) | P1 | Dev | – | ✅ | HOSTING §5 |
| BD-207 | Kostenalarm `pnpm budget` | P2 | Du | BD-200 | ⬜ | HOSTING §4 |

## Phase 3 – Sanity

| ID | Titel | Prio | Wer | Abh. | Status | Doku |
|---|---|---|---|---|---|---|
| BD-301 | Sanity-Projekt, Datasets `staging`/`production` privat, Projekt-ID eintragen | P0 | Du | – | ⬜ | HOSTING §6 |
| BD-302 | Schemas, Studio-Struktur, deutsche Oberfläche, Überschneidungs-Warnung, Kalender-Tool | P0 | Dev | – | ✅ | TECH §3, STUDIO |
| BD-303 | CORS-Origins mit Credentials | P0 | Du | BD-301, BD-201 | ⬜ | HOSTING §6 |
| BD-304 | Editor-Token → SSM `/bedi/sanity/token` | P0 | Du | BD-301, BD-200 | ⬜ | HOSTING §6 |
| BD-305 | Startinhalte `pnpm seed` (staging, production) | P1 | Du | BD-304 | ⬜ | HOSTING §6 |
| BD-306 | Studio unter `/admin` auf Staging prüfen (Login, CSP in der Konsole) | P0 | Du | BD-204 | ⬜ | HOSTING §7 |
| BD-307 | Inhaber einladen | P1 | Du | BD-301 | ⬜ | HOSTING §6 |

## Phase 4 – API

| ID | Titel | Prio | Wer | Abh. | Status | Doku |
|---|---|---|---|---|---|---|
| BD-401 | `/api/config`, `/api/slots` (Slot-Logik + Tests inkl. Sommerzeit) | P0 | Dev | – | ✅ | TECH §4–5 |
| BD-402 | `/api/challenge`, Honeypot, Rate-Limit, MX-Prüfung, Telefon E.164 | P0 | Dev | – | ✅ | TECH §7 |
| BD-403 | `/api/book` mit DynamoDB-Sperre + GROQ-Prüfung | P0 | Dev | – | ✅ | TECH §6 |
| BD-404 | Mail an Inhaber (SES) | P0 | Dev | – | ✅ | – |
| BD-405 | Täglicher Aufräum-Job | P1 | Dev | – | ✅ | TECH §8 |
| BD-406 | `/api/cancel` + Kundenbestätigung (Code fertig, Schalter `customerMail`) | P2 | Dev | – | ✅ | HOSTING §9 |
| BD-407 | SES: Inhaber-Adresse verifizieren (falls nicht auf der Domain) | P0 | Du | BD-204 | ⬜ | HOSTING §8 |

## Phase 5 – Buchungsseite

| ID | Titel | Prio | Wer | Abh. | Status | Doku |
|---|---|---|---|---|---|---|
| BD-501 | Ablauf Leistung → Tag → Uhrzeit → Daten → Bestätigung, Zustand in der URL | P0 | Dev | – | ✅ | TECH §9 |
| BD-502 | Fehlerfälle (Slot vergeben → neu laden, Netz, Rate-Limit), Ladezustände | P0 | Dev | – | ✅ | – |
| BD-503 | Bestätigung + `.ics`, Absage-Seite `/storno/` | P0 | Dev | – | ✅ | – |
| BD-504 | Barrierefreiheit (Fokus, ARIA, Tastatur), Mock-Modus `pnpm dev:mock` | P1 | Dev | – | ✅ | DESIGN |
| BD-505 | Lighthouse ≥ 95 auf Staging messen | P1 | Du | BD-204 | ⬜ | – |

## Phase 6 – Recht & Launch

| ID | Titel | Prio | Wer | Abh. | Status | Doku |
|---|---|---|---|---|---|---|
| BD-601 | Salon-Stammdaten in `src/lib/salon.ts` + Studio → Einstellungen | P0 | Du | BD-104 | ⬜ | – |
| BD-602 | Impressum + Datenschutz (Entwürfe da) rechtlich prüfen, Platzhalter füllen | P0 | Du | BD-601 | 🟦 | – |
| BD-603 | Aufbewahrungsfrist mit Inhaber festlegen (Standard 30 Tage) | P1 | Du | – | ⬜ | TECH §8 |
| BD-604 | Branding (Logo, Farben) → Tokens | P2 | Du/Dev | BD-104 | ⬜ | DESIGN |
| BD-605 | Sanity-DPA abschließen, Speicherort in die Datenschutzerklärung | P0 | Du | BD-301 | ⬜ | HOSTING §6 |
| BD-606 | Testbuchungen (online, manuell, Überschneidung, parallel) | P0 | Du | BD-306 | ⬜ | HOSTING Checkliste |
| BD-607 | Production-Deploy | P0 | Du | alle P0 | ⬜ | HOSTING §5 |
| BD-608 | QR-Aufsteller drucken (`pnpm qr`) | P1 | Du | BD-201 | ⬜ | – |
| BD-609 | Inhaber-Schulung mit `STUDIO.md` | P1 | Du | BD-607 | ⬜ | STUDIO |

## Phase 7 – Danach

| ID | Titel | Prio | Wer | Abh. | Status | Doku |
|---|---|---|---|---|---|---|
| BD-701 | SES-Production-Access → `customerMail: true` | P1 | Du | BD-607 | ⬜ | HOSTING §9 |
| BD-702 | Google-Unternehmensprofil: Link „Termin buchen“, `googleProfile` in `salon.ts` | P2 | Du | BD-607 | ⬜ | – |
| BD-703 | v2: mehrere Mitarbeiter (`staff`) | P2 | Dev | – | ⬜ | BRIEF |
| BD-704 | SMS-Erinnerung | P2 | Dev | – | ⬜ | – |
| BD-705 | DMARC von `p=none` auf `quarantine` | P2 | Du | BD-607 | ⬜ | – |
