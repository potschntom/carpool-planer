import { autoAssignTrips } from "../lib/planner";
import { seedStore } from "../lib/seed";

const mk = () => seedStore();
const locName = (store: ReturnType<typeof mk>, id?: string) =>
  store.locations.find((l) => l.id === id)?.name ?? "?";
const childName = (store: ReturnType<typeof mk>, id: string) =>
  store.children.find((c) => c.id === id)?.name ?? "?";

function print(store: ReturnType<typeof mk>, label: string) {
  console.log(`\n=== ${label} ===`);
  const { trips, unassigned } = autoAssignTrips(store);
  for (const t of trips) {
    const event = store.events.find((e) => e.id === t.eventId);
    const driver = store.parents.find((p) => p.id === t.driverId);
    const kids = t.passengerChildIds.map((cid) => childName(store, cid)).join(", ");
    console.log(
      `${t.direction === "outbound" ? "HIN " : "RÜCK"} | ${event?.title} | ${driver?.name} (Angebot: ✓, Plätze: ${driver?.seats}) | ${kids}`
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

// Szenario 1: Seed-Angebote
print(mk(), "Seed: Anna bietet Hin-Training, Ben Rück-Training, Clara Hin+Rück-Spiel an");

// Szenario 2: Keine Angebote überhaupt
const s2 = mk();
s2.offers = [];
print(s2, "Keine Angebote -> Fehlermeldungen, keine stillen Zuordnungen");

// Szenario 3: Angebot, aber falscher Startort (muss ignoriert werden)
const s3 = mk();
s3.offers = [{ parentId: "p4", eventId: "e1", direction: "outbound" }]; // Dirk (Ostdorf) bietet an
s3.participations = s3.participations.filter((p) => p.eventId === "e1");
print(s3, "Nur Dirk (Ostdorf) bietet an, aber Kinder aus anderen Orten -> Fehler statt Querverordnung");

// Validierung Startort
const { trips } = autoAssignTrips(mk());
const store = mk();
let ok = true;
for (const t of trips.filter((x) => x.direction === "outbound")) {
  const driver = store.parents.find((p) => p.id === t.driverId);
  const kids = t.passengerChildIds.map((cid) => store.children.find((c) => c.id === cid));
  if (driver && kids.some((k) => k?.homeLocationId !== driver.homeLocationId)) {
    ok = false;
    console.log("FEHLER: Kind von fremdem Startort zugeordnet");
  }
  if (driver && !store.offers.some((o) => o.parentId === driver.id && o.eventId === t.eventId && o.direction === "outbound")) {
    ok = false;
    console.log("FEHLER: Fahrer ohne Angebot eingeplant");
  }
}
console.log(`\n${ok ? "OK: Nur Angebote, nur gleicher Startort" : "FEHLER"}`);
