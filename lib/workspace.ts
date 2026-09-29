export type Workspace = "network" | "group" | "team";
export type GroupKind = "company" | "event";

const INTENT_KEY = "billo-intent";
const JOIN_KEY = "billo-join";
const JOIN_FROM_KEY = "billo-join-from";
const NEXT_KEY = "billo-next";

export function safeAppPath(value: string | null | undefined) {
  if (!value) return "";
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("://")) return "";
  if (value.startsWith("/login") || value.startsWith("/signup")) return "";
  return value;
}

export function persistNextPath(value: string | null | undefined) {
  if (typeof window === "undefined") return;
  const path = safeAppPath(value);
  if (path) sessionStorage.setItem(NEXT_KEY, path);
}

export function peekNextPath() {
  if (typeof window === "undefined") return "";
  return safeAppPath(sessionStorage.getItem(NEXT_KEY));
}

export function consumeNextPath() {
  const path = peekNextPath();
  if (typeof window !== "undefined") sessionStorage.removeItem(NEXT_KEY);
  return path;
}

export function isGroupIntent(value: string | null | undefined) {
  return value === "group" || value === "company" || value === "organizer" || value === "event";
}

export function isTeamIntent(value: string | null | undefined) {
  return value === "team";
}

export function groupKindFromIntent(value: string | null | undefined): GroupKind | "" {
  if (value === "company") return "company";
  if (value === "organizer" || value === "event") return "event";
  return "";
}

export function readWorkspace(value: string | null | undefined): Workspace {
  if (value === "group") return "group";
  if (value === "team") return "team";
  return "network";
}

export function persistAuthContext(input: { for?: string | null; code?: string | null; from?: string | null; next?: string | null }) {
  if (typeof window === "undefined") return;
  if (isGroupIntent(input.for) || isTeamIntent(input.for)) sessionStorage.setItem(INTENT_KEY, input.for!);
  if (input.from === "team") sessionStorage.setItem(INTENT_KEY, "team");
  const code = input.code?.trim().toLowerCase();
  if (code) sessionStorage.setItem(JOIN_KEY, code);
  if (input.from === "company" || input.from === "event" || input.from === "team") sessionStorage.setItem(JOIN_FROM_KEY, input.from);
  persistNextPath(input.next);
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

export function invitePath(code: string, from?: GroupKind | "team" | "" | null) {
  const kind = from === "company" || from === "event" || from === "team" ? from : "";
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
  if (isTeamIntent(intent)) {
    return input.onboarded ? "/team" : "/onboarding?for=team";
  }
  if (isGroupIntent(intent)) {
    const forParam = intent === "company" ? "company" : "group";
    return input.onboarded ? "/group" : `/onboarding?for=${forParam}`;
  }
  const next = peekNextPath();
  if (next) return input.onboarded ? consumeNextPath() : "/onboarding";
  return input.onboarded ? "/home" : "/onboarding";
}

export function teamBillingHref() {
  return "/billing?plan=team";
}

export function teamCopy() {
  return {
    kicker: "For a sales team",
    switchLabel: "Team",
    overviewTitle: "One hunt. Seats you can move.",
    overviewBody:
      "Pay by the seat for the year. Every assigned seat gets matching on every event. You see who has a seat. You set the companies you are hunting. Teammates see when someone already has a live conversation at that company — never contact names, notes, or drafts.",
    neverSee: "Teammates never see who you met.",
    joinTitle: "Your company saved you a seat",
    joinBody: "This seat is year-round. Who you meet stays on your account. Your admin sees that you used a seat. They never see who you met, your notes, or drafts.",
    shareLabel: "Send this to invited emails only",
    emptySeats: "Pay for at least five seats, then invite people by email.",
  };
}

export function groupCopy(kind: GroupKind | "" | undefined) {
  if (kind === "company") {
    return {
      kicker: "For a company",
      switchLabel: "Group",
      overviewTitle: "This event, not their contacts",
      overviewBody:
        "You buy seats for one named event. You see who used a seat. They keep who they met. Unused seats stay with this event. You never see who they met, notes, or drafts.",
      neverSee: "Your company never sees who you met.",
      joinTitle: "Your company set this up for you",
      joinBody: "This seat is for this event. Who you meet stays on your account. They see that you used a seat. They never see who you met. The next event is Individual, or another seat they buy.",
      shareLabel: "Send this to your team",
      emptySeats: "Name the event they are attending, then pay for seats for that event.",
    };
  }
  if (kind === "event") {
    return {
      kicker: "For a room",
      switchLabel: "Group",
      overviewTitle: "This event, not their notebooks",
      overviewBody:
        "You buy seats for one event. You see who used a seat and whether they followed through. Attendees keep their own conversations. Unused seats stay with this event. You never see who they met.",
      neverSee: "The host never sees who you met.",
      joinTitle: "You were invited to this event",
      joinBody: "This seat is for this event. Who you meet stays on your account. The host sees that you used a seat. They never see who you met. The next event is Individual, or another seat from the host.",
      shareLabel: "Send this to the room",
      emptySeats: "Name the event, then pay for seats once for that event.",
    };
  }
  return {
    kicker: "For a group",
    switchLabel: "Group",
    overviewTitle: "Who used a seat. Never their contacts.",
    overviewBody:
      "Pay for one event: a company sending people, or a host buying for a room. You see who used a seat and the counts. Unused seats stay with that event. You never see who they met, notes, or drafts.",
    neverSee: "The group that invited you never sees who you met.",
    joinTitle: "You were invited",
    joinBody: "This seat is for this event. Who you meet stays on your account. They see that you used a seat. They never see who you met. The next event is Individual, or another seat.",
    shareLabel: "Send this to people you are paying for",
    emptySeats: "Name the event, then pay for seats for that event.",
  };
}
