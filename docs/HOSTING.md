# Hosting und Deploy

Alles in **eu-north-1 (Stockholm)**; die Organisation erlaubt regionale Dienste per SCP nur dort. Globale Dienste
(IAM, Route 53, CloudFront, ACM in us-east-1 per CLI, Budgets) funktionieren.

## Schritt 1 – AWS-Konto und Login

Gehostet wird im Konto **beyou** (945777367692), neben der be-you.pro-Website und weiteren Kundenprojekten. Es gibt
nur eine Umgebung: Production unter `https://bedis-hairsalon.be-you.pro`. Alle Ressourcen heißen `Bedi-*`/`bedi-*`
und tragen das Tag `Project=bedi`; die anderen Stacks im Konto (`BeyouWeb-*`, `ChezMandarin-*`) nicht anfassen.

1. `aws login --profile beyou --region eu-north-1`, prüfen: `aws sts get-caller-identity --profile beyou`.
2. `.env` aus `.env.example` anlegen (`AWS_PROFILE=beyou`).
3. CDK-Bootstrap (`CDKToolkit`) gibt es im Konto schon.

## Schritt 2 – Domain

`be-you.pro` liegt als Hosted Zone im selben Konto. CDK legt dort nur A/AAAA für `bedis-hairsalon` an; alles andere
in der Zone (MX, SPF, DMARC, SES von `be-you.pro`) bleibt unberührt. Mails verschickt dieses Projekt nicht.

## Schritt 3 – Zertifikat (us-east-1, per CLI)

```bash
aws acm request-certificate --profile beyou --region us-east-1 --validation-method DNS --domain-name bedis-hairsalon.be-you.pro
# CNAME zur Validierung anzeigen und in der Zone be-you.pro eintragen (Konsole: "Create records in Route 53")
aws acm describe-certificate --profile beyou --region us-east-1 --certificate-arn <arn> --query "Certificate.DomainValidationOptions"
```
ARN in `infra/config.ts` (`ENVIRONMENTS.production.certificateArn`).

## Schritt 4 – CDK

```bash
pnpm diff                 # vorher ansehen, was sich ändert
pnpm deploy               # Bedi-Site-production, Bedi-GitHub
pnpm budget               # Kostenalarm 10 USD/Monat (einmalig), zählt nur Tag Project=bedi
```
Für `pnpm budget` das Tag `Project` einmal unter Billing → Cost allocation tags aktivieren.

| Stack | Inhalt |
|---|---|
| `Bedi-Site-production` | S3 (privat), CloudFront (OAC, Router-Function, Security-Header + `X-Robots-Tag: noindex`, eigene CSP für `/admin/*`), Lambda „Api“ mit Function URL (AWS_IAM) unter `/api/*`, DynamoDB, tägliche Aufräum-Regel, A/AAAA-Records |
| `Bedi-GitHub` | Rolle `bedi-github-deploy` (Trust: `repo:DevBero@125164459/bedis-booking-plattform@1438327248`); nutzt den vorhandenen GitHub-OIDC-Provider des Kontos |

## Schritt 5 – GitHub Actions (optional)

1. Output `DeployRoleArn` von `Bedi-GitHub` kopieren.
2. GitHub → Settings → Environments: `production` anlegen (mit „Required reviewers“), Variable `AWS_DEPLOY_ROLE_ARN`.
3. Repository-Variable `SITE_CHECK_URL` = `https://bedis-hairsalon.be-you.pro`.
4. Deploy nur von Hand: Actions → Deploy → Run workflow (ohne Staging gibt es keinen Auto-Deploy bei Push).

Ohne `AWS_DEPLOY_ROLE_ARN` überspringt der Deploy-Job sich selbst (kein roter Build).

## Schritt 6 – Sanity

1. Projekt „Bedis-hairsalon“ (ID `zpfep43i`) gibt es schon; die ID steht in `infra/config.ts` und `studio/.env`.
2. Nur das Dataset `production`. Es ist gerade **öffentlich** → `cd studio && npx sanity dataset visibility set production private`.
3. API → CORS Origins (je **Allow credentials**): `https://bedis-hairsalon.be-you.pro`, `http://localhost:3333`.
4. API → Tokens → „Editor“-Token `lambda` → `pnpm secret /bedi/sanity/token`.
5. Startinhalte (Einstellungen, Leistungen): `SANITY_TOKEN=… pnpm seed`. Schneidezeiten trägt der Inhaber selbst ein.
6. Inhaber unter Members einladen (Editor oder Administrator).
7. DPA mit Sanity abschließen.

## Schritt 7 – Seite deployen

```bash
pnpm deploy:site      # next build + sanity build → S3 → Invalidation
```
Danach `/admin/` öffnen, mit Sanity-Konto einloggen, Browser-Konsole auf CSP-Fehler prüfen; falls nötig die Studio-CSP
in `infra/lib/site-stack.ts` (`studioCsp`) gezielt erweitern.

## Secrets

| Name | Inhalt |
|---|---|
| `/bedi/sanity/token` | Sanity-Editor-Token für die Lambda |

## Checkliste Launch

Ohne Staging wird direkt auf der Live-Domain getestet, bevor der QR-Code im Salon steht. Testbuchungen danach im
Studio löschen.

1. Im Studio eine Schneidezeit anlegen → der Tag erscheint online. Testbuchung → Termin im Studio-Kalender sichtbar.
2. Im Studio Termin anlegen → Slot online nicht mehr buchbar. Storno im Studio → wieder frei.
3. Zwei Browser gleichzeitig auf denselben Slot → einer bekommt „gerade vergeben“.
4. `pnpm site-check https://bedis-hairsalon.be-you.pro` (prüft auch noindex), Lighthouse mobil ≥ 95.
5. `pnpm qr` → drucken.
