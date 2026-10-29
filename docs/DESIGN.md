# Design

Ruhig, warm, schnell. Eine Spalte (max. 36 rem), Handy zuerst; Desktop zeigt dieselbe Spalte zentriert.
Branding des Salons steht noch aus (BD-604) – alle Werte sind Tokens in `src/app/globals.css`.

## Tokens

| Token | Wert | Verwendung |
|---|---|---|
| `paper` | #f7f4ef | Seitenhintergrund |
| `card` | #ffffff | Karten, Eingabefelder |
| `line` / `line-strong` | #e3ddd2 / #c9c0b1 | Trennlinien / Feldränder |
| `ink` | #1d1b18 | Text, gewählter Tag |
| `muted` | #625b51 | Nebentext (6,2 : 1 auf paper) |
| `accent` / `accent-hover` / `accent-soft` | #1f4a3d / #173a30 / #e4ece7 | Hauptbutton, Links, Hinweise (Weiß auf accent 9,8 : 1) |
| `success` / `error` (+ `-soft`) | #1f7a42 / #b3261e | Meldungen grün/rot |
| Schrift | Geist Variable, selbst gehostet | `--font-sans` |
| Größen | display, title, lead, body, small, meta | `text-*` |
| Radien | sm 10, md 14, lg 20, pill | `rounded-*` |
| Schatten | card, raised | `shadow-*` |
| Touch | 3 rem | `min-h-touch` |

## Barrierefreiheit

- Alle Ziele ≥ 48 px; Fokusrahmen 3 px accent auf allem Fokussierbaren; „Zum Inhalt springen“.
- Neuer Schritt → Fokus auf dessen Überschrift (Tastatur + Screenreader setzen dort fort).
- Datumsleiste als `radiogroup` mit Pfeiltasten; deaktivierte Tage mit Grund im `aria-label`.
- Fehler: `role="alert"`, Felder mit `aria-invalid` + `aria-describedby`.
- `prefers-reduced-motion` schaltet Animationen und Smooth-Scroll ab.
- Kunden werden geduzt, Texte kurz und konkret.
