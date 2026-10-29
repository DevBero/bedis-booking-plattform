# Produkt-Brief

## In einem Satz
Kunden scannen im Salon einen QR-Code, landen auf einer schlanken Buchungsseite und buchen einen freien Termin für
eine Leistung. Der Inhaber pflegt Leistungen, Öffnungszeiten und freie Tage in Sanity, trägt dort auch telefonische
Termine ein und sieht unter `/admin` alle Buchungen.

## Rollen und Abläufe

**Kunde (öffentlich, Handy zuerst)**
1. QR-Code im Laden → `https://<domain>/?src=qr` (auch direkt, z. B. aus Google-Profil oder Instagram).
2. Leistung wählen (Name, Dauer, Preis) → Tag wählen → freie Uhrzeit wählen.
3. Name + Telefon (Pflicht), E-Mail und Notiz optional → „Verbindlich buchen“.
4. Bestätigung mit Zusammenfassung und „Zum Kalender hinzufügen“ (`.ics`). Mit E-Mail und SES-Production-Access
   zusätzlich Bestätigungsmail mit Absage-Link (`/storno/?t=…`).

**Inhaber (`/admin`, Sanity Studio)**
- Login mit Sanity-Konto (Google möglich), keine eigene Benutzerverwaltung.
- Pflegt Leistungen, Öffnungszeiten je Wochentag (mehrere Zeitfenster = Mittagspause), geschlossene Tage,
  Einstellungen (Vorlauf, Horizont, Puffer, Raster, Absagefrist, Online-Buchung an/aus, Hinweistext).
- Sieht Termine: Heute, Morgen, Diese Woche, Kommende, Vergangene, Storniert, dazu ein Wochen-Kalender.
- Trägt Termine selbst ein (Telefon, Laufkundschaft) und blockt Zeiten; beides belegt Slots wie Online-Buchungen.
- Storniert Termine oder markiert „nicht erschienen“.
- Bekommt pro Online-Buchung (und Online-Absage) eine E-Mail.

## Abgrenzung

| v1 (dieses Projekt) | v2 / später |
|---|---|
| Ein Stuhl / eine Person | Mehrere Mitarbeiter, Buchung pro Person oder „egal wer“ (Feld `staff` ist schon vorgesehen) |
| Nur Deutsch | Weitere Sprachen |
| Bestätigung auf der Seite + `.ics` | Bestätigungsmail mit Absage-Link, sobald SES-Production-Access da ist (Code fertig, Schalter `customerMail`) |
| Keine Cookies, kein Tracking | Analytics nur mit Einwilligung |
| – | SMS-Erinnerung |

## Annahmen (bis zur Klärung mit dem Inhaber, siehe `TICKET.md`)

Die offenen Fragen aus dem Briefing wurden nicht vorab gestellt; der Code arbeitet mit diesen Annahmen, die alle an
einer Stelle änderbar sind:

| Thema | Annahme | Wo ändern |
|---|---|---|
| Salonname, Adresse, Inhaber | Platzhalter „Salon Bedi“, `[…]` | `src/lib/salon.ts` (Impressum, JSON-LD), Studio → Einstellungen (Buchungsseite) |
| Domain | noch offen | `infra/config.ts` |
| Ticket-Kürzel | `BD` | – |
| Branding | neutral: warmes Papierweiß, Tannengrün, Geist | `src/app/globals.css` (Tokens) |
| Pflichtangaben | Name + Telefon, E-Mail optional | – |
| Aufbewahrung | 30 Tage nach dem Termin | `infra/config.ts` `RETENTION_DAYS` + Datenschutzerklärung |
| Absagefrist | 12 Stunden | Studio → Einstellungen |
| Vorlauf / Horizont / Raster | 2 h / 28 Tage / 15 min | Studio → Einstellungen |
| Benachrichtigung | an die Adresse aus Studio → Einstellungen, sonst an den Entwickler | Studio |
