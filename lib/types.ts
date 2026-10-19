export type Parent = {
  id: string;
  name: string;
  phone?: string;
};

export type Child = {
  id: string;
  name: string;
  parentId: string;
};

export type Training = {
  id: string;
  name: string;
  weekday: number; // 0=So ... 6=Sa
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  location: string;
  teamName?: string;
};

export type Enrollment = {
  childId: string;
  trainingId: string;
};

export type DriverAssignment = {
  trainingId: string;
  driverId: string; // parentId
  passengerChildIds: string[];
  date: string; // ISO yyyy-mm-dd (konkretes Datum der Fahrt)
};

export type Plan = DriverAssignment[];

export type Conflict = {
  type: "driver_double_booked" | "child_double_booked";
  parentId?: string;
  childId?: string;
  date: string;
  description: string;
};

export type Store = {
  parents: Parent[];
  children: Child[];
  trainings: Training[];
  enrollments: Enrollment[];
  plan: Plan;
};
