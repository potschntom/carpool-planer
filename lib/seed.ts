import { Store } from "./types";

let counter = 100;
export function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}_${counter}`;
}

export function seedStore(): Store {
  return {
    parents: [
      { id: "p1", name: "Anna Schmidt", phone: "0151 11111111" },
      { id: "p2", name: "Ben Meyer", phone: "0152 22222222" },
      { id: "p3", name: "Clara Weber", phone: "0153 33333333" },
      { id: "p4", name: "Dirk Klein", phone: "0154 44444444" },
    ],
    children: [
      { id: "c1", name: "Emil Schmidt", parentId: "p1" },
      { id: "c2", name: "Fiona Meyer", parentId: "p2" },
      { id: "c3", name: "Greta Weber", parentId: "p3" },
      { id: "c4", name: "Hans Klein", parentId: "p4" },
      { id: "c5", name: "Ida Schmidt", parentId: "p1" },
    ],
    trainings: [
      { id: "t1", name: "Fußball U10", weekday: 2, startTime: "16:00", endTime: "17:30", location: "Sportpark Nord", teamName: "U10" },
      { id: "t2", name: "Schwimmen Jugend", weekday: 2, startTime: "16:30", endTime: "18:00", location: "Hallenbad Mitte", teamName: "Jugend" },
      { id: "t3", name: "Handball U12", weekday: 4, startTime: "17:00", endTime: "18:30", location: "Sporthalle Ost", teamName: "U12" },
      { id: "t4", name: "Tennis Kids", weekday: 5, startTime: "15:00", endTime: "16:00", location: "Tennisclub West", teamName: "Kids" },
    ],
    enrollments: [
      { childId: "c1", trainingId: "t1" },
      { childId: "c2", trainingId: "t1" },
      { childId: "c3", trainingId: "t2" },
      { childId: "c4", trainingId: "t3" },
      { childId: "c5", trainingId: "t2" },
      { childId: "c1", trainingId: "t3" },
    ],
    plan: [],
  };
}
