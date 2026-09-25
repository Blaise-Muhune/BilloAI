import { adminDb } from "@/lib/firebase/admin";
import type { AccountPlan } from "@/lib/types";

const WINDOW_MS = 60_000;
const LIMIT = 20;

export class AccessError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function assertAiAccess(uid: string, emailVerified: boolean, eventId?: string) {
  if (!emailVerified) {
    throw new AccessError("Verify your email before using AI features.", 403);
  }
  const user = await adminDb().collection("users").doc(uid).get();
  const plan = user.data()?.plan as AccountPlan | undefined;
  const status = user.data()?.subscriptionStatus as string | undefined;
  const paid = status === "active" && (plan === "individual" || plan === "organizer");
  if (plan === "individual" && paid) return;
  if (eventId) {
    const membership = await adminDb()
      .collection("eventMemberships")
      .where("uid", "==", uid)
      .where("eventId", "==", eventId)
      .limit(1)
      .get();
    if (!membership.empty) return;
  }
  throw new AccessError("This feature is on the Individual plan, or included when you join a paid event.", 402);
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
