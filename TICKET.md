# Was du per Hand erledigen musst

Der Code ist komplett: Buchungsseite, Absage-Seite, Rechtstexte (Entwürfe), Sanity Studio mit Kalender, API
(Lambda) mit Slot-Logik, Doppelbuchungs-Schutz, Bot-Schutz und Mails, CDK-Infrastruktur, Deploy-Scripts,
GitHub Actions, QR-Aufsteller. Lokal ausprobieren: `pnpm install && pnpm dev:mock`.

Was fehlt, sind Konten, Domain, Zugangsdaten und Inhalte – das kann nur jemand mit Zugriff erledigen. Reihenfolge
einhalten; IDs verweisen auf [`docs/TICKETS.md`](docs/TICKETS.md), Details stehen in [`docs/HOSTING.md`](docs/HOSTING.md).

## 0. Mit dem Inhaber klären (BD-104) – zuerst

- [ ] Salonname, Adresse, Telefon, Inhaber (fürs Impressum), Handwerkskammer, USt-IdNr.
- [ ] Wunschdomain; schon vorhanden (wo, mit Mailpostfach?) oder neu
- [ ] Leistungen mit Dauer und Preis
- [ ] Öffnungszeiten, Pausen; Vorlauf (Standard 2 h), Horizont (28 Tage)
- [ ] E-Mail-Adresse für Buchungs-Benachrichtigungen
- [ ] Aufbewahrungsfrist (Standard 30 Tage nach Termin) und Absagefrist (Standard 12 h)
- [ ] Logo/Farben vorhanden? Weitere Sprachen? Google-Unternehmensprofil?
- [ ] Wirklich nur eine Person in v1?

Danach eintragen: `src/lib/salon.ts` (Impressum, Suchmaschinen), später im Studio → Einstellungen (Buchungsseite).
Falls Defaults abweichen: `RETENTION_DAYS` in `infra/config.ts` + Text in `src/app/datenschutz/page.tsx`.

## 1. AWS-Konto (BD-200)

- [ ] Mitgliedskonto in der Organisation anlegen, Profil `bedi` in `~/.aws/config`
- [ ] `! aws login --profile bedi --region eu-north-1`, dann `aws sts get-caller-identity --profile bedi`
- [ ] `cp .env.example .env` (Profil steht schon drin)

## 2. Domain + Zertifikate (BD-201, BD-202)

- [ ] Domain in Route 53 registrieren oder Hosted Zone anlegen + Nameserver umstellen (bestehende MX/SPF übernehmen!)
- [ ] `infra/config.ts` → `ZONE_NAME = "<domain>"`
- [ ] Zwei Zertifikate in **us-east-1** anfordern (HOSTING §3), DNS-Validierung in Route 53, ARNs in `infra/config.ts`

## 3. Sanity (BD-301, BD-303, BD-304, BD-305, BD-307, BD-605)

- [ ] Projekt auf sanity.io/manage anlegen → ID in `infra/config.ts` (`SANITY_PROJECT_ID`) und `studio/.env`
- [ ] Datasets `staging` + `production` als **private** anlegen
- [ ] CORS mit Credentials: `https://<domain>`, `https://staging.<domain>`, `http://localhost:3333`
- [ ] Editor-Token erzeugen → `pnpm secret /bedi/sanity/token`
- [ ] `SANITY_PROJECT_ID=… SANITY_DATASET=staging SANITY_TOKEN=… pnpm seed` (dann `production`)
- [ ] Inhaber als Member einladen
- [ ] DPA mit Sanity abschließen, Speicherort in `src/app/datenschutz/page.tsx` eintragen

## 4. Erster Deploy (BD-204, BD-306, BD-407)

- [ ] `pnpm bootstrap`
- [ ] `pnpm deploy:staging` (legt auch SES-Identity, DMARC und GitHub-OIDC-Rolle an)
- [ ] `pnpm deploy:site:staging`
- [ ] `https://staging.<domain>/admin/` öffnen, einloggen, Browser-Konsole auf CSP-Fehler prüfen
- [ ] Liegt das Postfach des Inhabers nicht auf der Domain: Adresse in SES verifizieren (HOSTING §8)
- [ ] Studio → Einstellungen: Salon-Daten und Benachrichtigungs-Mail eintragen (bis dahin gehen Mails an berat.mov@gmail.com)
- [ ] `pnpm budget` (Kostenalarm 10 USD)

## 5. GitHub (BD-205)

- [ ] Hinweis: Das Repo `DevBero/bedis-booking-plattform` ist **öffentlich**. Es enthält keine Secrets, aber
      Kundennamen o. Ä. dürfen nie ins Repo. Ggf. auf privat stellen.
- [ ] Environments `staging` und `production` (production mit Required reviewers), je Variable
      `AWS_DEPLOY_ROLE_ARN` = Output `DeployRoleArn` des Stacks `Bedi-GitHub`
- [ ] Repository-Variable `SITE_CHECK_URL = https://staging.<domain>`

## 6. Testen (BD-505, BD-606)

- [ ] Online buchen → Termin im Studio, Mail beim Inhaber
- [ ] Im Studio Termin + Blockzeit eintragen → online nicht mehr buchbar; stornieren → wieder frei
- [ ] Zwei Browser, derselbe Slot gleichzeitig → einer bekommt „gerade vergeben“
- [ ] Am Handy durchklicken; Lighthouse mobil ≥ 95
- [ ] `pnpm site-check https://staging.<domain>`

## 7. Launch (BD-602, BD-607, BD-608, BD-609)

- [ ] Impressum + Datenschutz: Platzhalter `[…]` füllen und rechtlich prüfen lassen
- [ ] Production deployen: Actions → Deploy → production (oder `pnpm deploy:production && pnpm deploy:site:production`)
- [ ] `SITE_CHECK_URL` auf die Live-Domain umstellen
- [ ] `pnpm qr` → `print/aufsteller-a6.pdf` drucken, im Salon aufstellen
- [ ] Inhaber mit `docs/STUDIO.md` einweisen (Studio als Lesezeichen auf dem Handy)

## 8. Danach (BD-701, BD-702)

- [ ] SES-Production-Access beantragen (Text in HOSTING §9) → `customerMail: true` in `infra/config.ts` → deployen.
      Dann bekommen Kunden mit E-Mail eine Bestätigung mit Absage-Link.
- [ ] Google-Unternehmensprofil: Buchungslink `https://<domain>/?src=google` setzen, Profil-URL in `src/lib/salon.ts`
