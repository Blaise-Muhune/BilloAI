import { adminDb } from "@/lib/firebase/admin";
import type { AccountPlan } from "@/lib/types";

const WINDOW_MS = 60_000;
const LIMIT = 60;

export class AccessError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function assertAiAccess(uid: string, emailVerified: boolean, eventId?: string) {
  const user = await adminDb().collection("users").doc(uid).get();
  const data = user.data();
  const plan = data?.plan as AccountPlan | undefined;
  const status = data?.subscriptionStatus as string | undefined;
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
  throw new AccessError("Your first event includes this. After that it is on the Individual plan, or a paid seat.", 402);
}

async function includedOnEvent(uid: string, eventId: string, stored: string) {
  if (stored && stored === eventId) return true;
  if (stored) return false;
  const events = await adminDb().collection("events").where("ownerId", "==", uid).get();
  const oldest = events.docs
    .map((item) => ({ id: item.id, createdAt: String(item.data().createdAt ?? "") }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  return oldest?.id === eventId;
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
