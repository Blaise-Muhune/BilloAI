import { adminDb } from "@/lib/firebase/admin";
import type { SeatPerson } from "@/lib/types";

export async function profilesFor(uids: string[]) {
  const unique = [...new Set(uids.filter(Boolean))];
  const out = new Map<string, { name: string; email: string }>();
  await Promise.all(
    unique.map(async (uid) => {
      const [user, profile] = await Promise.all([
        adminDb().collection("users").doc(uid).get(),
        adminDb().collection("publicProfiles").doc(uid).get(),
      ]);
      const email = String(user.data()?.email || profile.data()?.email || "").trim();
      const name = String(profile.data()?.name || user.data()?.name || "").trim();
      out.set(uid, { name: name || email.split("@")[0] || "Someone", email });
    }),
  );
  return out;
}

export async function coverageFor(uid: string, eventId?: string) {
  let query = adminDb().collection("contacts").where("ownerId", "==", uid);
  if (eventId) query = query.where("eventId", "==", eventId);
  const people = await query.select("relevance", "createdAt").get();
  const tasks = await adminDb().collection("tasks").where("ownerId", "==", uid).select("status", "eventId").get();
  const scopedTasks = eventId ? tasks.docs.filter((item) => String(item.data().eventId ?? "") === eventId) : tasks.docs;
  let high = 0;
  let medium = 0;
  let low = 0;
  let lastCaptureAt = "";
  people.docs.forEach((item) => {
    const level = item.data().relevance?.level;
    if (level === "high") high += 1;
    else if (level === "medium") medium += 1;
    else if (level === "low") low += 1;
    const created = String(item.data().createdAt ?? "");
    if (created && created > lastCaptureAt) lastCaptureAt = created;
  });
  return {
    captures: people.size,
    high,
    medium,
    low,
    followUps: scopedTasks.length,
    followUpsDone: scopedTasks.filter((item) => item.data().status === "done").length,
    lastCaptureAt,
  };
}

export function asSeatPerson(input: {
  id: string;
  uid?: string;
  name: string;
  email: string;
  joinedAt: string;
  invited?: boolean;
  coverage: { captures: number; high: number; followUps: number; followUpsDone: number; lastCaptureAt: string; medium?: number; low?: number };
}): SeatPerson {
  const status = input.invited ? "invited" : input.coverage.captures > 0 ? "captured" : "joined";
  return {
    id: input.id,
    uid: input.uid,
    name: input.name || input.email.split("@")[0] || "Someone",
    email: input.email,
    status,
    joinedAt: input.joinedAt,
    captures: input.coverage.captures,
    high: input.coverage.high,
    followUps: input.coverage.followUps,
    followUpsDone: input.coverage.followUpsDone,
    lastCaptureAt: input.coverage.lastCaptureAt,
  };
}
