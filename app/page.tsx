"use client";

import { useCallback, useEffect, useState } from "react";
import { Conflict, Store } from "@/lib/types";

const WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

export default function Home() {
  const [store, setStore] = useState<Store | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [unassigned, setUnassigned] = useState<
    { childId: string; trainingId: string; reason: string }[]
  >([]);
  const [msg, setMsg] = useState("");

  const refresh = useCallback(async () => {
    const res = await fetch("/api/store");
    const data: Store = await res.json();
    setStore(data);
    const planRes = await fetch("/api/plan");
    const planData = await planRes.json();
    setConflicts(planData.conflicts ?? []);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function api(path: string, init?: RequestInit) {
    const res = await fetch(path, init);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMsg(data.error ?? "Fehler");
      return null;
    }
    setMsg("");
    return res.json();
  }

  async function addParent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data = await api("/api/parent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.get("name"), phone: form.get("phone") }),
    });
    if (data) setStore(data);
    e.currentTarget.reset();
  }

  async function addChild(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data = await api("/api/child", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.get("name"), parentId: form.get("parentId") }),
    });
    if (data) setStore(data);
    e.currentTarget.reset();
  }

  async function addTraining(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data = await api("/api/training", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        weekday: form.get("weekday"),
        startTime: form.get("startTime"),
        endTime: form.get("endTime"),
        location: form.get("location"),
      }),
    });
    if (data) setStore(data);
    e.currentTarget.reset();
  }

  async function toggleEnrollment(childId: string, trainingId: string, enrolled: boolean) {
    if (enrolled) {
      const data = await api(
        `/api/enrollment?childId=${childId}&trainingId=${trainingId}`,
        { method: "DELETE" }
      );
      if (data) setStore(data);
    } else {
      const data = await api("/api/enrollment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId, trainingId }),
      });
      if (data) setStore(data);
    }
  }

  async function autoPlan() {
    const data = await api("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "auto" }),
    });
    if (data) {
      setStore((s) => (s ? { ...s, plan: data.plan } : s));
      setConflicts(data.conflicts ?? []);
      setUnassigned(data.unassigned ?? []);
    }
  }

  if (!store) {
    return <main className="p-8">Lade ...</main>;
  }

  const childById = new Map(store.children.map((c) => [c.id, c]));
  const parentById = new Map(store.parents.map((p) => [p.id, p]));
  const trainingById = new Map(store.trainings.map((t) => [t.id, t]));

  return (
    <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
      <header>
        <h1 className="text-3xl font-bold">🚗 Fahrgemeinschafts-Planer</h1>
        <p className="text-slate-600">
          Plant gemeinsame Fahrten zum Training – keiner fährt allein, wenn es sich vermeiden lässt.
        </p>
      </header>

      {msg && (
        <div className="bg-red-100 border border-red-300 text-red-800 rounded p-3">{msg}</div>
      )}

      <section className="grid md:grid-cols-3 gap-6">
        <div className="border rounded p-4 bg-white shadow-sm">
          <h2 className="font-semibold mb-2">Elternteile</h2>
          <ul className="mb-3 space-y-1">
            {store.parents.map((p) => (
              <li key={p.id} className="flex justify-between text-sm">
                <span>
                  {p.name} {p.phone && <span className="text-slate-400">({p.phone})</span>}
                </span>
                <button
                  className="text-red-500 hover:underline"
                  onClick={async () => {
                    const data = await api(`/api/parent?id=${p.id}`, { method: "DELETE" });
                    if (data) setStore(data);
                  }}
                >
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
            {store.children.map((c) => (
              <li key={c.id} className="flex justify-between text-sm">
                <span>
                  {c.name}{" "}
                  <span className="text-slate-400">
                    ({parentById.get(c.parentId)?.name ?? "unbekannt"})
                  </span>
                </span>
                <button
                  className="text-red-500 hover:underline"
                  onClick={async () => {
                    const data = await api(`/api/child?id=${c.id}`, { method: "DELETE" });
                    if (data) setStore(data);
                  }}
                >
                  löschen
                </button>
              </li>
            ))}
          </ul>
          <form onSubmit={addChild} className="space-y-2">
            <input name="name" placeholder="Name" required className="w-full border rounded p-2 text-sm" />
            <select name="parentId" required className="w-full border rounded p-2 text-sm">
              <option value="">Elternteil wählen</option>
              {store.parents.map((p) => (
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
            {store.trainings.map((t) => (
              <li key={t.id} className="flex justify-between text-sm">
                <span>
                  {t.name} · {WEEKDAYS[t.weekday]} {t.startTime}–{t.endTime}
                </span>
                <button
                  className="text-red-500 hover:underline"
                  onClick={async () => {
                    const data = await api(`/api/training?id=${t.id}`, { method: "DELETE" });
                    if (data) setStore(data);
                  }}
                >
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

      <section className="border rounded p-4 bg-white shadow-sm">
        <h2 className="font-semibold mb-2">Trainings-Anmeldungen</h2>
        <table className="text-sm">
          <thead>
            <tr>
              <th className="text-left pr-4">Kind</th>
              {store.trainings.map((t) => (
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
            {store.children.map((c) => (
              <tr key={c.id}>
                <td className="pr-4 py-1">{c.name}</td>
                {store.trainings.map((t) => {
                  const enrolled = store.enrollments.some(
                    (e) => e.childId === c.id && e.trainingId === t.id
                  );
                  return (
                    <td key={t.id} className="pr-4 py-1">
                      <input type="checkbox" checked={enrolled} onChange={() => toggleEnrollment(c.id, t.id, enrolled)} />
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

        {store.plan.length === 0 && (
          <p className="text-slate-500 text-sm">
            Noch kein Plan. Klicken Sie auf „Automatisch planen", um Fahrer zuzuteilen.
          </p>
        )}

        <ul className="space-y-2">
          {store.plan.map((a, i) => {
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
                  {a.passengerChildIds
                    .map((cid) => childById.get(cid)?.name ?? "?")
                    .join(", ") || "–"}
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
    </main>
  );
}
