@AGENTS.md

# Salon-Terminbuchung (bedi)

Kunden scannen im Salon einen QR-Code und buchen online einen Termin; der Inhaber pflegt alles in Sanity Studio
unter `/admin`. Statische Next.js-Seite auf S3 + CloudFront, API als Lambda unter `/api/*`, alles in eu-north-1.
Details: `docs/BRIEF.md` (Produkt), `docs/TECH.md` (Technik), `docs/HOSTING.md` (AWS/Deploy), `docs/TICKETS.md`.
Offene Handarbeit für den Entwickler: `TICKET.md`.

## Befehle

| Befehl | Zweck |
|---|---|
| `pnpm dev:mock` | Buchungsseite lokal mit Beispieldaten (kein AWS/Sanity nötig) |
| `pnpm studio` | Studio lokal (`studio/.env` mit Projekt-ID) |
| `pnpm typecheck` / `pnpm lint` / `pnpm test` / `pnpm build` | Prüfungen |
| `pnpm deploy:staging` / `pnpm deploy:site:staging` | Infrastruktur / Seite + Studio deployen |
| `pnpm secret /bedi/sanity/token` | Secret in SSM setzen |
| `pnpm seed` | Startinhalte in ein leeres Dataset schreiben |
| `pnpm qr` | QR-Code + A6-Aufsteller nach `print/` |
| `pnpm budget` | Kostenalarm (einmalig) |

## Arbeitsregeln

- Ablauf je Ticket: umsetzen → `pnpm typecheck` + `pnpm lint` + `pnpm test` + `pnpm build` grün → im Browser prüfen (mobil + Desktop, `pnpm dev:mock`) → Status ✅ in `docs/TICKETS.md`.
- Vor Statusberichten den echten Stand prüfen (Sanity-Inhalte, Staging/Production, Git), nicht nur `TICKETS.md` glauben.
- Vor jeder neuen Komponente `docs/COMPONENTS.md` prüfen und vorhandene wiederverwenden; neue dort eintragen.
- Nach außen wirkende oder schwer umkehrbare Schritte (DNS, Production-Deploy, Domain, Mails an echte Kunden, Löschen in Sanity) vorher bestätigen lassen.
- Kommentare im Code knapp, auf Englisch, das „Warum“ statt des „Was“. Commits auf Englisch, kurz und sachlich. Feature-Branches + PR nach `main`.
- Nutzertexte und Doku auf Deutsch, einfache Sprache, Kunden werden geduzt.
- Next.js 16: vor dem Schreiben von Next-Code die passende Anleitung unter `node_modules/next/dist/docs/` lesen.
- `@sanity/icons` v5: Icons nur über Subpfade importieren (`import { UserIcon } from "@sanity/icons/User"`), der Root-Export ist leer.
