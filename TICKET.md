# Was du per Hand erledigen musst, um live zu gehen

Ziel: `https://bedis-hairsalon.be-you.pro`, Studio unter `/admin`, gehostet im AWS-Konto **beyou**, nur eine
Umgebung. Internes Werkzeug: keine Mails, keine Online-Absage, kein Impressum, nicht in Suchmaschinen (noindex).
Im Code schon gesetzt: Domain, Konto und Sanity-Projekt `zpfep43i` in `infra/config.ts`. Lokal ausprobieren:
`pnpm dev:mock`. IDs → [`docs/TICKETS.md`](docs/TICKETS.md), Details → [`docs/HOSTING.md`](docs/HOSTING.md).

## 0. Mit dem Inhaber klären (BD-104)

- [ ] Dauer und Preise für Herren Haarschnitt, Haare + Bart, Nur Bart (aktuell 30 Min/25 €, 45 Min/35 €, 15 Min/12 €)

## 1. AWS (Konto beyou) – HOSTING §1–3

- [ ] `! aws login --profile beyou --region eu-north-1` (Session läuft ab), `cp .env.example .env`
- [ ] Zertifikat in **us-east-1** für `bedis-hairsalon.be-you.pro` anfordern, DNS-Validierung in der Zone
      be-you.pro, ARN in `infra/config.ts` (`certificateArn`). Kann ich auch für dich machen.

## 2. Sanity – HOSTING §6

- [ ] Dataset `production` auf privat stellen: `cd studio && npx sanity dataset visibility set production private`
- [ ] CORS mit Credentials: `https://bedis-hairsalon.be-you.pro`, `http://localhost:3333`
- [ ] Editor-Token → `pnpm secret /bedi/sanity/token`
- [ ] `SANITY_PROJECT_ID=zpfep43i SANITY_TOKEN=… pnpm seed`
- [ ] Inhaber als Member einladen, DPA mit Sanity abschließen

## 3. Deploy (BD-204, BD-306)

- [ ] `pnpm diff` ansehen, dann `pnpm deploy` und `pnpm deploy:site`
- [ ] `https://bedis-hairsalon.be-you.pro/admin/` öffnen, einloggen, Browser-Konsole auf CSP-Fehler prüfen
- [ ] Optional `pnpm budget` (vorher Tag `Project` als Cost allocation tag aktivieren)

## 4. Testen auf der Live-Domain (BD-505, BD-606) – bevor der QR-Code steht

- [ ] Im Studio eine Schneidezeit anlegen → Tag erscheint online; online buchen → Termin im Studio-Kalender
- [ ] Im Studio Termin eintragen → online nicht mehr buchbar; stornieren → wieder frei
- [ ] Zwei Browser, derselbe Slot gleichzeitig → einer bekommt „gerade vergeben“
- [ ] Am Handy durchklicken, `pnpm site-check https://bedis-hairsalon.be-you.pro`; Testbuchungen danach im Studio löschen

## 5. Launch (BD-608, BD-609)

- [ ] `pnpm qr` → `print/aufsteller-a6.pdf` drucken, im Salon aufstellen
- [ ] Inhaber mit `docs/STUDIO.md` einweisen (Studio als Lesezeichen auf dem Handy)

## Später

- [ ] Optional GitHub-Deploy: Environment `production` + `AWS_DEPLOY_ROLE_ARN` (BD-205); das Repo ist **öffentlich**, ggf. auf privat stellen
