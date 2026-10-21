"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { autoAssignTrips, driverStats, findConflicts, formatDateDE, weekdayName } from "@/lib/planner";
import { seedStore } from "@/lib/seed";
import { Direction, Store, Trip } from "@/lib/types";
import { newId, useStore } from "@/lib/useStore";

export default function Home() {
  const { store: storedStore, persist, loaded, reset } = useStore();
  const [store, setStore] = useState<Store | null>(null);
  const [unassigned, setUnassigned] = useState<
    { childId: string; eventId: string; direction: Direction; reason: string }[]
  >([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (loaded) {
      const s = storedStore ?? seedStore();
      setStore(s);
      if (!storedStore) persist(s);
    }
  }, [loaded, storedStore, persist]);

  const save = useCallback(
    (next: Store) => {
      setStore(next);
      persist(next);
    },
    [persist]
  );

  const conflicts = useMemo(
    () => (store ? findConflicts(store, store.trips) : []),
    [store]
  );

  const missingSpots = useMemo(() => {
    if (!store) return [];
    const result: { childId: string; eventId: string; direction: Direction }[] = [];
    for (const p of store.participations) {
      for (const direction of ["outbound", "return"] as Direction[]) {
        const seated = store.trips.some(
          (t) =>
            t.eventId === p.eventId &&
            t.direction === direction &&
            t.passengerChildIds.includes(p.childId)
        );
        if (!seated) result.push({ childId: p.childId, eventId: p.eventId, direction });
      }
    }
    return result;
  }, [store]);
  if (!store) return <main className="p-8">Lade ...</main>;
  const s = store;
  const locationById = new Map(s.locations.map((l) => [l.id, l]));
  const parentById = new Map(s.parents.map((p) => [p.id, p]));
  const childMap = new Map(s.children.map((c) => [c.id, c]));
  const eventsSorted = [...s.events].sort((a, b) => a.date.localeCompare(b.date));

  function addLocation(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (!name) return;
    save({
      ...s,
      locations: [
        ...s.locations,
        { id: newId("l"), name, meetingPoint: String(form.get("meetingPoint") ?? "").trim() || undefined },
      ],
    });
    e.currentTarget.reset();
  }

  function addParent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const seats = Number(form.get("seats") ?? 3);
    if (!name || !Number.isFinite(seats) || seats < 0) {
      setMsg("Name und mindestens 1 Sitzplatz erforderlich.");
      return;
    }
    save({
      ...s,
      parents: [
        ...s.parents,
        {
          id: newId("p"),
          name,
          phone: String(form.get("phone") ?? "").trim() || undefined,
          seats,
          homeLocationId: String(form.get("homeLocationId") ?? "") || undefined,
        },
      ],
    });
    e.currentTarget.reset();
  }

  function updateSeats(parentId: string, seats: number) {
    save({
      ...s,
      parents: s.parents.map((p) => (p.id === parentId ? { ...p, seats: Math.max(0, seats) } : p)),
    });
  }

  function addChild(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const parentId = String(form.get("parentId") ?? "");
    if (!name || !parentId) {
      setMsg("Name und Elternteil erforderlich.");
      return;
    }
    save({
      ...s,
      children: [
        ...s.children,
        {
          id: newId("c"),
          name,
          parentId,
          homeLocationId: String(form.get("homeLocationId") ?? "") || undefined,
          team: String(form.get("team") ?? "").trim() || undefined,
        },
      ],
    });
    e.currentTarget.reset();
  }

  function addEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const date = String(form.get("date") ?? "");
    const startTime = String(form.get("startTime") ?? "");
    const endTime = String(form.get("endTime") ?? "");
    const locationId = String(form.get("locationId") ?? "");
    const type = String(form.get("type") ?? "training") as "training" | "match";
    if (!title || !date || !startTime || !endTime || !locationId) {
      setMsg("Bitte alle Pflichtfelder ausfüllen.");
      return;
    }
    if (startTime >= endTime) {
      setMsg("Endzeit muss nach der Startzeit liegen.");
      return;
    }
    save({
      ...s,
      events: [
        ...s.events,
        {
          id: newId("e"),
          type,
          title,
          date,
          startTime,
          endTime,
          locationId,
          meetingPoint: String(form.get("meetingPoint") ?? "").trim() || undefined,
          opponent: type === "match" ? String(form.get("opponent") ?? "").trim() || undefined : undefined,
          isHome: type !== "match" || form.get("isHome") === "on",
        },
      ],
    });
    e.currentTarget.reset();
  }

  function toggleParticipation(childId: string, eventId: string) {
    const has = s.participations.some((p) => p.childId === childId && p.eventId === eventId);
    save({
      ...s,
      participations: has
        ? s.participations.filter((p) => !(p.childId === childId && p.eventId === eventId))
        : [...s.participations, { childId, eventId }],
    });
  }

  const LOCATION_COLORS = [
    "text-blue-700",
    "text-emerald-700",
    "text-purple-700",
    "text-orange-700",
    "text-pink-700",
    "text-teal-700",
    "text-indigo-700",
    "text-cyan-700",
  ];
  function kidColor(homeLocationId: string | undefined): string {
    if (!homeLocationId) return "text-slate-500";
    const index = s.locations.findIndex((l) => l.id === homeLocationId);
    return index >= 0 ? LOCATION_COLORS[index % LOCATION_COLORS.length] : "text-slate-500";
  }
  function kidColorBorder(homeLocationId: string): string {
    const borders = [
      "border-blue-300",
      "border-emerald-300",
      "border-purple-300",
      "border-orange-300",
      "border-pink-300",
      "border-teal-300",
      "border-indigo-300",
      "border-cyan-300",
    ];
    const index = s.locations.findIndex((l) => l.id === homeLocationId);
    return index >= 0 ? borders[index % borders.length] : "border-slate-300";
  }

  function kidDot(homeLocationId: string): string {
    const dots = [
      "bg-blue-500",
      "bg-emerald-500",
      "bg-purple-500",
      "bg-orange-500",
      "bg-pink-500",
      "bg-teal-500",
      "bg-indigo-500",
      "bg-cyan-500",
    ];
    const index = s.locations.findIndex((l) => l.id === homeLocationId);
    return index >= 0 ? dots[index % dots.length] : "bg-slate-300";
  }

  function startLocName(t: (typeof s.trips)[number]): string {
    let locId: string | undefined;
    if (t.direction === "return") {
      locId = s.events.find((e) => e.id === t.eventId)?.locationId;
    } else {
      const firstChild = t.passengerChildIds[0];
      locId = s.children.find((c) => c.id === firstChild)?.homeLocationId;
    }
    return s.locations.find((l) => l.id === locId)?.name ?? "?";
  }

  function toggleOffer(parentId: string, eventId: string, direction: Direction) {
    const has = s.offers.some(
      (o) => o.parentId === parentId && o.eventId === eventId && o.direction === direction
    );
    save({
      ...s,
      offers: has
        ? s.offers.filter(
            (o) => !(o.parentId === parentId && o.eventId === eventId && o.direction === direction)
          )
        : [...s.offers, { parentId, eventId, direction }],
    });
  }

  function autoPlan() {
    const { trips, unassigned: una } = autoAssignTrips(s);
    save({ ...s, trips });
    setUnassigned(una);
  }

  function removeTrip(index: number) {
    save({ ...s, trips: s.trips.filter((_, i) => i !== index) });
  }

  function movePassenger(tripIndex: number, childId: string, toDriverId: string | null) {
    const trips = [...s.trips];
    const trip = trips[tripIndex];
    trips[tripIndex] = {
      ...trip,
      passengerChildIds: trip.passengerChildIds.filter((c) => c !== childId),
    };
    if (toDriverId) {
      const targetIndex = trips.findIndex(
        (t) => t.eventId === trip.eventId && t.direction === trip.direction && t.driverId === toDriverId
      );
      if (targetIndex >= 0) {
        trips[targetIndex] = {
          ...trips[targetIndex],
          passengerChildIds: [...trips[targetIndex].passengerChildIds, childId],
        };
      } else {
        trips.push({
          eventId: trip.eventId,
          direction: trip.direction,
          driverId: toDriverId,
          passengerChildIds: [childId],
        });
      }
    }
    save({ ...s, trips: trips.filter((t) => t.passengerChildIds.length > 0) });
  }

  return (
    <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">🚗 Fahrgemeinschafts-Planer</h1>
          <p className="text-slate-600">
            Spielgemeinschaft aus 4 Orten – Hin- und Rückfahrt gemeinsam planen.
          </p>
        </div>
        <button onClick={reset} className="text-sm text-slate-500 hover:text-red-600 hover:underline shrink-0">
          Zurücksetzen
        </button>
      </header>

      {msg && <div className="bg-red-100 border border-red-300 text-red-800 rounded p-3">{msg}</div>}

      {missingSpots.length > 0 && (
        <div className="bg-red-600 text-white rounded p-4 shadow-md" role="alert">
          <div className="font-bold mb-1">
            ⚠️ {missingSpots.length} Kind{missingSpots.length > 1 ? "er" : ""} ohne Platz!
          </div>
          <ul className="text-sm list-disc pl-5">
            {missingSpots.map((m, i) => {
              const ev = s.events.find((e) => e.id === m.eventId);
              return (
                <li key={i}>
                  <span className="font-medium">{childMap.get(m.childId)?.name ?? "?"}</span>{" "}
                  → {ev?.title ?? "?"} ({formatDateDE(ev?.date ?? "")}, {ev?.startTime}) ·{" "}
                  {m.direction === "outbound" ? "Hinfahrt" : "Rückfahrt"}
                </li>
              );
            })}
          </ul>
          <div className="text-xs mt-1 opacity-90">Rot markierte Kinder im Termin brauchen noch eine Fahrt.</div>
        </div>
      )}

      <section className="grid md:grid-cols-3 gap-6">
        <div className="border rounded p-4 bg-white shadow-sm">
          <h2 className="font-semibold mb-2">📍 Orte</h2>
          <ul className="mb-3 space-y-1 text-sm">
            {s.locations.map((l) => (
              <li key={l.id}>
                <span className="font-medium">{l.name}</span>
                {l.meetingPoint && <span className="text-slate-400"> – Treffpunkt: {l.meetingPoint}</span>}
              </li>
            ))}
          </ul>
          <form onSubmit={addLocation} className="space-y-2">
            <input name="name" placeholder="Ortsname (z. B. Auswärts: FC Rival)" required className="w-full border rounded p-2 text-sm" />
            <input name="meetingPoint" placeholder="Treffpunkt (optional)" className="w-full border rounded p-2 text-sm" />
            <button className="w-full bg-slate-800 text-white rounded p-2 text-sm hover:bg-slate-700">Ort hinzufügen</button>
          </form>
        </div>

        <div className="border rounded p-4 bg-white shadow-sm">
          <h2 className="font-semibold mb-2">👤 Elternteile</h2>
          <ul className="mb-3 space-y-1 text-sm">
            {s.parents.map((p) => (
              <li key={p.id} className={`flex justify-between items-center rounded px-1 ${p.isBus ? "bg-amber-50" : ""}`}>
                <span>
                  {p.isBus ? "🚌 " : ""}{p.name}
                  {p.isBus && <span className="text-amber-700 text-xs"> – nur bei Verfügbarkeit</span>}
                  {!p.isBus && p.homeLocationId && <span className="text-slate-400"> ({locationById.get(p.homeLocationId)?.name})</span>}
                </span>
                <span className="flex items-center gap-1">
                  <label className="text-xs text-slate-500">Freie Plätze:</label>
                  <input
                    type="number"
                    min={0}
                    max={p.isBus ? 20 : 9}
                    value={p.seats}
                    onChange={(e) => updateSeats(p.id, Number(e.target.value))}
                    className="w-14 border rounded p-1 text-xs"
                  />
                </span>
              </li>
            ))}
          </ul>
          <form onSubmit={addParent} className="space-y-2">
            <input name="name" placeholder="Name" required className="w-full border rounded p-2 text-sm" />
            <input name="phone" placeholder="Telefon (optional)" className="w-full border rounded p-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input name="seats" type="number" min={0} max={9} placeholder="Freie Plätze" defaultValue={3} className="w-full border rounded p-2 text-sm" />
              <select name="homeLocationId" className="w-full border rounded p-2 text-sm">
                <option value="">Wohnort</option>
                {s.locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <button className="w-full bg-slate-800 text-white rounded p-2 text-sm hover:bg-slate-700">Elternteil hinzufügen</button>
          </form>
        </div>

        <div className="border rounded p-4 bg-white shadow-sm">
          <h2 className="font-semibold mb-2">🧒 Kinder</h2>
          <ul className="mb-3 space-y-3 text-sm">
            {s.locations.map((loc) => {
              const kids = s.children.filter((c) => c.homeLocationId === loc.id);
              if (kids.length === 0) return null;
              return (
                <li key={loc.id}>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 bg-white border ${kidColorBorder(loc.id)} ${kidColor(loc.id)}`}>{loc.name}</span>
                    <span className="text-xs text-slate-400">{kids.length}</span>
                  </div>
                  <ul className="ml-1 mt-1 space-y-0.5">
                    {kids.map((c) => (
                      <li key={c.id} className="flex items-center gap-1.5">
                        <span className={kidColor(c.homeLocationId)} title={`Wohnort: ${loc.name}`}>
                          {c.name}
                        </span>
                        {c.team && <span className="text-xs bg-slate-200 text-slate-700 rounded-full px-1.5 py-0.5 font-medium">{c.team}</span>}
                        <span className="text-slate-400 text-xs">({parentById.get(c.parentId)?.name ?? "unbekannt"})</span>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
            {(() => {
              const noLoc = s.children.filter((c) => !c.homeLocationId);
              if (noLoc.length === 0) return null;
              return (
                <li>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ohne Wohnort</div>
                  <ul className="ml-1 mt-1 space-y-0.5">
                    {noLoc.map((c) => (
                      <li key={c.id}>
                        {c.name}
                        <span className="text-slate-400 text-xs"> ({parentById.get(c.parentId)?.name ?? "unbekannt"})</span>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })()}
          </ul>
          <form onSubmit={addChild} className="space-y-2">
            <input name="name" placeholder="Name" required className="w-full border rounded p-2 text-sm" />
            <input name="team" placeholder="Mannschaft (z. B. U12)" list="team-list" className="w-full border rounded p-2 text-sm" />
            <datalist id="team-list">
              {[...new Set(s.children.map((c) => c.team).filter(Boolean))].map((team) => (
                <option key={team} value={team ?? ""} />
              ))}
            </datalist>
            <select name="parentId" required className="w-full border rounded p-2 text-sm">
              <option value="">Elternteil wählen</option>
              {s.parents.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select name="homeLocationId" className="w-full border rounded p-2 text-sm">
              <option value="">Wohnort</option>
              {s.locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            <button className="w-full bg-slate-800 text-white rounded p-2 text-sm hover:bg-slate-700">Kind hinzufügen</button>
          </form>
        </div>
      </section>

      <section className="border rounded p-4 bg-white shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-semibold">📅 Termine</h2>
          <button onClick={autoPlan} className="bg-blue-600 text-white rounded px-4 py-2 text-sm hover:bg-blue-500">
            Automatisch planen
          </button>
        </div>

        {eventsSorted.length === 0 && (
          <p className="text-slate-500 text-sm">Noch keine Termine.</p>
        )}

        <div className="space-y-6">
          {eventsSorted.map((event) => {
            const participants = s.children.filter((c) =>
              s.participations.some((p) => p.childId === c.id && p.eventId === event.id)
            );
            const eventTrips = s.trips.filter((t) => t.eventId === event.id);
            const loc = locationById.get(event.locationId);
            return (
              <div key={event.id} className="border rounded p-4 bg-slate-50">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <div className="font-medium">
                      {event.type === "match" ? "🏆" : "⚽"} {event.title}
                      {event.type === "match" && (
                        <span className="ml-2 text-xs px-2 py-0.5 rounded bg-slate-200">
                          {event.isHome ? "Heimspiel" : "Auswärtsspiel"}
                        </span>
                      )}
                    </div>
                    <div className="text-slate-500 text-sm">
                      {weekdayName(event.date)}, {formatDateDE(event.date)} · {event.startTime}–{event.endTime}
                      {loc && <> · {loc.name}{event.meetingPoint ? ` (Treffpunkt: ${event.meetingPoint})` : loc.meetingPoint ? ` (Treffpunkt: ${loc.meetingPoint})` : ""}</>}
                    </div>
                  </div>
                  <button
                    className="text-red-500 hover:underline text-sm"
                    onClick={() =>
                      save({
                        ...s,
                        events: s.events.filter((ev) => ev.id !== event.id),
                        participations: s.participations.filter((p) => p.eventId !== event.id),
                        trips: s.trips.filter((t) => t.eventId !== event.id),
                      })
                    }
                  >
                    löschen
                  </button>
                </div>

                <div className="mt-3">
                  <div className="text-xs font-medium text-slate-600 mb-1">Teilnehmende Kinder:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {[...new Set(participants.map((c) => c.homeLocationId).filter((x): x is string => Boolean(x)))].map((locId) => {
                      const loc = locationById.get(locId);
                      if (!loc) return null;
                      return (
                        <span key={locId} className={`text-xs font-semibold rounded-full px-2 py-0.5 border bg-white ${kidColorBorder(locId)} ${kidColor(locId)}`}>
                          {loc.name}: {participants.filter((c) => c.homeLocationId === locId).length}
                        </span>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {[...new Set(s.children.map((c) => c.team).filter(Boolean))].map((team) => {
                      const teamKids = s.children.filter((c) => c.team === team);
                      const allOn = teamKids.every((c) =>
                        s.participations.some((p) => p.childId === c.id && p.eventId === event.id)
                      );
                      const someOn = teamKids.some((c) =>
                        s.participations.some((p) => p.childId === c.id && p.eventId === event.id)
                      );
                      return (
                        <button
                          key={team}
                          type="button"
                          className={`text-xs rounded-full px-2 py-0.5 border font-medium ${
                            allOn
                              ? "bg-slate-800 text-white border-slate-800"
                              : someOn
                                ? "bg-slate-200 text-slate-700 border-slate-400"
                                : "bg-white text-slate-500 border-slate-200"
                          }`}
                          onClick={() => {
                            const all = teamKids.every((c) =>
                              s.participations.some((p) => p.childId === c.id && p.eventId === event.id)
                            );
                            const next = all
                              ? s.participations.filter(
                                  (p) => !(p.eventId === event.id && teamKids.some((k) => k.id === p.childId))
                                )
                              : [
                                  ...s.participations.filter(
                                    (p) => !(p.eventId === event.id && teamKids.some((k) => k.id === p.childId))
                                  ),
                                  ...teamKids.map((c) => ({ childId: c.id, eventId: event.id })),
                                ];
                            save({ ...s, participations: next });
                          }}
                          title={`${team} komplett an-/abwählen (${teamKids.length} Kinder)`}
                        >
                          {team}
                        </button>
                      );
                    })}
                    <span className="w-px bg-slate-200 mx-0.5 self-stretch" />
                    {s.children.map((c) => {
                      const on = s.participations.some((p) => p.childId === c.id && p.eventId === event.id);
                      const missingHere = on && missingSpots.some(
                        (m) => m.childId === c.id && m.eventId === event.id
                      );
                      const locDot = c.homeLocationId ? kidDot(c.homeLocationId) : "bg-slate-300";
                      return (
                        <label
                          key={c.id}
                          className={`text-xs border rounded-full px-3 py-1 cursor-pointer ${
                            missingHere
                              ? "bg-red-600 text-white border-red-600 ring-2 ring-red-300 font-medium"
                              : on
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white text-slate-600"
                          }`}
                          title={
                            missingHere
                              ? "Ohne Platz in mindestens einer Richtung!"
                              : c.homeLocationId
                                ? `Wohnort: ${locationById.get(c.homeLocationId)?.name ?? "?"}${c.team ? ` · ${c.team}` : ""}`
                                : undefined
                          }
                        >
                          <input type="checkbox" className="hidden" checked={on} onChange={() => toggleParticipation(c.id, event.id)} />
                          <span className={`inline-block w-2 h-2 rounded-full mr-1 align-middle ${on && !missingHere ? "bg-white/80" : locDot}`} />
                          {missingHere ? "🚫 " : ""}{c.name}
                          {c.team && <span className="ml-1 opacity-70">({c.team})</span>}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {(["outbound", "return"] as Direction[]).map((direction) => {
                  const dirTrips = eventTrips.filter((t) => t.direction === direction);
                  const offeredIds = new Set(
                    s.offers
                      .filter((o) => o.eventId === event.id && o.direction === direction)
                      .map((o) => o.parentId)
                  );
                  return (
                    <div key={direction} className="mt-3">
                      <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                        {direction === "outbound" ? "→ Hinfahrt" : "← Rückfahrt"}
                      </div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="text-xs text-slate-500 self-center">Ich kann diese Fahrt machen:</span>
                        {s.parents.map((p) => {
                          const on = offeredIds.has(p.id);
                          return (
                            <label
                              key={p.id}
                              className={`text-xs border rounded-full px-3 py-1 cursor-pointer ${
                                on
                                  ? p.isBus
                                    ? "bg-amber-500 text-white border-amber-500"
                                    : "bg-green-600 text-white border-green-600"
                                  : p.isBus
                                    ? "bg-amber-50 text-amber-800 border-amber-300"
                                    : "bg-white text-slate-600"
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="hidden"
                                checked={on}
                                onChange={() => toggleOffer(p.id, event.id, direction)}
                              />
                              {p.isBus ? "🚌 " : ""}{p.name}
                              {p.isBus && !on && <span className="opacity-70"> (nicht verfügbar)</span>}
                            </label>
                          );
                        })}
                      </div>
                      {(() => {
                        const missingDir = missingSpots.filter(
                          (m) => m.eventId === event.id && m.direction === direction
                        );
                        return missingDir.length > 0 ? (
                          <div className="bg-red-100 border border-red-400 rounded px-3 py-2 mb-2 text-sm text-red-800">
                            <span className="font-semibold">🚫 Ohne Platz ({direction === "outbound" ? "Hinfahrt" : "Rückfahrt"}):</span>{" "}
                            {missingDir.map((m) => childMap.get(m.childId)?.name ?? "?").join(", ")}
                          </div>
                        ) : null;
                      })()}
                      {dirTrips.length === 0 ? (
                        <p className="text-xs text-slate-400">Noch nicht geplant.</p>
                      ) : (
                        <ul className="space-y-1">
                          {dirTrips.map((t) => {
                            const tripIndex = s.trips.indexOf(t);
                            const driver = parentById.get(t.driverId);
                            const used = t.passengerChildIds.length;
                            const over = driver && used > driver.seats;
                            const isBus = driver?.isBus;
                            return (
                              <li key={tripIndex} className={`text-sm flex items-center justify-between gap-2 flex-wrap rounded px-2 py-1 ${over ? "bg-red-100" : isBus ? "bg-amber-50 border border-amber-300" : "bg-white"}`}>
                                <span>
                                  <span className="font-medium">{isBus ? "🚌 " : ""}{driver?.name ?? "?"}</span> fährt{" "}
                                  {t.direction === "outbound" ? (
                                    <>von {(startLocName(t))} </>
                                  ) : (
                                    <>vom {(loc?.name ?? "?")} </>
                                  )}
                                  mit{" "}
                                  {t.passengerChildIds.map((cid) => childMap.get(cid)?.name ?? "?").join(", ")}
                                  {driver && <span className="text-slate-400"> ({used}/{driver.seats} freie Plätze belegt)</span>}
                                </span>
                                <span className="flex items-center gap-2">
                                  <select
                                    className="text-xs border rounded p-1"
                                    value=""
                                    onChange={(e) => {
                                      const cid = e.target.getAttribute("data-cid");
                                      if (cid) movePassenger(tripIndex, cid, e.target.value || null);
                                    }}
                                    title="Kind verschieben"
                                  >
                                    <option value="">Kind verschieben…</option>
                                    {s.parents.filter((p) => p.id !== t.driverId).map((p) => (
                                      <option key={p.id} value={p.id} data-cid="">{p.name}</option>
                                    ))}
                                  </select>
                                  <button className="text-red-500 hover:underline text-xs" onClick={() => removeTrip(tripIndex)}>
                                    entfernen
                                  </button>
                                </span>
                                <span className="flex gap-1">
                                  {t.passengerChildIds.map((cid) => (
                                    <button
                                      key={cid}
                                      className="text-xs bg-slate-100 hover:bg-red-100 rounded px-2 py-0.5"
                                      onClick={() => movePassenger(tripIndex, cid, null)}
                                      title={`${childMap.get(cid)?.name} aus der Fahrt entfernen`}
                                    >
                                      {childMap.get(cid)?.name} ✕
                                    </button>
                                  ))}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <details className="border rounded p-3 bg-slate-50">
          <summary className="cursor-pointer text-sm font-medium">+ Termin anlegen</summary>
          <form onSubmit={addEvent} className="mt-3 grid md:grid-cols-3 gap-2 text-sm">
            <input name="title" placeholder="Titel (z. B. Training U12)" required className="border rounded p-2" />
            <select name="type" className="border rounded p-2">
              <option value="training">Training</option>
              <option value="match">Spiel</option>
            </select>
            <input name="date" type="date" required className="border rounded p-2" />
            <input name="startTime" type="time" required className="border rounded p-2" />
            <input name="endTime" type="time" required className="border rounded p-2" />
            <select name="locationId" required className="border rounded p-2">
              <option value="">Ort wählen</option>
              {s.locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            <input name="opponent" placeholder="Gegner (bei Spiel)" className="border rounded p-2" />
            <input name="meetingPoint" placeholder="Treffpunkt (optional, überschreibt Ort)" className="border rounded p-2" />
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" name="isHome" defaultChecked /> Heimspiel (bei Spiel)
            </label>
            <button className="bg-slate-800 text-white rounded p-2 hover:bg-slate-700 md:col-span-3">
              Termin hinzufügen
            </button>
          </form>
        </details>
      </section>

      <section className="border rounded p-4 bg-white shadow-sm space-y-2">
        <h2 className="font-semibold">📊 Fahrer-Statistik</h2>
        <table className="text-sm w-full max-w-md">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-1">Fahrer</th>
              <th className="py-1">Hin</th>
              <th className="py-1">Rück</th>
              <th className="py-1">Gesamt</th>
            </tr>
          </thead>
          <tbody>
            {driverStats(s).map(({ parent, outbound, return: ret, total }) => (
              <tr key={parent.id} className={`border-t ${parent.isBus ? "bg-amber-50 text-amber-800" : ""}`}>
                <td className="py-1">{parent.isBus ? "🚌 " : ""}{parent.name}</td>
                <td className="py-1">{outbound}</td>
                <td className="py-1">{ret}</td>
                <td className="py-1 font-medium">{total}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-slate-400">
          Die Statistik hilft, die Fahrten fair zu verteilen – „Automatisch planen" berücksichtigt die bisherige Last automatisch.
        </p>
      </section>

      {(unassigned.length > 0 || conflicts.length > 0) && (
        <section className="space-y-3">
          {unassigned.length > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded p-3 text-sm">
              <div className="font-medium text-amber-800 mb-1">⚠️ Nicht zugeordnete Kinder:</div>
              <ul className="list-disc pl-5 text-amber-700">
                {unassigned.map((u, i) => (
                  <li key={i}>
                    {childMap.get(u.childId)?.name ?? "?"} → {s.events.find((e) => e.id === u.eventId)?.title ?? "?"} (
                    {u.direction === "outbound" ? "Hinfahrt" : "Rückfahrt"}): {u.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {conflicts.length > 0 && (
            <div className="bg-red-50 border border-red-300 rounded p-3 text-sm">
              <div className="font-medium text-red-800 mb-1">Konflikte:</div>
              <ul className="list-disc pl-5 text-red-700">
                {conflicts.map((c, i) => (
                  <li key={i}>{c.description}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <footer className="text-xs text-slate-400">
        Alle Daten bleiben lokal in diesem Browser (localStorage). „Zurücksetzen“ löscht sie und lädt Beispieldaten.
      </footer>
    </main>
  );
}
