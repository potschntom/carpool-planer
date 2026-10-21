# AGENTS.md – Vibe Code Kontext

Dieses Dokument ist der Persistenz-Kontext für Coding-Sessions mit Vibe Code.
**Nach jeder Session:** den Abschnitt „Worklog" um einen Eintrag ergänzen, damit
die nächste Sandbox-Session ohne Rückfragen weitermachen kann.

## Projekt

Fahrgemeinschafts-Planer für Eltern (Kinder zu Trainings/Spielen fahren).
Next.js 14 App Router, TypeScript, Tailwind CSS v4, rein client-seitig,
Daten im localStorage (`lib/useStore.ts`, Storage-Key `carpool-planer-store-v3`).

- Struktur: `app/page.tsx` (gesamte UI), `lib/planner.ts` (Zuteilungslogik:
  `autoAssignTrips`, `findConflicts`, `driverStats`), `lib/types.ts`, `lib/seed.ts`,
  `scripts/smoke.ts` (Konsolen-Smoke-Test der Zuteilung).
- Deployment: GitHub Pages bei Push auf `main` (`.github/workflows/deploy.yml`).
- Checks: `npx tsc --noEmit`; Smoke-Test mit `npx tsx scripts/smoke.ts`.

## Wichtige Logik-Entscheidungen

- `seats` = freie Mitfahrerplätze (Fahrer zählt nicht mit).
- Angebote: Eltern markieren pro Termin/Richtung „Ich kann diese Fahrt machen"
  (`offers`); nur Angebot-Erhaltende kommen als Fahrer infrage.
- Hinfahrten starten am Wohnort des ersten Kindes, Rückfahrten am Veranstaltungsort.
- Must-Driver-Priorisierung und strikte Startort-Zuordnung mit Fehlermeldung.

## Worklog

- 2026-10-19/21 (vor Vibe-Kontextdatei): Datenmodell v2→v3, localStorage-Migration,
  Orte mit Treffpunkt, Spiele (heim/auswärts), Angebote pro Termin, Must-Driver-Prio,
  strikte Startort-Zuordnung, htaccess-Doku für Apache-Hosting.
- 2026-10-21 (Session „Kinder ohne Platz markieren"):
  - Neue Datei `AGENTS.md` (diese Datei) als Session-Kontext für Vibe Code.
  - `app/page.tsx`: Kinder ohne Platz werden jetzt direkt im Termin pro Richtung
    rot markiert („🚫 Ohne Platz: …"), Teilnehmer-Chips färben sich rot, wenn ein
    Kind in einer Richtung keinen Platz hat, und ein prominentes Warnbanner oben
    zeigt alle nicht beförderten Kinder gesammelt (vorher nur kleine Liste am
    Seitenende, die zudem nur nach „Automatisch planen" aktualisiert wurde).
  - Abgeleitet aus den aktuellen `trips` (`missingSpots`), d. h. auch nach
    manuellen Verschiebungen sofort korrekt – ohne erneuten Auto-Plan-Lauf.
- 2026-10-21 (Session „Beispieldaten + Wohnort-Cluster"):
  - `lib/seed.ts` verdreifacht: 12 Elternteile, 18 Kinder, 6 Termine,
    deutlich mehr Teilnahmen und Fahr-Angebote – für realistischere Usability-Tests.
  - `app/page.tsx`: Kinder werden nach Wohnort gruppiert und farbig markiert:
    Kinder-Liste nach Ort geclustert (Orts-Badge + Anzahl), Kinder mit
    Wohnortfarbe; in Terminen gibt es pro Wohnort Zähler-Badges und jeder
    Teilnehmer-Chip hat einen Farb-Punkt seines Wohnorts (Farbskala in
    `LOCATION_COLORS`/`kidColor`/`kidColorBorder`/`kidDot`, max. 8 Farben,
    danach Modulo-Wiederholung).
  - Commits direkt auf `main` deployt (GitHub Pages).
- 2026-10-21 (Session „Mannschaften + neue Orte"):
  - `lib/types.ts`: `Child` hat jetzt optionales `team` (z. B. "U12") –
    Kinder sind normalerweise fix einer Mannschaft zugeordnet.
  - `lib/seed.ts`: Orte umbenannt in Oberndorf, Kirnberg, Texing, Bründl
    (jeweils mit Sportplatz-Treffpunkt); Seed-Kinder haben Teams U10/U12/U14,
    Termine/Anmeldungen/Angebote team-konsistent.
  - `app/page.tsx`: Kind-Formular mit Mannschafts-Feld (Auto-Vervollständigung
    via datalist), Team-Badge in der Kinder-Liste, Team-Kurzinfo am
    Teilnehmer-Chip (Tooltip) und pro-Termine-Buttons, um eine ganze
    Mannschaft mit einem Klick an-/abzuwählen.
  - Commits direkt auf `main` deployt (GitHub Pages).
- 2026-10-21 (Session „Mannschaftsbus"):
  - `lib/types.ts`: `Parent.isBus?: boolean` – der Bus ist ein spezielles
    „Elternteil", dessen Verfügbarkeit pro Termin/Richtung über die
    normalen Angebote geregelt wird.
  - `lib/seed.ts`: Bus `p-bus` („Mannschaftsbus", 8 Plätze, Standort
    Oberndorf, isBus) – ohne Seed-Angebot, also per Default nicht verfügbar.
  - `app/page.tsx`: Bus überall 🚌-markiert und amber-farben hervorgehoben
    (Elternliste, Angebot-Chips inkl. „nicht verfügbar"-Hinweis,
    Fahrtkarten, Statistik); Sitzplatz-Feld erlaubt beim Bus bis 20.
  - Logik: Hinfahrt-Startort-Regel gilt auch für den Bus (fährt ab
    Oberndorf); Rückfahrt ab Veranstaltungsort für alle Fahrer inkl. Bus.
  - Commits direkt auf `main` deployt (GitHub Pages).
- 2026-10-21 (Session „3-Tab-UX“):
  - `app/page.tsx` umstrukturiert: bisherige „Wurstseite“ in 3 Tabs
    aufgeteilt – 📅 Termine & Planung (Default), 👥 Stammdaten
    (Orte/Eltern/Kinder inkl. Bus), 📊 Übersicht (Fahrer-Statistik +
    Unassigned-/Konfliktlisten).
  - Termine sind zugeklappte Karten: Titel/Datum/Ort + Status-Badges
    (👥 Teilnehmerzahl, 🔴 N ohne Platz, ✓ geplant (N Fahrten),
    ⏳ noch nicht geplant); Klick auf die Karte klappt Details auf
    (`openEvents`-State, Löschen-Button nur im aufgeklappten Zustand).
  - Tab-Navigation mit Badge („N 🔴“ im Plan-Tab, wenn Kinder ohne Platz).
  - Rotes Warnbanner bleibt global unter dem Header sichtbar.
  - Verifikation: `npx tsc --noEmit`, `npx tsx scripts/smoke.ts`,
    `NODE_ENV=production npx next build` – alle grün.
  - Follow-up: Warnbanner einklappbar (`alertsOpen`-State) – zugeklappt
    nur eine Zeile mit Anzahl, Klappt die Detailliste auf.
