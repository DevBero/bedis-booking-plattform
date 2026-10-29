# Hosting und Deploy

Alles in **eu-north-1 (Stockholm)**; die Organisation erlaubt regionale Dienste per SCP nur dort. Globale Dienste
(IAM, Route 53, CloudFront, ACM in us-east-1 per CLI, Budgets) funktionieren.

## Schritt 1 – AWS-Konto und Login

1. In der Organisation ein neues Mitgliedskonto anlegen (z. B. `bedi`), damit Kosten und Rechte getrennt sind.
2. Profil in `~/.aws/config` anlegen (Rolle `OrganizationAccountAccessRole` oder SSO-Login wie im Referenzprojekt).
3. `aws login --profile bedi --region eu-north-1` (hält bis 12 h). Prüfen: `aws sts get-caller-identity --profile bedi`.
   Kein Block für das Profil in `~/.aws/credentials`.
4. `.env` aus `.env.example` anlegen, `AWS_PROFILE=bedi`.

## Schritt 2 – Domain und Hosted Zone

- Neu: Route 53 → Domains registrieren (legt die Hosted Zone an).
- Vorhanden: Hosted Zone anlegen, Nameserver beim bisherigen Anbieter auf die vier Route-53-Server ändern.
  Bestehende Mail-Records (MX, SPF) vorher in die Zone übernehmen!
- Domain in `infra/config.ts` → `ZONE_NAME`.

## Schritt 3 – Zertifikate (us-east-1, per CLI)

```bash
aws acm request-certificate --region us-east-1 --validation-method DNS \
  --domain-name <domain> --subject-alternative-names www.<domain>
aws acm request-certificate --region us-east-1 --validation-method DNS --domain-name staging.<domain>
# CNAME zur Validierung anzeigen und in Route 53 eintragen (Konsole: "Create records in Route 53")
aws acm describe-certificate --region us-east-1 --certificate-arn <arn> --query "Certificate.DomainValidationOptions"
```
ARNs in `infra/config.ts` (`ENVIRONMENTS.*.certificateArn`).

## Schritt 4 – CDK

```bash
pnpm bootstrap            # einmalig, eu-north-1
pnpm deploy:staging       # Bedi-Site-staging, Bedi-Shared, Bedi-GitHub
pnpm budget               # Kostenalarm 10 USD/Monat (einmalig)
```

| Stack | Inhalt |
|---|---|
| `Bedi-Site-<env>` | S3 (privat), CloudFront (OAC, Router-Function, Security-Header, eigene CSP für `/admin/*`), Lambda „Api“ mit Function URL (AWS_IAM) unter `/api/*`, DynamoDB, tägliche Aufräum-Regel, A/AAAA-Records |
| `Bedi-Shared` | SES-Identity der Domain (DKIM automatisch), DMARC `p=none` |
| `Bedi-GitHub` | OIDC-Provider + Rolle `github-deploy` (Trust: `repo:DevBero@125164459/bedis-booking-plattform@1438327248`) |

## Schritt 5 – GitHub Actions

1. Output `DeployRoleArn` von `Bedi-GitHub` kopieren.
2. GitHub → Settings → Environments: `staging` und `production` anlegen (production mit „Required reviewers“),
   je Variable `AWS_DEPLOY_ROLE_ARN`.
3. Repository-Variable `SITE_CHECK_URL` = `https://staging.<domain>` (nach Launch: Live-Domain).
4. Push auf `main` → Staging. Production: Actions → Deploy → Run workflow → production.

Ohne `AWS_DEPLOY_ROLE_ARN` überspringt der Deploy-Job sich selbst (kein roter Build).

## Schritt 6 – Sanity

1. sanity.io/manage → neues Projekt (Free-Plan: private Datasets prüfen). Projekt-ID in `infra/config.ts` und
   `studio/.env` (`SANITY_STUDIO_PROJECT_ID`).
2. Datasets `staging` und `production` anlegen, beide **private**:
   `cd studio && npx sanity dataset create staging --visibility private` (ebenso `production`; das Standard-Dataset ggf. löschen).
3. API → CORS Origins (je **Allow credentials**): `https://<domain>`, `https://staging.<domain>`, `http://localhost:3333`.
4. API → Tokens → „Editor“-Token `lambda` → `pnpm secret /bedi/sanity/token` (ein Token für beide Datasets).
5. Startinhalte: `SANITY_DATASET=staging SANITY_TOKEN=… pnpm seed` (danach auch für `production`).
6. Inhaber unter Members einladen (Editor oder Administrator).
7. DPA mit Sanity abschließen; Speicherort der Daten in der Datenschutzerklärung nennen.

## Schritt 7 – Seite deployen

```bash
pnpm deploy:site:staging      # next build + sanity build (Dataset staging) → S3 → Invalidation
pnpm deploy:site:production
```
Danach `/admin/` öffnen, mit Sanity-Konto einloggen, Browser-Konsole auf CSP-Fehler prüfen; falls nötig die Studio-CSP
in `infra/lib/site-stack.ts` (`studioCsp`) gezielt erweitern.

## Schritt 8 – SES

- Sandbox: Mails nur an verifizierte Identitäten. Domain ist verifiziert (Shared-Stack). Liegt das Postfach des
  Inhabers woanders (z. B. Gmail), diese Adresse verifizieren:
  `aws sesv2 create-email-identity --region eu-north-1 --email-identity <adresse>` und Link in der Mail bestätigen.
- Absender `noreply@<domain>`, Reply-To bei Inhaber-Mails = Kunde.

## Schritt 9 – SES-Production-Access (Kundenbestätigung)

Konsole SES (eu-north-1) → Account dashboard → Request production access. Typ „Transactional“, Begründung:
„Terminbestätigungen für Online-Buchungen eines Friseursalons, nur an Kunden, die ihre Adresse beim Buchen angeben;
keine Werbung; Absage-Link in jeder Mail; Bounces/Beschwerden werden über SES überwacht.“
Danach in `infra/config.ts` `customerMail: true` (je Umgebung) und deployen.

## Secrets

| Name | Inhalt |
|---|---|
| `/bedi/sanity/token` | Sanity-Editor-Token für die Lambda |

## Checkliste Launch

1. Staging: Testbuchung online, Termin im Studio sichtbar, Mail an Inhaber da.
2. Im Studio Termin anlegen → Slot online nicht mehr buchbar. Blockzeit → ebenso. Storno im Studio → wieder frei.
3. Zwei Browser gleichzeitig auf denselben Slot → einer bekommt „gerade vergeben“.
4. Production deployen, `pnpm site-check https://<domain>`, Lighthouse mobil ≥ 95.
5. `pnpm qr` → drucken.
