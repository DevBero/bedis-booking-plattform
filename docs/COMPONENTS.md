# Komponenten-Register

Vor jeder neuen Komponente hier nachsehen. Neue Komponenten hier eintragen.

| Komponente | Datei | Zweck |
|---|---|---|
| `Button`, `buttonStyles` | `src/components/ui/button.tsx` | Buttons (primary, secondary, ghost; full width); `buttonStyles` für Links im Button-Look |
| `Input`, `Textarea` | `src/components/ui/field.tsx` | Formularfelder mit Label, Hinweis, Fehler, „(optional)“ |
| `Notice` | `src/components/ui/notice.tsx` | Meldung info / success (grün) / error (rot) |
| `Spinner` | `src/components/ui/spinner.tsx` | Ladezustand mit Text |
| `Container` | `src/components/ui/container.tsx` | Die eine Inhaltsspalte |
| `SiteFooter` | `src/components/layout/site-footer.tsx` | Footer mit Impressum/Datenschutz |
| `LegalPage` | `src/components/layout/legal-page.tsx` | Rahmen für Rechtstexte |
| `BookingFlow` | `src/components/booking/booking-flow.tsx` | Gesamter Buchungsablauf, lädt Config und Slots |
| `Step` | `src/components/booking/step.tsx` | Nummerierter Schritt, setzt Fokus beim Erscheinen |
| `ServiceList` | `src/components/booking/service-list.tsx` | Leistungen als Karten |
| `ChoiceSummary` | `src/components/booking/choice-summary.tsx` | Getroffene Wahl + „Ändern“ |
| `DateStrip` | `src/components/booking/date-strip.tsx` | Horizontale Tagesleiste |
| `TimeGrid` | `src/components/booking/time-grid.tsx` | Freie Uhrzeiten nach Tageszeit gruppiert |
| `CustomerForm` | `src/components/booking/customer-form.tsx` | Name/Telefon/E-Mail/Notiz + Honeypot |
| `Confirmation` | `src/components/booking/confirmation.tsx` | Bestätigung + `.ics` |
| `CancelFlow` | `src/components/cancel/cancel-flow.tsx` | Absage per Link |
| `CalendarTool` (Studio) | `studio/components/CalendarTool.tsx` | Wochenansicht im Studio |
