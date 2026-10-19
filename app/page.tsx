"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { autoAssignDrivers, findConflicts, weekdayName } from "@/lib/planner";
import { seedStore } from "@/lib/seed";
import { Store, Unassigned } from "@/lib/types";
import { newId, useStore } from "@/lib/useStore";

const WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

export default function Home() {
  const { store: storedStore, persist, loaded, reset } = useStore();
  const [store, setStore] = useState<Store | null>(null);
  const [unassigned, setUnassigned] = useState<Unassigned[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (loaded) {
      setStore(storedStore ?? seedStore());
    }
  }, [loaded, storedStore]);

  const save = useCallback(
    (next: Store) => {
      setStore(next);
      persist(next);
    },
    [persist]
  );

  const conflicts = useMemo(
    () => (store ? findConflicts(store) : []),
    [store]
  );

  const s: Store = store ?? seedStore();

  const childById = new Map(s.children.map((c) => [c.id, c]));
  const parentById = new Map(s.parents.map((p) => [p.id, p]));
  const trainingById = new Map(s.trainings.map((t) => [t.id, t]));

  function requireFields(form: FormData, keys: string[]): Record<string, string> | null {
    const values: Record<string, string> = {};
    for (const k of keys) {
      const v = String(form.get(k) ?? "").trim();
      if (!v) {
        setMsg("Bitte alle Pflichtfelder ausfüllen.");
        return null;
      }
      values[k] = v;
    }
    setMsg("");
    return values;
  }

  function addParent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const v = requireFields(form, ["name"]);
    if (!v) return;
    save({
      ...s,
      parents: [...s.parents, { id: newId("p"), name: v.name, phone: String(form.get("phone") ?? "") || undefined }],
    });
    e.currentTarget.reset();
  }

  function addChild(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const v = requireFields(form, ["name", "parentId"]);
    if (!v) return;
    save({ ...s, children: [...s.children, { id: newId("c"), name: v.name, parentId: v.parentId }] });
    e.currentTarget.reset();
  }

  function addTraining(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const v = requireFields(form, ["name", "weekday", "startTime", "endTime"]);
    if (!v) return;
    if (v.startTime >= v.endTime) {
      setMsg("Endzeit muss nach der Startzeit liegen.");
      return;
    }
    save({
      ...s,
      trainings: [
        ...s.trainings,
        {
          id: newId("t"),
          name: v.name,
          weekday: Number(v.weekday),
          startTime: v.startTime,
          endTime: v.endTime,
          location: String(form.get("location") ?? ""),
        },
      ],
    });
    e.currentTarget.reset();
  }

  function remove(kind: "parent" | "child" | "training", id: string) {
    if (kind === "parent") {
      const childIds = s.children.filter((c) => c.parentId === id).map((c) => c.id);
      save({
        ...s,
        parents: s.parents.filter((p) => p.id !== id),
        children: s.children.filter((c) => c.parentId !== id),
        enrollments: s.enrollments.filter((e) => !childIds.includes(e.childId)),
        plan: s.plan
          .filter((a) => a.driverId !== id)
          .map((a) => ({ ...a, passengerChildIds: a.passengerChildIds.filter((c) => !childIds.includes(c)) })),
      });
    } else if (kind === "child") {
      save({
        ...s,
        children: s.children.filter((c) => c.id !== id),
        enrollments: s.enrollments.filter((e) => e.childId !== id),
        plan: s.plan.map((a) => ({
          ...a,
          passengerChildIds: a.passengerChildIds.filter((c) => c !== id),
        })),
      });
    } else {
      save({
        ...s,
        trainings: s.trainings.filter((t) => t.id !== id),
        enrollments: s.enrollments.filter((e) => e.trainingId !== id),
        plan: s.plan.filter((a) => a.trainingId !== id),
      });
    }
  }

  function toggleEnrollment(childId: string, trainingId: string) {
    const enrolled = s.enrollments.some(
      (e) => e.childId === childId && e.trainingId === trainingId
    );
    save({
      ...s,
      enrollments: enrolled
        ? s.enrollments.filter((e) => !(e.childId === childId && e.trainingId === trainingId))
        : [...s.enrollments, { childId, trainingId }],
    });
  }

  function autoPlan() {
    const { plan, unassigned: una } = autoAssignDrivers(s);
    save({ ...s, plan });
    setUnassigned(una);
  }

  return (
    <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">🚗 Fahrgemeinschafts-Planer</h1>
          <p className="text-slate-600">
            Plant gemeinsame Fahrten zum Training – die Daten bleiben lokal in eurem Browser.
          </p>
        </div>
        <button
          onClick={reset}
          className="text-sm text-slate-500 hover:text-red-600 hover:underline shrink-0"
          title="Alle Daten löschen und Beispieldaten neu laden"
        >
          Zurücksetzen
        </button>
      </header>

      {msg && (
        <div className="bg-red-100 border border-red-300 text-red-800 rounded p-3">{msg}</div>
      )}

      <section className="grid md:grid-cols-3 gap-6">
        <div className="border rounded p-4 bg-white shadow-sm">
          <h2 className="font-semibold mb-2">Elternteile</h2>
          <ul className="mb-3 space-y-1">
            {s.parents.map((p) => (
              <li key={p.id} className="flex justify-between text-sm">
                <span>
                  {p.name} {p.phone && <span className="text-slate-400">({p.phone})</span>}
                </span>
                <button className="text-red-500 hover:underline" onClick={() => remove("parent", p.id)}>
                  löschen
                </button>
              </li>
            ))}
          </ul>
          <form onSubmit={addParent} className="space-y-2">
            <input name="name" placeholder="Name" required className="w-full border rounded p-2 text-sm" />
            <input name="phone" placeholder="Telefon (optional)" className="w-full border rounded p-2 text-sm" />
            <button className="w-full bg-slate-800 text-white rounded p-2 text-sm hover:bg-slate-700">
              Elternteil hinzufügen
            </button>
          </form>
        </div>

        <div className="border rounded p-4 bg-white shadow-sm">
          <h2 className="font-semibold mb-2">Kinder</h2>
          <ul className="mb-3 space-y-1">
            {s.children.map((c) => (
              <li key={c.id} className="flex justify-between text-sm">
                <span>
                  {c.name}{" "}
                  <span className="text-slate-400">({parentById.get(c.parentId)?.name ?? "unbekannt"})</span>
                </span>
                <button className="text-red-500 hover:underline" onClick={() => remove("child", c.id)}>
                  löschen
                </button>
              </li>
            ))}
          </ul>
          <form onSubmit={addChild} className="space-y-2">
            <input name="name" placeholder="Name" required className="w-full border rounded p-2 text-sm" />
            <select name="parentId" required className="w-full border rounded p-2 text-sm">
              <option value="">Elternteil wählen</option>
              {s.parents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button className="w-full bg-slate-800 text-white rounded p-2 text-sm hover:bg-slate-700">
              Kind hinzufügen
            </button>
          </form>
        </div>

        <div className="border rounded p-4 bg-white shadow-sm">
          <h2 className="font-semibold mb-2">Trainings</h2>
          <ul className="mb-3 space-y-1">
            {s.trainings.map((t) => (
              <li key={t.id} className="flex justify-between text-sm">
                <span>
                  {t.name} · {WEEKDAYS[t.weekday]} {t.startTime}–{t.endTime}
                </span>
                <button className="text-red-500 hover:underline" onClick={() => remove("training", t.id)}>
                  löschen
                </button>
              </li>
            ))}
          </ul>
          <form onSubmit={addTraining} className="space-y-2">
            <input name="name" placeholder="Training (z. B. Fußball U10)" required className="w-full border rounded p-2 text-sm" />
            <div className="grid grid-cols-3 gap-2">
              <select name="weekday" className="border rounded p-2 text-sm" required>
                {WEEKDAYS.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </select>
              <input name="startTime" type="time" required className="border rounded p-2 text-sm" />
              <input name="endTime" type="time" required className="border rounded p-2 text-sm" />
            </div>
            <input name="location" placeholder="Ort" className="w-full border rounded p-2 text-sm" />
            <button className="w-full bg-slate-800 text-white rounded p-2 text-sm hover:bg-slate-700">
              Training hinzufügen
            </button>
          </form>
        </div>
      </section>

      <section className="border rounded p-4 bg-white shadow-sm overflow-x-auto">
        <h2 className="font-semibold mb-2">Trainings-Anmeldungen</h2>
        <table className="text-sm">
          <thead>
            <tr>
              <th className="text-left pr-4">Kind</th>
              {s.trainings.map((t) => (
                <th key={t.id} className="text-left pr-4">
                  {t.name}
                  <div className="text-slate-400 font-normal">
                    {WEEKDAYS[t.weekday]} {t.startTime}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {s.children.map((c) => (
              <tr key={c.id}>
                <td className="pr-4 py-1">{c.name}</td>
                {s.trainings.map((t) => {
                  const enrolled = s.enrollments.some(
                    (e) => e.childId === c.id && e.trainingId === t.id
                  );
                  return (
                    <td key={t.id} className="pr-4 py-1">
                      <input
                        type="checkbox"
                        checked={enrolled}
                        onChange={() => toggleEnrollment(c.id, t.id)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="border rounded p-4 bg-white shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Fahrplan</h2>
          <button
            onClick={autoPlan}
            className="bg-blue-600 text-white rounded px-4 py-2 text-sm hover:bg-blue-500"
          >
            Automatisch planen
          </button>
        </div>

        {s.plan.length === 0 && (
          <p className="text-slate-500 text-sm">
            Noch kein Plan. Klicken Sie auf „Automatisch planen“, um Fahrer zuzuteilen.
          </p>
        )}

        <ul className="space-y-2">
          {s.plan.map((a, i) => {
            const t = trainingById.get(a.trainingId);
            const driver = parentById.get(a.driverId);
            if (!t || !driver) return null;
            return (
              <li key={i} className="border rounded p-3 bg-slate-50 text-sm">
                <div className="font-medium">
                  {driver.name} fährt am {WEEKDAYS[t.weekday]} ({a.date}) zum {t.name}
                </div>
                <div className="text-slate-600">
                  Mitfahrer:{" "}
                  {a.passengerChildIds.map((cid) => childById.get(cid)?.name ?? "?").join(", ") || "–"}
                </div>
                <div className="text-slate-400">
                  {t.startTime}–{t.endTime} · {t.location}
                </div>
              </li>
            );
          })}
        </ul>

        {unassigned.length > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded p-3 text-sm">
            <div className="font-medium text-amber-800 mb-1">Nicht zugeordnete Kinder:</div>
            <ul className="list-disc pl-5 text-amber-700">
              {unassigned.map((u, i) => (
                <li key={i}>
                  {childById.get(u.childId)?.name ?? "?"} →{" "}
                  {trainingById.get(u.trainingId)?.name ?? "?"} ({u.reason})
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
                <li key={i}>
                  {c.description} ({c.date})
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <footer className="text-xs text-slate-400">
        Hinweis: Alle Daten werden nur lokal in diesem Browser gespeichert (localStorage). „Zurücksetzen“
        löscht sie und lädt die Beispieldaten neu.
      </footer>
    </main>
  );
}
