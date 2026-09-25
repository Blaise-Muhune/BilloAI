export const NETWORKING_GOALS = [
  "customers",
  "investors",
  "partners",
  "suppliers",
  "recruiting",
  "mentors",
  "jobs",
  "relationships",
  "other",
] as const;

export type NetworkingGoal = (typeof NETWORKING_GOALS)[number];

export const GOAL_LABELS: Record<NetworkingGoal, string> = {
  customers: "Find customers",
  investors: "Find investors",
  partners: "Find partners",
  suppliers: "Find suppliers",
  recruiting: "Recruit people",
  mentors: "Find mentors",
  jobs: "Find job opportunities",
  relationships: "Build industry relationships",
  other: "Something else",
};

export const CONTACT_SOURCES = [
  "card",
  "screenshot",
  "photo",
  "manual",
  "linkedin_qr",
  "billo_qr",
] as const;

export type ContactSource = (typeof CONTACT_SOURCES)[number];

export type RelevanceLevel = "high" | "medium" | "low";

export const TASK_CHANNELS = ["email", "linkedin", "text", "call", "intro"] as const;

export type TaskChannel = (typeof TASK_CHANNELS)[number];

export type TaskStatus = "open" | "done";

export type AccountPlan = "free" | "individual" | "organizer";
export type SubscriptionStatus = "none" | "active" | "past_due" | "canceled";

export interface UserDoc {
  name: string;
  email: string;
  createdAt: string;
  plan: AccountPlan;
  subscriptionStatus: SubscriptionStatus;
  stripeCustomerId: string;
  consentAt: string;
  onboardedAt?: string;
}

export interface PublicProfile {
  name: string;
  company: string;
  title: string;
  email: string;
  linkedin: string;
  website: string;
}

export interface EventInput {
  name: string;
  type: string;
  location: string;
  date: string;
  goal: NetworkingGoal;
  goalDetail: string;
  targetPeople: string;
  targetCompaniesOrRoles: string;
}

export interface EventDoc extends EventInput {
  ownerId: string;
  createdAt: string;
  organizedEventId: string;
}

export interface OrganizedEventDoc {
  organizerId: string;
  eventId: string;
  name: string;
  seatLimit: number;
  seatsUsed: number;
  joinCode: string;
  createdAt: string;
}

export interface EventMembershipDoc {
  uid: string;
  eventId: string;
  organizedEventId: string;
  createdAt: string;
}

export interface StructuredNote {
  painPoint: string;
  interest: string;
  opportunity: string;
  personalDetail: string;
  followUpPromise: string;
}

export interface EnrichmentNews {
  title: string;
  url: string;
}

export interface Enrichment {
  companyDescription: string;
  industry: string;
  companySize: string;
  roleSummary: string;
  products: string;
  priorities: string;
  interests: string;
  news: EnrichmentNews[];
  sources: string[];
  unavailable: boolean;
}

export interface Relevance {
  level: RelevanceLevel;
  reasons: string[];
  suggestedAction: string;
  opportunityType: string;
}

export interface ContactFields {
  name: string;
  company: string;
  title: string;
  email: string;
  phone: string;
  website: string;
  linkedin: string;
  location: string;
}

export interface ContactDoc extends ContactFields {
  ownerId: string;
  eventId: string;
  source: ContactSource;
  imagePath: string;
  rawNote: string;
  structuredNote: StructuredNote | null;
  enrichment: Enrichment | null;
  relevance: Relevance | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDoc {
  ownerId: string;
  contactId: string;
  eventId: string;
  contactName: string;
  channel: TaskChannel;
  title: string;
  draft: string;
  dueDate: string;
  status: TaskStatus;
  createdAt: string;
}

export type EventRecord = EventDoc & { id: string };
export type ContactRecord = ContactDoc & { id: string };
export type TaskRecord = TaskDoc & { id: string };

export interface FollowUpDraft {
  channel: TaskChannel;
  title: string;
  body: string;
  dueDate: string;
}

export interface UnderstandResult {
  structuredNote: StructuredNote;
  enrichment: Enrichment;
  relevance: Relevance;
  draft: FollowUpDraft;
}
