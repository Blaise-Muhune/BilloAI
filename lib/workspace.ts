export type Workspace = "network" | "group";
export type GroupKind = "company" | "event";

const INTENT_KEY = "billo-intent";
const JOIN_KEY = "billo-join";
const JOIN_FROM_KEY = "billo-join-from";

export function isGroupIntent(value: string | null | undefined) {
  return value === "group" || value === "company" || value === "organizer" || value === "event";
}

export function groupKindFromIntent(value: string | null | undefined): GroupKind | "" {
  if (value === "company") return "company";
  if (value === "organizer" || value === "event") return "event";
  return "";
}

export function readWorkspace(value: string | null | undefined): Workspace {
  return value === "group" ? "group" : "network";
}

export function persistAuthContext(input: { for?: string | null; code?: string | null; from?: string | null }) {
  if (typeof window === "undefined") return;
  if (isGroupIntent(input.for)) sessionStorage.setItem(INTENT_KEY, input.for!);
  const code = input.code?.trim().toLowerCase();
  if (code) sessionStorage.setItem(JOIN_KEY, code);
  if (input.from === "company" || input.from === "event") sessionStorage.setItem(JOIN_FROM_KEY, input.from);
}

export function readStoredIntent() {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(INTENT_KEY) || "";
}

export function readJoinCode() {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(JOIN_KEY)?.trim().toLowerCase() || "";
}

export function readJoinFrom(): GroupKind | "" {
  if (typeof window === "undefined") return "";
  const value = sessionStorage.getItem(JOIN_FROM_KEY);
  return value === "company" || value === "event" ? value : "";
}

export function clearJoinCode() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(JOIN_KEY);
  sessionStorage.removeItem(JOIN_FROM_KEY);
}

export function invitePath(code: string, from?: GroupKind | "" | null) {
  const kind = from === "company" || from === "event" ? from : "";
  const suffix = kind ? `&from=${kind}` : "";
  return `/join?code=${encodeURIComponent(code)}${suffix}`;
}

export function pathAfterAuth(input: { onboarded: boolean }) {
  const join = readJoinCode();
  const from = readJoinFrom();
  if (join) return input.onboarded ? invitePath(join, from) : "/onboarding?join=1";
  const intent = readStoredIntent();
  if (isGroupIntent(intent)) {
    const forParam = intent === "company" ? "company" : "group";
    return input.onboarded ? "/group" : `/onboarding?for=${forParam}`;
  }
  return input.onboarded ? "/home" : "/onboarding";
}

export function groupCopy(kind: GroupKind | "" | undefined) {
  if (kind === "company") {
    return {
      kicker: "For a company",
      switchLabel: "Group",
      overviewTitle: "The team, not their contacts",
      overviewBody: "You pay so your people can keep who they met. You see counts. You never see names, notes, or drafts.",
      neverSee: "Your company never sees who you met.",
      joinTitle: "Your company set this up for you",
      joinBody: "Use the code they sent. Who you meet stays on your account.",
      shareLabel: "Send this to your team",
      emptySeats: "Create the event or night this team is attending, then pay for seats.",
    };
  }
  if (kind === "event") {
    return {
      kicker: "For a room",
      switchLabel: "Group",
      overviewTitle: "The room, not the people",
      overviewBody: "You pay for seats. Attendees keep their own conversations. You see whether the night worked.",
      neverSee: "The host never sees who you met.",
      joinTitle: "You were invited to this event",
      joinBody: "Use the code from the host. Who you meet stays on your account.",
      shareLabel: "Send this to the room",
      emptySeats: "Create the event, then pay for seats once.",
    };
  }
  return {
    kicker: "For a group",
    switchLabel: "Group",
    overviewTitle: "Counts only. Never their contacts.",
    overviewBody: "Pay for a company, a sales team, or a networking room. You see how many people joined and stayed connected. You never see who they met.",
    neverSee: "The group that invited you never sees who you met.",
    joinTitle: "You were invited",
    joinBody: "Use the code you were sent. Who you meet stays on your account. They see counts, not names.",
    shareLabel: "Send this to people you are paying for",
    emptySeats: "Name the event or night, then pay for seats.",
  };
}
