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
    const seats = Number(form.get("seats") ?? 4);
    if (!name || !Number.isFinite(seats) || seats < 1) {
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
      parents: s.parents.map((p) => (p.id === parentId ? { ...p, seats: Math.max(1, seats) } : p)),
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
        { id: newId("c"), name, parentId, homeLocationId: String(form.get("homeLocationId") ?? "") || undefined },
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
              <li key={p.id} className="flex justify-between items-center">
                <span>
                  {p.name}
                  {p.homeLocationId && <span className="text-slate-400"> ({locationById.get(p.homeLocationId)?.name})</span>}
                </span>
                <span className="flex items-center gap-1">
                  <label className="text-xs text-slate-500">Plätze:</label>
                  <input
                    type="number"
                    min={1}
                    max={9}
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
              <input name="seats" type="number" min={1} max={9} placeholder="Plätze" defaultValue={4} className="w-full border rounded p-2 text-sm" />
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
          <ul className="mb-3 space-y-1 text-sm">
            {s.children.map((c) => (
              <li key={c.id}>
                {c.name}
                <span className="text-slate-400">
                  {" "}({parentById.get(c.parentId)?.name ?? "unbekannt"}
                  {c.homeLocationId && `, ${locationById.get(c.homeLocationId)?.name}`})
                </span>
              </li>
            ))}
          </ul>
          <form onSubmit={addChild} className="space-y-2">
            <input name="name" placeholder="Name" required className="w-full border rounded p-2 text-sm" />
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
                  <div className="flex flex-wrap gap-2">
                    {s.children.map((c) => {
                      const on = s.participations.some((p) => p.childId === c.id && p.eventId === event.id);
                      return (
                        <label key={c.id} className={`text-xs border rounded-full px-3 py-1 cursor-pointer ${on ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600"}`}>
                          <input type="checkbox" className="hidden" checked={on} onChange={() => toggleParticipation(c.id, event.id)} />
                          {c.name}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {(["outbound", "return"] as Direction[]).map((direction) => {
                  const dirTrips = eventTrips.filter((t) => t.direction === direction);
                  return (
                    <div key={direction} className="mt-3">
                      <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                        {direction === "outbound" ? "→ Hinfahrt" : "← Rückfahrt"}
                      </div>
                      {dirTrips.length === 0 ? (
                        <p className="text-xs text-slate-400">Noch nicht geplant.</p>
                      ) : (
                        <ul className="space-y-1">
                          {dirTrips.map((t) => {
                            const tripIndex = s.trips.indexOf(t);
                            const driver = parentById.get(t.driverId);
                            const used = t.passengerChildIds.length + 1;
                            const over = driver && used > driver.seats;
                            return (
                              <li key={tripIndex} className={`text-sm flex items-center justify-between gap-2 flex-wrap rounded px-2 py-1 ${over ? "bg-red-100" : "bg-white"}`}>
                                <span>
                                  <span className="font-medium">{driver?.name ?? "?"}</span> fährt{" "}
                                  {t.direction === "outbound" ? (
                                    <>von {(startLocName(t))} </>
                                  ) : (
                                    <>vom {(loc?.name ?? "?")} </>
                                  )}
                                  mit{" "}
                                  {t.passengerChildIds.map((cid) => childMap.get(cid)?.name ?? "?").join(", ")}
                                  {driver && <span className="text-slate-400"> ({used}/{driver.seats} Plätze)</span>}
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
              <tr key={parent.id} className="border-t">
                <td className="py-1">{parent.name}</td>
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
