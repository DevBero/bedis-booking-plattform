# Produkt-Brief

## In einem Satz
Internes Werkzeug: Kunden scannen im Salon einen QR-Code, landen auf einer schlanken Buchungsseite und buchen einen
freien Termin für eine Leistung. Der Inhaber trägt in Sanity ein, wann er schneidet („Montag 18–22 Uhr“), und sieht
unter `/admin` alle Buchungen. Keine Mails, keine Online-Absage, kein Impressum, nicht in Suchmaschinen (noindex).

## Rollen und Abläufe

**Kunde (öffentlich, Handy zuerst)**
1. QR-Code im Laden → `https://<domain>/?src=qr` (auch direkt, z. B. aus Google-Profil oder Instagram).
2. Leistung wählen (Name, Dauer, Preis) → Tag wählen → freie Uhrzeit wählen.
   Angeboten werden nur Tage mit Schneidezeit.
3. Name + Telefon (Pflicht), Notiz optional → „Verbindlich buchen“.
4. Bestätigung mit Zusammenfassung, „Zum Kalender hinzufügen“ (`.ics`) und dem Hinweis, telefonisch abzusagen.

**Inhaber (`/admin`, Sanity Studio)**
- Login mit Sanity-Konto (Google möglich), keine eigene Benutzerverwaltung.
- Trägt Schneidezeiten ein (Tag + von/bis); nur darin ist online etwas buchbar.
- Pflegt Leistungen und Einstellungen (Vorlauf, Horizont, Puffer, Raster, Online-Buchung an/aus, Hinweistext).
- Sieht Termine: Heute, Morgen, Diese Woche, Kommende, Vergangene, Storniert, dazu ein Wochen-Kalender mit der
  Zahl der Termine je Tag.
- Trägt Termine selbst ein (Telefon, Laufkundschaft); sie belegen Slots wie Online-Buchungen.
- Storniert Termine (Kunde hat angerufen) oder markiert „nicht erschienen“.

## Abgrenzung

| v1 (dieses Projekt) | v2 / später |
|---|---|
| Ein Stuhl / eine Person | Mehrere Mitarbeiter, Buchung pro Person oder „egal wer“ (Feld `staff` ist schon vorgesehen) |
| Nur Deutsch | Weitere Sprachen |
| Bestätigung auf der Seite + `.ics`, Absage nur telefonisch | – |
| Keine Cookies, kein Tracking | Analytics nur mit Einwilligung |
| – | SMS-Erinnerung |

## Annahmen (bis zur Klärung mit dem Inhaber, siehe `TICKET.md`)

Die offenen Fragen aus dem Briefing wurden nicht vorab gestellt; der Code arbeitet mit diesen Annahmen, die alle an
einer Stelle änderbar sind:

| Thema | Annahme | Wo ändern |
|---|---|---|
| Salonname | wird nirgends angezeigt (Seite, Kalendereintrag, Druck sagen nur „Terminbuchung“ / „Friseurtermin“) | – |
| Domain | `bedis-hairsalon.be-you.pro` | `infra/config.ts` |
| Ticket-Kürzel | `BD` | – |
| Branding | neutral: warmes Papierweiß, Tannengrün, Geist | `src/app/globals.css` (Tokens) |
| Pflichtangaben | Name + Telefon, Notiz optional | – |
| Aufbewahrung | 30 Tage nach dem Termin | `infra/config.ts` `RETENTION_DAYS` |
| Vorlauf / Horizont / Raster | 2 h / 28 Tage / 15 min | Studio → Einstellungen |
