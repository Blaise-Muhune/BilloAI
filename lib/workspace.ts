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

export function groupSeatsHref(eventId?: string) {
  const params = new URLSearchParams({ plan: "organizer" });
  if (eventId) params.set("event", eventId);
  return `/billing?${params.toString()}`;
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
      overviewTitle: "This event, not their contacts",
      overviewBody:
        "You buy seats for one named event. Your people keep who they met. You see how many seats were used. Unused seats stay with this event. You never see who joined, who they met, notes, or drafts.",
      neverSee: "Your company never sees who you met.",
      joinTitle: "Your company set this up for you",
      joinBody: "This seat is for this event. Who you meet stays on your account. The next event is Individual, or another seat they buy.",
      shareLabel: "Send this to your team",
      emptySeats: "Name the event they are attending, then pay for seats for that night.",
    };
  }
  if (kind === "event") {
    return {
      kicker: "For a room",
      switchLabel: "Group",
      overviewTitle: "This night, not the people",
      overviewBody:
        "You buy seats for one event. Attendees keep their own conversations. Unused seats stay with this event. You see whether the night worked, not who was in the room.",
      neverSee: "The host never sees who you met.",
      joinTitle: "You were invited to this event",
      joinBody: "This seat is for this event. Who you meet stays on your account. The next event is Individual, or another seat from the host.",
      shareLabel: "Send this to the room",
      emptySeats: "Name the event, then pay for seats once for that night.",
    };
  }
  return {
    kicker: "For a group",
    switchLabel: "Group",
    overviewTitle: "Counts only. Never their contacts.",
    overviewBody:
      "Pay for one event: a company sending people, or a host buying for a room. You see how many seats were used. Unused seats stay with that event. You never see who joined or who they met.",
    neverSee: "The group that invited you never sees who you met.",
    joinTitle: "You were invited",
    joinBody: "This seat is for this event. Who you meet stays on your account. They see counts, not names. The next event is Individual, or another seat.",
    shareLabel: "Send this to people you are paying for",
    emptySeats: "Name the event, then pay for seats for that night.",
  };
}
