# Salon-Terminbuchung

Online-Terminbuchung für einen Friseursalon: QR-Code im Laden → Leistung wählen → freie Uhrzeit → buchen.
Der Inhaber trägt seine Schneidezeiten ein und sieht die Termine im Sanity Studio unter `/admin`.

```bash
pnpm install
pnpm dev:mock      # http://localhost:3000 mit Beispieldaten
pnpm test          # Slot-Logik inkl. Sommerzeit
```

Dokumentation: [`CLAUDE.md`](CLAUDE.md), [`docs/`](docs/), offene Handarbeit: [`TICKET.md`](TICKET.md).
