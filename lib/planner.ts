import { Child, Conflict, DriverAssignment, Enrollment, Parent, Plan, Training } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

export function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function fromMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function timesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function nextOccurrenceOfWeekday(weekday: number, from = new Date()): Date {
  const d = new Date(from);
  const diff = (weekday - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function weekdayName(weekday: number): string {
  const names = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  return names[weekday] ?? String(weekday);
}

function windowForTraining(training: Training, bufferMin = 15): { start: number; end: number } {
  const start = toMinutes(training.startTime) - bufferMin;
  const end = toMinutes(training.endTime) + bufferMin;
  return { start, end };
}

export function findConflicts(store: {
  parents: Parent[];
  children: Child[];
  trainings: Training[];
  enrollments: Enrollment[];
  plan: Plan;
}): Conflict[] {
  const conflicts: Conflict[] = [];
  const trainingById = new Map(store.trainings.map((t) => [t.id, t]));

  const childBookings = new Map<string, { training: Training; date: string }[]>();
  for (const e of store.enrollments) {
    const t = trainingById.get(e.trainingId);
    if (!t) continue;
    const date = formatDate(nextOccurrenceOfWeekday(t.weekday));
    const arr = childBookings.get(e.childId) ?? [];
    arr.push({ training: t, date });
    childBookings.set(e.childId, arr);
  }

  const driverBookings = new Map<string, { assignment: DriverAssignment; training: Training }[]>();
  for (const a of store.plan) {
    const t = trainingById.get(a.trainingId);
    if (!t) continue;
    const arr = driverBookings.get(a.driverId) ?? [];
    arr.push({ assignment: a, training: t });
    driverBookings.set(a.driverId, arr);
  }

  for (const [childId, bookings] of childBookings) {
    for (let i = 0; i < bookings.length; i++) {
      for (let j = i + 1; j < bookings.length; j++) {
        const a = bookings[i];
        const b = bookings[j];
        if (a.date !== b.date) continue;
        if (!timesOverlap(
          toMinutes(a.training.startTime),
          toMinutes(a.training.endTime),
          toMinutes(b.training.startTime),
          toMinutes(b.training.endTime)
        )) continue;
        conflicts.push({
          type: "child_double_booked",
          childId,
          date: a.date,
          description: `Kind ist zur selben Zeit in zwei Trainings: ${a.training.name} und ${b.training.name}`,
        });
      }
    }
  }

  for (const [parentId, bookings] of driverBookings) {
    for (let i = 0; i < bookings.length; i++) {
      for (let j = i + 1; j < bookings.length; j++) {
        const a = bookings[i];
        const b = bookings[j];
        if (a.assignment.date !== b.assignment.date) continue;
        const wa = windowForTraining(a.training);
        const wb = windowForTraining(b.training);
        if (!timesOverlap(wa.start, wa.end, wb.start, wb.end)) continue;
        conflicts.push({
          type: "driver_double_booked",
          parentId,
          date: a.assignment.date,
          description: `Fahrer ist zeitlich überlappt: ${a.training.name} und ${b.training.name}`,
        });
      }
    }
  }

  return conflicts;
}

export function autoAssignDrivers(store: {
  parents: Parent[];
  children: Child[];
  trainings: Training[];
  enrollments: Enrollment[];
  plan: Plan;
}): { plan: Plan; unassigned: { childId: string; trainingId: string; reason: string }[] } {
  const trainingById = new Map(store.trainings.map((t) => [t.id, t]));
  const childById = new Map(store.children.map((c) => [c.id, c]));
  const parentById = new Map(store.parents.map((p) => [p.id, p]));

  type Need = {
    childId: string;
    trainingId: string;
    date: string;
    window: { start: number; end: number };
  };

  const needs: Need[] = [];
  for (const e of store.enrollments) {
    const t = trainingById.get(e.trainingId);
    if (!t) continue;
    needs.push({
      childId: e.childId,
      trainingId: e.trainingId,
      date: formatDate(nextOccurrenceOfWeekday(t.weekday)),
      window: windowForTraining(t),
    });
  }

  const newPlan: Plan = [];
  const unassigned: { childId: string; trainingId: string; reason: string }[] = [];

  const driverLoad = new Map<string, number>();
  const driverBusy = new Map<string, { date: string; start: number; end: number }[]>();

  const grouped = new Map<string, Need[]>();
  for (const n of needs) {
    const key = `${n.trainingId}|${n.date}`;
    const arr = grouped.get(key) ?? [];
    arr.push(n);
    grouped.set(key, arr);
  }

  const assignmentsByDriver = new Map<string, DriverAssignment[]>();
  for (const a of newPlan) {
    const arr = assignmentsByDriver.get(a.driverId) ?? [];
    arr.push(a);
    assignmentsByDriver.set(a.driverId, arr);
  }

  for (const [key, groupNeeds] of grouped) {
    const [trainingId, date] = key.split("|");
    const training = trainingById.get(trainingId);
    if (!training) continue;

    let remaining = [...groupNeeds];
    const candidates = [...store.parents].sort(
      (a, b) => (driverLoad.get(a.id) ?? 0) - (driverLoad.get(b.id) ?? 0)
    );

    for (const driver of candidates) {
      if (remaining.length === 0) break;

      const busy = driverBusy.get(driver.id) ?? [];
      const hasConflictOnDate = busy.some(
        (b) => b.date === date && timesOverlap(b.start, b.end, groupNeeds[0].window.start, groupNeeds[0].window.end)
      );
      if (hasConflictOnDate) continue;

      const seatCapacity = 4;
      const take = remaining.slice(0, seatCapacity);
      if (take.length === 0) continue;

      const assignment: DriverAssignment = {
        trainingId,
        driverId: driver.id,
        passengerChildIds: take.map((n) => n.childId),
        date,
      };
      newPlan.push(assignment);
      remaining = remaining.slice(take.length);
      driverLoad.set(driver.id, (driverLoad.get(driver.id) ?? 0) + 1);
      busy.push({ date, start: groupNeeds[0].window.start, end: groupNeeds[0].window.end });
      driverBusy.set(driver.id, busy);

      const arr = assignmentsByDriver.get(driver.id) ?? [];
      arr.push(assignment);
      assignmentsByDriver.set(driver.id, arr);
    }

    for (const n of remaining) {
      const child = childById.get(n.childId);
      const driver = parentById.get(child?.parentId ?? "");
      unassigned.push({
        childId: n.childId,
        trainingId: n.trainingId,
        reason: driver
          ? "Kein verfügbarer Fahrer im Zeitfenster"
          : "Kein verknüpftes Familienmitglied verfügbar",
      });
    }
  }

  return { plan: newPlan, unassigned };
}
