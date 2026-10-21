export type Location = {
  id: string;
  name: string;
  meetingPoint?: string;
};

export type Parent = {
  id: string;
  name: string;
  phone?: string;
  seats: number;
  homeLocationId?: string;
};

export type Child = {
  id: string;
  name: string;
  parentId: string;
  homeLocationId?: string;
};

export type EventType = "training" | "match";

export type Event = {
  id: string;
  type: EventType;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  locationId: string;
  meetingPoint?: string;
  opponent?: string;
  isHome: boolean;
};

export type Participation = {
  childId: string;
  eventId: string;
};

export type Direction = "outbound" | "return";

export type Trip = {
  eventId: string;
  direction: Direction;
  driverId: string;
  passengerChildIds: string[];
};

export type AvailabilityOffer = {
  parentId: string;
  eventId: string;
  direction: Direction;
};

export type Store = {
  locations: Location[];
  parents: Parent[];
  children: Child[];
  events: Event[];
  participations: Participation[];
  trips: Trip[];
  offers: AvailabilityOffer[];
};

export type Conflict = {
  type: "child_double_booked" | "driver_double_booked" | "capacity_exceeded";
  description: string;
};
