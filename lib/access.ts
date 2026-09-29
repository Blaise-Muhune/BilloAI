import { adminDb } from "@/lib/firebase/admin";
import { hasStaffProAccess } from "@/lib/staff-pro";
import type { AccountPlan } from "@/lib/types";

const WINDOW_MS = 60_000;
const LIMIT = 60;

export class AccessError extends Error {
  status: number;
  eventName?: string;
  reason?: "group-seat" | "need-plan";
  constructor(message: string, status: number, extra?: { eventName?: string; reason?: "group-seat" | "need-plan" }) {
    super(message);
    this.status = status;
    this.eventName = extra?.eventName;
    this.reason = extra?.reason;
  }
}

export async function assertAiAccess(uid: string, emailVerified: boolean, eventId?: string) {
  const user = await adminDb().collection("users").doc(uid).get();
  const data = user.data();
  const plan = data?.plan as AccountPlan | undefined;
  const status = data?.subscriptionStatus as string | undefined;
  if (hasStaffProAccess(String(data?.email ?? ""), Boolean(data?.staffAccess))) return;
  const included = Boolean(eventId && (await includedOnEvent(uid, eventId, String(data?.includedEventId ?? ""))));
  let member = false;
  if (eventId) {
    const membership = await adminDb()
      .collection("eventMemberships")
      .where("uid", "==", uid)
      .where("eventId", "==", eventId)
      .limit(1)
      .get();
    member = !membership.empty;
  }
  if (included || member) return;
  if (!emailVerified) {
    throw new AccessError("Verify your email before using AI on more events.", 403);
  }
  if (plan === "individual" && status === "active") return;
  if (await hasActiveTeamSeat(uid)) return;
  const seated = await groupSeatName(uid);
  if (seated) {
    throw new AccessError(
      `The seat was for ${seated}. Next is Individual, a Team seat, or another seat paid for that event.`,
      402,
      { eventName: seated, reason: "group-seat" },
    );
  }
  throw new AccessError("Your first event includes this. After that it is Individual, a Team seat, or a seat paid for that event.", 402, {
    reason: "need-plan",
  });
}

async function hasActiveTeamSeat(uid: string) {
  const seats = await adminDb()
    .collection("teamSeats")
    .where("uid", "==", uid)
    .where("status", "==", "active")
    .limit(1)
    .get();
  if (seats.empty) return false;
  const teamId = String(seats.docs[0]!.data().teamId ?? "");
  if (!teamId) return false;
  const team = await adminDb().collection("teams").doc(teamId).get();
  const adminUid = String(team.data()?.adminUid ?? "");
  if (!adminUid) return false;
  const admin = await adminDb().collection("users").doc(adminUid).get();
  if (hasStaffProAccess(String(admin.data()?.email ?? ""), Boolean(admin.data()?.staffAccess))) return true;
  return admin.data()?.plan === "team" && admin.data()?.subscriptionStatus === "active";
}

async function eventHasContacts(uid: string, eventId: string) {
  const snap = await adminDb()
    .collection("contacts")
    .where("ownerId", "==", uid)
    .where("eventId", "==", eventId)
    .limit(1)
    .get();
  return !snap.empty;
}

async function groupSeatName(uid: string) {
  const memberships = await adminDb().collection("eventMemberships").where("uid", "==", uid).get();
  if (memberships.empty) return "";
  const newest = memberships.docs
    .map((item) => ({
      eventId: String(item.data().eventId ?? ""),
      createdAt: String(item.data().createdAt ?? ""),
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (!newest?.eventId) return "";
  const event = await adminDb().collection("events").doc(newest.eventId).get();
  return String(event.data()?.name ?? "").trim();
}

async function includedOnEvent(uid: string, eventId: string, stored: string) {
  const event = await adminDb().collection("events").doc(eventId).get();
  if (event.data()?.forSeats) return false;
  if (stored && stored === eventId) return true;
  if (stored) {
    const used = await eventHasContacts(uid, stored);
    if (used) return false;
  }
  const events = await adminDb().collection("events").where("ownerId", "==", uid).get();
  for (const item of events.docs) {
    if (item.id === eventId || item.data()?.forSeats) continue;
    if (await eventHasContacts(uid, item.id)) return false;
  }
  return true;
}

export async function claimIncludedEvent(uid: string, eventId?: string) {
  if (!eventId) return;
  const event = await adminDb().collection("events").doc(eventId).get();
  if (!event.exists || event.data()?.forSeats) return;
  const userRef = adminDb().collection("users").doc(uid);
  const user = await userRef.get();
  const stored = String(user.data()?.includedEventId ?? "");
  if (stored === eventId) return;
  if (stored && (await eventHasContacts(uid, stored))) return;
  await userRef.set({ includedEventId: eventId }, { merge: true });
}

export async function accessStatus(uid: string) {
  const user = await adminDb().collection("users").doc(uid).get();
  const data = user.data();
  const plan = data?.plan as AccountPlan | undefined;
  const status = data?.subscriptionStatus as string | undefined;
  if (hasStaffProAccess(String(data?.email ?? ""), Boolean(data?.staffAccess))) {
    return { kind: "staff" as const, line: "Staff access · Individual, Group, and Team.", eventName: "" };
  }
  if (await hasActiveTeamSeat(uid)) {
    return { kind: "team" as const, line: "You’re on a Team seat.", eventName: "" };
  }
  if (plan === "team" && status === "active") {
    return { kind: "team" as const, line: "You’re on a Team seat.", eventName: "" };
  }
  const seated = await groupSeatName(uid);
  if (seated) {
    return { kind: "group" as const, line: `This event is a Group seat for ${seated}.`, eventName: seated };
  }
  if (plan === "individual" && status === "active") {
    return { kind: "individual" as const, line: "You’re on Individual.", eventName: "" };
  }
  const stored = String(data?.includedEventId ?? "");
  let includedName = "";
  if (stored && (await eventHasContacts(uid, stored))) {
    const included = await adminDb().collection("events").doc(stored).get();
    includedName = String(included.data()?.name ?? "").trim();
  }
  return {
    kind: "included" as const,
    line: includedName ? `First event included · ${includedName}.` : "First event included.",
    eventName: includedName,
  };
}

export async function assertRateLimit(uid: string) {
  const ref = adminDb().collection("rateLimits").doc(uid);
  const now = Date.now();
  await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const start = Number(snap.data()?.windowStart ?? 0);
    const count = Number(snap.data()?.count ?? 0);
    if (now - start > WINDOW_MS) {
      tx.set(ref, { windowStart: now, count: 1 });
      return;
    }
    if (count >= LIMIT) {
      throw new AccessError("Too many AI requests. Wait a minute and try again.", 429);
    }
    tx.set(ref, { windowStart: start, count: count + 1 });
  });
}
