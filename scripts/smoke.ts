import { autoAssignTrips } from "../lib/planner";
import { seedStore } from "../lib/seed";

const store = seedStore();
const locName = (id?: string) => store.locations.find((l) => l.id === id)?.name ?? "?";
const childName = (id: string) => store.children.find((c) => c.id === id)?.name ?? "?";

console.log("Kinder mit Startorten:");
for (const c of store.children) {
  console.log(`  ${c.name} -> ${locName(c.homeLocationId)}`);
}

console.log("\n=== Auto-Planung mit Startort-Gruppierung ===");
const { trips, unassigned } = autoAssignTrips(store);
for (const t of trips) {
  const event = store.events.find((e) => e.id === t.eventId);
  const driver = store.parents.find((p) => p.id === t.driverId);
  const kids = t.passengerChildIds.map(childName).join(", ");
  const start =
    t.direction === "outbound"
      ? locName(store.children.find((c) => c.id === t.passengerChildIds[0])?.homeLocationId)
      : locName(event?.locationId);
  console.log(
    `${t.direction === "outbound" ? "HIN " : "RÜCK"} | ${event?.title} | ${driver?.name} | Start: ${start} | Ziel: ${locName(event?.locationId)} | ${kids}`
  );
}

console.log(`\nUnassigned: ${unassigned.length}`);
for (const u of unassigned) {
  console.log(`  ${childName(u.childId)} (${u.direction}): ${u.reason}`);
}

// Validierung: In jeder Hinfahrt müssen alle Kinder denselben Startort haben
console.log("\n=== Validierung: einheitlicher Startort pro Hinfahrt ===");
let ok = true;
for (const t of trips.filter((x) => x.direction === "outbound")) {
  const starts = new Set(
    t.passengerChildIds.map((cid) => store.children.find((c) => c.id === cid)?.homeLocationId)
  );
  if (starts.size > 1) {
    ok = false;
    console.log(`FEHLER: Fahrt von ${t.driverId} hat Kinder aus ${starts.size} Startorten`);
  }
}
console.log(ok ? "OK: Jede Hinfahrt startet an genau einem Ort" : "FEHLER gefunden");
