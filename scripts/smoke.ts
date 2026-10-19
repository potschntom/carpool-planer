import { autoAssignTrips, driverStats, findConflicts } from "../lib/planner";
import { seedStore } from "../lib/seed";

const store = seedStore();

console.log("=== Auto-Planung (Hin + Rück pro Termin) ===");
const { trips, unassigned } = autoAssignTrips(store);
for (const t of trips) {
  const event = store.events.find((e) => e.id === t.eventId);
  const driver = store.parents.find((p) => p.id === t.driverId);
  const kids = t.passengerChildIds
    .map((cid) => store.children.find((c) => c.id === cid)?.name)
    .join(", ");
  console.log(
    `${t.direction === "outbound" ? "HIN " : "RÜCK"} | ${event?.title} (${event?.date}) | ${driver?.name} (${driver?.seats} Plätze) | ${kids}`
  );
}
console.log("Unassigned:", unassigned.length);

console.log("\n=== Kapazitäts-Konflikt-Test ===");
const conflicts = findConflicts(store, [
  { eventId: store.events[0].id, direction: "outbound", driverId: "p4", passengerChildIds: ["c1", "c2", "c3"] },
]);
console.log(conflicts);

console.log("\n=== Fahrer-Doppelbuchung-Test ===");
const conflicts2 = findConflicts(store, [
  { eventId: store.events[0].id, direction: "outbound", driverId: "p1", passengerChildIds: ["c1"] },
  { eventId: store.events[0].id, direction: "return", driverId: "p1", passengerChildIds: ["c1"] },
]);
console.log(conflicts2);

console.log("\n=== Statistik nach Auto-Planung ===");
store.trips = trips;
for (const row of driverStats(store)) {
  console.log(`${row.parent.name}: hin=${row.outbound} rueck=${row.return} gesamt=${row.total}`);
}
