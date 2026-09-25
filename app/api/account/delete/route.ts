import { NextResponse } from "next/server";
import { adminAuth, adminBucket, adminDb, sessionFromRequest } from "@/lib/firebase/admin";

export const runtime = "nodejs";

async function deleteQuery(name: string, field: string, uid: string) {
  const snap = await adminDb().collection(name).where(field, "==", uid).get();
  await Promise.all(snap.docs.map((item) => item.ref.delete()));
}

export async function POST(request: Request) {
  const session = await sessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const uid = session.uid;
  try {
    await deleteQuery("events", "ownerId", uid);
    await deleteQuery("contacts", "ownerId", uid);
    await deleteQuery("tasks", "ownerId", uid);
    await deleteQuery("organizedEvents", "organizerId", uid);
    await deleteQuery("eventMemberships", "uid", uid);
    await adminDb().collection("users").doc(uid).delete();
    await adminDb().collection("publicProfiles").doc(uid).delete();
    await adminDb().collection("rateLimits").doc(uid).delete().catch(() => undefined);
    const [files] = await adminBucket().getFiles({ prefix: `users/${uid}/` });
    await Promise.all(files.map((file) => file.delete()));
    await adminAuth().deleteUser(uid);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete the account.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
