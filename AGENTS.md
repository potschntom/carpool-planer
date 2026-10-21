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
