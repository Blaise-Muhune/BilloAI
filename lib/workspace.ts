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

export function hasGroupWorkspace(account?: {
  staffAccess?: boolean;
  groupKind?: GroupKind | "";
  plan?: string;
  workspace?: Workspace;
} | null) {
  if (!account) return false;
  return Boolean(account.staffAccess || account.groupKind || account.plan === "organizer" || account.workspace === "group");
}

export function hasTeamWorkspace(account?: { staffAccess?: boolean; plan?: string; teamId?: string } | null) {
  if (!account) return false;
  return Boolean(account.staffAccess || account.plan === "team" || account.teamId);
}

export function otherWorkspaceLinks(
  current: Workspace,
  account?: Parameters<typeof hasGroupWorkspace>[0],
): { href: string; label: string }[] {
  const links: { href: string; label: string }[] = [];
  if (current !== "network") links.push({ href: "/home", label: "My network" });
  if (hasGroupWorkspace(account) && current !== "group") links.push({ href: "/group", label: "The group" });
  if (hasTeamWorkspace(account) && current !== "team") links.push({ href: "/team", label: "The team" });
  return links;
}

export function workspaceLabel(workspace: Workspace) {
  if (workspace === "group") return "The group";
  if (workspace === "team") return "The team";
  return "My network";
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
      "Pay by the seat for the year. Every assigned seat gets matching on every event. You set the companies you are hunting. You see who has a seat, coverage, and when a company is already in play. Move a seat when someone leaves.",
    neverSee: "Who you meet stays on your account.",
    joinTitle: "Your company saved you a seat",
    joinBody: "This seat is year-round. Who you meet stays on your account. Scoring uses the hunt they set. Your admin sees that you used a seat.",
    shareLabel: "Send this to invited emails only",
    emptySeats: "Pay for at least five seats, then invite people by email.",
  };
}

export function groupCopy(kind: GroupKind | "" | undefined) {
  if (kind === "company") {
    return {
      kicker: "For a company",
      switchLabel: "Group",
      overviewTitle: "See who used the seat",
      overviewBody:
        "You buy seats for one named event. You see who went, who captured someone, and whether they followed through. Unused seats stay with this event.",
      neverSee: "Who you meet stays on your account.",
      joinTitle: "Your company set this up for you",
      joinBody: "This seat is for this event. Who you meet stays on your account. They see that you used a seat. The next event is Individual, or another seat they buy.",
      shareLabel: "Send this to your team",
      emptySeats: "Name the event they are attending, then pay for seats for that event.",
    };
  }
  if (kind === "event") {
    return {
      kicker: "For a room",
      switchLabel: "Group",
      overviewTitle: "See if they followed through",
      overviewBody:
        "You buy seats for one event. You see who used a seat, how many people captured someone, and how many follow-ups got done. Unused seats stay with this event.",
      neverSee: "Who you meet stays on your account.",
      joinTitle: "You were invited to this event",
      joinBody: "This seat is for this event. Who you meet stays on your account. The host sees that you used a seat. The next event is Individual, or another seat from the host.",
      shareLabel: "Send this to the room",
      emptySeats: "Name the event, then pay for seats once for that event.",
    };
  }
  return {
    kicker: "For a group",
    switchLabel: "Group",
    overviewTitle: "See who used a seat",
    overviewBody:
      "Pay for one event: a company sending people, or a host buying for a room. You see who used a seat, who captured someone, and whether they followed through. Unused seats stay with that event.",
    neverSee: "Who you meet stays on your account.",
    joinTitle: "You were invited",
    joinBody: "This seat is for this event. Who you meet stays on your account. They see that you used a seat. The next event is Individual, or another seat.",
    shareLabel: "Send this to people you are paying for",
    emptySeats: "Name the event, then pay for seats for that event.",
  };
}
