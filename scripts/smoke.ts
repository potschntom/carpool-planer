import { autoAssignDrivers, findConflicts } from "../lib/planner";
import { seedStore } from "../lib/seed";

const store = seedStore();

const childById = new Map(store.children.map((c) => [c.id, c]));
const parentById = new Map(store.parents.map((p) => [p.id, p]));
const trainingById = new Map(store.trainings.map((t) => [t.id, t]));

console.log("=== Auto-Planung ===");
const { plan, unassigned } = autoAssignDrivers(store);
for (const a of plan) {
  const t = trainingById.get(a.trainingId);
  const driver = parentById.get(a.driverId);
  console.log(
    `${driver?.name} fährt am ${a.date} zu ${t?.name} (${t?.startTime}-${t?.endTime}) mit: ${a.passengerChildIds
      .map((cid) => childById.get(cid)?.name)
      .join(", ")}`
  );
}
console.log("Unassigned:", unassigned);

console.log("\n=== Konflikte (nach Planung) ===");
const conflicts = findConflicts({ ...store, plan });
console.log(conflicts);

console.log("\n=== Konflikt-Szenario: Kind doppelt gebucht ===");
store.enrollments.push({ childId: "c2", trainingId: "t2" });
const conflicts2 = findConflicts({ ...store, plan });
console.log(conflicts2);
