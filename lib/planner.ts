import { Child, Conflict, Direction, Event, Parent, Store, Trip } from "./types";

export function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function timesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function weekdayName(date: string): string {
  const names = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  const d = new Date(`${date}T00:00:00`);
  return names[d.getDay()] ?? "";
}

export function formatDateDE(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}.${m}.${y}`;
}

export function eventTimeWindow(e: Event, direction: Direction, bufferMin = 15): { start: number; end: number } {
  const start = toMinutes(e.startTime);
  const end = toMinutes(e.endTime);
  if (direction === "outbound") {
    return { start: start - bufferMin, end: start + bufferMin / 2 };
  }
  return { start: end - bufferMin / 2, end: end + bufferMin };
}

type TripCandidate = {
  eventId: string;
  direction: Direction;
  driverId: string;
  capacity: number;
};

export function findConflicts(store: Store, trips: Trip[]): Conflict[] {
  const conflicts: Conflict[] = [];
  const eventById = new Map(store.events.map((e) => [e.id, e]));
  const parentById = new Map(store.parents.map((p) => [p.id, p]));

  for (const t of trips) {
    const e = eventById.get(t.eventId);
    const driver = parentById.get(t.driverId);
    if (!e || !driver) continue;
    if (t.passengerChildIds.length > driver.seats) {
      conflicts.push({
        type: "capacity_exceeded",
        description: `Fahrer ${driver.name} hat nur ${driver.seats} freie Plätze, aber ${t.passengerChildIds.length} Kinder in der Fahrt zu „${e.title}“ (${t.direction === "outbound" ? "Hinfahrt" : "Rückfahrt"}).`,
      });
    }
  }

  const driverTrips = new Map<string, Trip[]>();
  for (const t of trips) {
    const arr = driverTrips.get(t.driverId) ?? [];
    arr.push(t);
    driverTrips.set(t.driverId, arr);
  }

  for (const [driverId, dt] of driverTrips) {
    const driver = parentById.get(driverId);
    if (!driver) continue;
    for (let i = 0; i < dt.length; i++) {
      for (let j = i + 1; j < dt.length; j++) {
        const a = dt[i];
        const b = dt[j];
        const ea = eventById.get(a.eventId);
        const eb = eventById.get(b.eventId);
        if (!ea || !eb) continue;
        if (ea.date !== eb.date) continue;
        if (ea.date !== eb.date) continue;
        if (a.direction === b.direction) {
          const wa = eventTimeWindow(ea, a.direction);
          const wb = eventTimeWindow(eb, b.direction);
          if (!timesOverlap(wa.start, wa.end, wb.start, wb.end)) continue;
          const dirLabel = a.direction === "outbound" ? "Hinfahrt" : "Rückfahrt";
          conflicts.push({
            type: "driver_double_booked",
            description: `${driver.name} ist zur gleichen Zeit für zwei Fahrten eingetragen: „${ea.title}“ und „${eb.title}“ (beide ${dirLabel}n).`,
          });
        }
      }
    }
  }

  const childTrips = new Map<string, Trip[]>();
  for (const t of trips) {
    for (const cid of t.passengerChildIds) {
      const arr = childTrips.get(cid) ?? [];
      arr.push(t);
      childTrips.set(cid, arr);
    }
  }

  return conflicts;
}

export function autoAssignTrips(store: Store): { trips: Trip[]; unassigned: { childId: string; eventId: string; direction: Direction; reason: string }[] } {
  const trips: Trip[] = [];
  const unassigned: { childId: string; eventId: string; direction: Direction; reason: string }[] = [];
  const driverLoad = new Map<string, number>();
  const childByIdMap = new Map(store.children.map((c) => [c.id, c]));

  for (const event of [...store.events].sort((a, b) => a.date.localeCompare(b.date))) {
    const participants = (store.participations ?? [])
      .filter((p) => p.eventId === event.id)
      .map((p) => p.childId);
    if (participants.length === 0) continue;

    for (const direction of ["outbound", "return"] as Direction[]) {
      // Kinder nach Startort gruppieren: ein Fahrer fährt nur Kinder von einem Startort
      const byStart = new Map<string, string[]>();
      for (const cid of participants) {
        const child = childByIdMap.get(cid);
        const start =
          direction === "outbound"
            ? child?.homeLocationId ?? "ohne-ort"
            : event.locationId;
        const arr = byStart.get(start) ?? [];
        arr.push(cid);
        byStart.set(start, arr);
      }

      for (const [startLocationId, kidsAtStart] of byStart.entries()) {
        let remaining = [...kidsAtStart];

        // Nur Eltern, die diese Fahrt aktiv angeboten haben („ich kann diese Fahrt machen“)
        const offeredParentIds = new Set(
          (store.offers ?? [])
            .filter((o) => o.eventId === event.id && o.direction === direction)
            .map((o) => o.parentId)
        );

        // Fahrer, die von diesem Startort aus fahren KÖNNEN:
        // bei Hinfahrt nur Eltern mit Wohnort = Startort,
        // bei Rückfahrt alle Eltern (Start ist der Trainingsplatz)
        const eligible = store.parents.filter(
          (p) =>
            offeredParentIds.has(p.id) &&
            (direction === "return" || p.homeLocationId === startLocationId)
        );

        // Priorität: 1) muss ohnehin fahren (eigenes Kind nimmt teil)
        //            2) wenigste Fahrten bisher (Statistik)
        const mustDrive = (p: (typeof store.parents)[number]) =>
          store.children.some(
            (c) => c.parentId === p.id && participants.includes(c.id)
          );

        const candidates = [...eligible].sort((a, b) => {
          const aMust = mustDrive(a) ? 0 : 1;
          const bMust = mustDrive(b) ? 0 : 1;
          if (aMust !== bMust) return aMust - bMust;
          return (driverLoad.get(a.id) ?? 0) - (driverLoad.get(b.id) ?? 0);
        });

        for (const driver of candidates) {
          if (remaining.length === 0) break;
          if (driver.seats === 0) continue;
          const take = remaining.slice(0, driver.seats);
          if (take.length === 0) continue;

          trips.push({ eventId: event.id, direction, driverId: driver.id, passengerChildIds: take });
          remaining = remaining.slice(take.length);
          driverLoad.set(driver.id, (driverLoad.get(driver.id) ?? 0) + 1);
        }

        const startName =
          store.locations.find((l) => l.id === startLocationId)?.name ?? "unbekanntem Ort";
        for (const cid of remaining) {
          unassigned.push({
            childId: cid,
            eventId: event.id,
            direction,
            reason:
              direction === "outbound"
                ? `Kein Fahrer ab ${startName} hat diese Hinfahrt angeboten – Kind kann nicht von woanders zugeordnet werden`
                : `Kein Fahrer hat diese Rückfahrt ab ${startName} angeboten bzw. freie Plätze`,
          });
        }
      }
    }
  }

  return { trips, unassigned };
}

export function driverStats(store: Store): { parent: Parent; outbound: number; return: number; total: number }[] {
  return store.parents
    .map((p) => {
      const outbound = (store.trips ?? []).filter((t) => t.driverId === p.id && t.direction === "outbound").length;
      const ret = (store.trips ?? []).filter((t) => t.driverId === p.id && t.direction === "return").length;
      return { parent: p, outbound, return: ret, total: outbound + ret };
    })
    .sort((a, b) => b.total - a.total);
}

export function childById(store: Store): Map<string, Child> {
  return new Map(store.children.map((c) => [c.id, c]));
}
