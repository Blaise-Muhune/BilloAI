export type OpsAccount = {
  name: string;
  email: string;
  plan: string;
  status: string;
  createdAt: string;
  lastSeenAt: string;
  onboarded: boolean;
  captures: number;
  high: number;
};

export type OpsMessage = {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
  mailedAt: string;
};

export type OpsOverview = {
  generatedAt: string;
  accounts: {
    total: number;
    day: number;
    week: number;
    seenWeek: number;
    onboarded: number;
    unsubscribed: number;
    capturedPeople: number;
    stillOnIncluded: number;
    byPlan: { free: number; individual: number; organizer: number; team: number };
    byStatus: { none: number; active: number; past_due: number; canceled: number };
  };
  money: {
    individualActive: number;
    teamAdminsActive: number;
    teamSeatsSold: number;
    groupSeatsSold: number;
    groupSeatsUsed: number;
    listedIndividualMonthly: number;
    listedTeamYearly: number;
    listedGroupOnce: number;
    pastDue: number;
  };
  usage: {
    contacts: number;
    contactsWeek: number;
    high: number;
    medium: number;
    low: number;
    unknown: number;
    events: number;
    eventsWeek: number;
    seatEvents: number;
    tasksOpen: number;
    tasksDone: number;
    tasksWeek: number;
    inPlayWeek: number;
  };
  inbox: {
    total: number;
    unmailed: number;
    messages: OpsMessage[];
  };
  atRisk: Array<{ name: string; email: string; plan: string; status: string }>;
  recent: OpsAccount[];
  teams: Array<{
    id: string;
    name: string;
    admin: string;
    email: string;
    seatLimit: number;
    assigned: number;
    active: number;
    captures: number;
  }>;
  groups: Array<{
    id: string;
    name: string;
    date: string;
    organizer: string;
    email: string;
    seatLimit: number;
    seatsUsed: number;
  }>;
};
