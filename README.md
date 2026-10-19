# Fahrgemeinschafts-Planer (carpool-planer)

Online-Tool für Eltern, um Fahrgemeinschaften für die Trainingsfahrten ihrer Kinder zu planen –
gerade wenn mehrere Kinder zur gleichen Zeit zu verschiedenen Trainings müssen.

**Live-Demo:** <https://potschntom.github.io/carpool-planer/>
(wird per GitHub Actions automatisch bei jedem Push auf `main` neu deployt)

## Funktionen

- **Eltern & Kinder verwalten**: mehrere Kinder pro Familie
- **Trainings pflegen**: Wochentag, Start-/Endzeit, Ort
- **Anmeldungen**: pro Kind ein oder mehrere Trainings (Checkbox-Matrix)
- **Automatische Fahrer-Zuteilung**: verteilt Fahrten fair auf die Eltern (Lastenausgleich,
  max. 4 Mitfahrer pro Fahrt, keine Zeitüberschneidungen pro Fahrer)
- **Konflikt-Erkennung**:
  - Kind ist zur selben Zeit in zwei Trainings gebucht
  - Fahrer überschneidet sich zeitlich mit einer anderen Fahrt
- **Daten bleiben lokal**: alles wird im Browser (localStorage) gespeichert – kein Server,
  keine Anmeldung, kein Datentransfer

## Tech-Stack

- Next.js 14 (App Router, TypeScript) – statischer Export
- Tailwind CSS v4
- Läuft komplett client-seitig → Deployment auf GitHub Pages

## Entwicklung

```bash
npm install
npm run dev     # http://localhost:3000
```

Für den statischen Production-Build (wie ihn GitHub Pages ausliefert):

```bash
NODE_ENV=production npm run build   # Export nach ./out
```

## Deployment (GitHub Pages)

Der Workflow in `.github/workflows/deploy.yml` baut bei jedem Push auf `main` die App
und veröffentlicht sie auf GitHub Pages. Einmalig in den Repo-Einstellungen aktivieren:
**Settings → Pages → Source: GitHub Actions**.

## Nächste Schritte (Vorschläge)

- Geteilte Daten mehrerer Eltern (Datenbank + Login)
- Wiederkehrende Wochenplanung + Ausnahmen („ich kann am 24. nicht")
- Benachrichtigungen (E-Mail/Messenger) bei Planänderung
- Kalender-Export (ICS)
