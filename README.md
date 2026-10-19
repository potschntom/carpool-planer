# Fahrgemeinschafts-Planer (carpool-planer)

Online-Tool für Eltern, um Fahrgemeinschaften für die Trainingsfahrten ihrer Kinder zu planen –
gerade wenn mehrere Kinder zur gleichen Zeit zu verschiedenen Trainings müssen.

## Funktionen (MVP)

- **Eltern & Kinder verwalten**: mehrere Kinder pro Familie
- **Trainings pflegen**: Wochentag, Start-/Endzeit, Ort
- **Anmeldungen**: pro Kind ein oder mehrere Trainings (Checkbox-Matrix)
- **Automatische Fahrer-Zuteilung**: verteilt Fahrten auf Eltern mit Kapazitäts- und Fairness-Logik
- **Konflikt-Erkennung**:
  - Kind ist zur selben Zeit in zwei Trainings gebucht
  - Fahrer überschneidet sich zeitlich mit einer anderen Fahrt

## Tech-Stack

- Next.js 14 (App Router, TypeScript)
- Tailwind CSS v4
- In-Memory-Store mit Seed-Daten (später durch Datenbank ersetzbar)

## Entwicklung

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
npm start
```

## API (Auszug)

- `GET /api/store` – kompletter Datenstand
- `POST /api/parent|child|training` – anlegen, `DELETE ...?id=` – löschen
- `POST /api/enrollment` / `DELETE /api/enrollment?childId=&trainingId=` – Anmeldungen
- `GET /api/plan` – aktueller Fahrplan + Konflikte
- `POST /api/plan {"action":"auto"}` – automatische Fahrer-Zuteilung

## Nächste Schritte (Vorschläge)

- Persistenz (Datenbank) statt In-Memory
- Authentifizierung / Multi-Family-Tenants
- Wiederkehrende Wochenplanung + Ausnahmen (z. B. „ich kann am 24. nicht")
- Benachrichtigungen (E-Mail/Messenger) bei Planänderung
- Kalender-Export (ICS)
