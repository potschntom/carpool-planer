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
    if (t.passengerChildIds.length + 1 > driver.seats) {
      conflicts.push({
        type: "capacity_exceeded",
        description: `Fahrer ${driver.name} hat nur ${driver.seats} Plätze, aber ${t.passengerChildIds.length + 1} Personen in der Fahrt zu „${e.title}“ (${t.direction === "outbound" ? "Hinfahrt" : "Rückfahrt"}).`,
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
  const parentById = new Map(store.parents.map((p) => [p.id, p]));
  const driverLoad = new Map<string, number>();
  const driverTrips = new Map<string, Trip[]>();

  for (const event of [...store.events].sort((a, b) => a.date.localeCompare(b.date))) {
    const participants = store.participations
      .filter((p) => p.eventId === event.id)
      .map((p) => p.childId);
    if (participants.length === 0) continue;

    for (const direction of ["outbound", "return"] as Direction[]) {
      let remaining = [...participants];
      const candidates = [...store.parents].sort(
        (a, b) => (driverLoad.get(a.id) ?? 0) - (driverLoad.get(b.id) ?? 0)
      );

      for (const driver of candidates) {
        if (remaining.length === 0) break;
        const ownChildInCar = remaining.some((cid) => store.children.find((c) => c.id === cid)?.parentId === driver.id);
        const seatsForPassengers = Math.max(0, driver.seats - (ownChildInCar ? 1 : 0));
        if (seatsForPassengers === 0) continue;
        const take = remaining.slice(0, seatsForPassengers);
        if (take.length === 0) continue;

        const trip: Trip = { eventId: event.id, direction, driverId: driver.id, passengerChildIds: take };
        trips.push(trip);
        remaining = remaining.slice(take.length);
        driverLoad.set(driver.id, (driverLoad.get(driver.id) ?? 0) + 1);
        const arr = driverTrips.get(driver.id) ?? [];
        arr.push(trip);
        driverTrips.set(driver.id, arr);
      }

      for (const cid of remaining) {
        unassigned.push({
          childId: cid,
          eventId: event.id,
          direction,
          reason: "Keine freien Plätze mehr",
        });
      }
    }
  }

  return { trips, unassigned };
}

export function driverStats(store: Store): { parent: Parent; outbound: number; return: number; total: number }[] {
  return store.parents
    .map((p) => {
      const outbound = store.trips.filter((t) => t.driverId === p.id && t.direction === "outbound").length;
      const ret = store.trips.filter((t) => t.driverId === p.id && t.direction === "return").length;
      return { parent: p, outbound, return: ret, total: outbound + ret };
    })
    .sort((a, b) => b.total - a.total);
}

export function childById(store: Store): Map<string, Child> {
  return new Map(store.children.map((c) => [c.id, c]));
}
