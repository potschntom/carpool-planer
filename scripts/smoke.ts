import { autoAssignTrips } from "../lib/planner";
import { seedStore } from "../lib/seed";

const locName = (store: ReturnType<typeof seedStore>, id?: string) =>
  store.locations.find((l) => l.id === id)?.name ?? "?";
const childName = (store: ReturnType<typeof seedStore>, id: string) =>
  store.children.find((c) => c.id === id)?.name ?? "?";

function print(store: ReturnType<typeof seedStore>, label: string) {
  console.log(`\n=== ${label} ===`);
  const { trips, unassigned } = autoAssignTrips(store);
  for (const t of trips) {
    const event = store.events.find((e) => e.id === t.eventId);
    const driver = store.parents.find((p) => p.id === t.driverId);
    const kids = t.passengerChildIds.map((cid) => childName(store, cid)).join(", ");
    const start =
      t.direction === "outbound"
        ? locName(store, store.children.find((c) => c.id === t.passengerChildIds[0])?.homeLocationId)
        : locName(store, event?.locationId);
    const must = driver && store.children.some((c) => c.parentId === driver.id && t.passengerChildIds.includes(c.id))
      ? "Muss-Fahrer"
      : "Freiwillig";
    console.log(
      `${t.direction === "outbound" ? "HIN " : "RÜCK"} | ${event?.title} | ${driver?.name} (${must}) | Start: ${start} | ${kids}`
    );
  }
  if (unassigned.length > 0) {
    console.log("Unassigned:");
    for (const u of unassigned) {
      console.log(`  ${childName(store, u.childId)}: ${u.reason}`);
    }
  } else {
    console.log("Unassigned: 0");
  }
}

// Szenario 1: Standard
print(seedStore(), "Standard: alle Orte haben Fahrer");

// Szenario 2: Startort ohne Fahrer mit freien Plätzen
const s2 = seedStore();
s2.parents = s2.parents.map((p) => ({ ...p, seats: 0 })); // alle Fahrer auf 0 Plätze
print(s2, "Niemand hat freie Plätze -> Fehlermeldung statt falscher Zuordnung");

// Szenario 3: Nur Eltern mit eigenes-Kind-Teilnahme als Must-Driver bevorzugt
const s3 = seedStore();
print(s3, "Must-Driver-Priorität: Fahrer mit eigenem Kind werden zuerst eingeplant");

// Validierung: keine Hinfahrt von fremdem Startort
const { trips } = autoAssignTrips(seedStore());
let ok = true;
const store = seedStore();
for (const t of trips.filter((x) => x.direction === "outbound")) {
  const driver = store.parents.find((p) => p.id === t.driverId);
  const kids = t.passengerChildIds.map((cid) => store.children.find((c) => c.id === cid));
  if (driver && kids.some((k) => k?.homeLocationId !== driver.homeLocationId)) {
    ok = false;
    console.log("FEHLER: Fahrer fährt Kinder von fremdem Startort");
  }
}
console.log(`\n${ok ? "OK: Hinfahrten nur von eigenem Startort" : "FEHLER"}`);
