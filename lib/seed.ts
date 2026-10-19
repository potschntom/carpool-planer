import { Store } from "./types";

export function seedStore(): Store {
  return {
    locations: [
      { id: "l1", name: "Platz Nordstadt", meetingPoint: "Parkplatz an der Sporthalle" },
      { id: "l2", name: "Platz Süddorf", meetingPoint: "Haupteingang Sportanlage" },
      { id: "l3", name: "Platz Westheim", meetingPoint: "Ecke Hauptstraße/Tor 2" },
      { id: "l4", name: "Platz Ostdorf", meetingPoint: "An der alten Mühle" },
    ],
    parents: [
      { id: "p1", name: "Anna Schmidt", phone: "0151 11111111", seats: 4, homeLocationId: "l1" },
      { id: "p2", name: "Ben Meyer", phone: "0152 22222222", seats: 3, homeLocationId: "l2" },
      { id: "p3", name: "Clara Weber", phone: "0153 33333333", seats: 5, homeLocationId: "l3" },
      { id: "p4", name: "Dirk Klein", phone: "0154 44444444", seats: 2, homeLocationId: "l4" },
    ],
    children: [
      { id: "c1", name: "Emil Schmidt", parentId: "p1", homeLocationId: "l1" },
      { id: "c2", name: "Fiona Meyer", parentId: "p2", homeLocationId: "l2" },
      { id: "c3", name: "Greta Weber", parentId: "p3", homeLocationId: "l3" },
      { id: "c4", name: "Hans Klein", parentId: "p4", homeLocationId: "l4" },
      { id: "c5", name: "Ida Schmidt", parentId: "p1", homeLocationId: "l1" },
      { id: "c6", name: "Jonas Weber", parentId: "p3", homeLocationId: "l3" },
    ],
    events: [
      { id: "e1", type: "training", title: "Training U12", date: nextDate(2), startTime: "17:00", endTime: "18:30", locationId: "l1", isHome: true },
      { id: "e2", type: "match", title: "Spiel vs. FC Rival", date: nextDate(6), startTime: "10:00", endTime: "11:30", locationId: "l3", opponent: "FC Rival", isHome: false },
    ],
    participations: [
      { childId: "c1", eventId: "e1" },
      { childId: "c2", eventId: "e1" },
      { childId: "c3", eventId: "e1" },
      { childId: "c4", eventId: "e2" },
      { childId: "c5", eventId: "e2" },
      { childId: "c6", eventId: "e2" },
    ],
    trips: [],
  };
}

function nextDate(weekday: number): string {
  const d = new Date();
  const diff = (weekday - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
