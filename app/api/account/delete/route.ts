import { NextResponse } from "next/server";
import { adminAuth, adminBucket, adminDb, sessionFromRequest } from "@/lib/firebase/admin";
import { cancelCustomerSubscriptions } from "@/lib/stripe";

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
    const account = await adminDb().collection("users").doc(uid).get();
    const email = String(account.data()?.email ?? "").trim().toLowerCase();
    try {
      await cancelCustomerSubscriptions(String(account.data()?.stripeCustomerId ?? ""));
    } catch {
      throw new Error("Could not cancel the subscription. Open Plan, manage billing, then try again.");
    }
    await deleteQuery("events", "ownerId", uid);
    await deleteQuery("contacts", "ownerId", uid);
    await deleteQuery("tasks", "ownerId", uid);
    const organized = await adminDb().collection("organizedEvents").where("organizerId", "==", uid).get();
    await Promise.all(
      organized.docs.map(async (item) => {
        const payments = await item.ref.collection("payments").get();
        const members = await adminDb().collection("eventMemberships").where("organizedEventId", "==", item.id).get();
        await Promise.all([...payments.docs, ...members.docs].map((doc) => doc.ref.delete()));
        await item.ref.delete();
      }),
    );
    await deleteQuery("eventMemberships", "uid", uid);
    const teamIds = new Set<string>();
    const ownTeamId = String(account.data()?.teamId ?? "");
    if (ownTeamId) teamIds.add(ownTeamId);
    const memberSeats = await adminDb().collection("teamSeats").where("uid", "==", uid).get();
    for (const seat of memberSeats.docs) teamIds.add(String(seat.data().teamId ?? ""));
    await Promise.all(
      [...teamIds].map(async (teamId) => {
        if (!teamId) return;
        const flags = await adminDb().collection("teamCompanyFlags").where("teamId", "==", teamId).get();
        await Promise.all(
          flags.docs.map((flag) => {
            const uids = (Array.isArray(flag.data().uids) ? flag.data().uids : []).filter((id: unknown) => id !== uid);
            return uids.length ? flag.ref.set({ uids }, { merge: true }) : flag.ref.delete();
          }),
        );
      }),
    );
    await deleteQuery("teamSeats", "uid", uid);
    if (email.includes("@")) {
      const invited = await adminDb().collection("teamSeats").where("email", "==", email).get();
      await Promise.all(invited.docs.map((item) => item.ref.delete()));
    }
    const teams = await adminDb().collection("teams").where("adminUid", "==", uid).get();
    await Promise.all(
      teams.docs.map(async (item) => {
        const seats = await adminDb().collection("teamSeats").where("teamId", "==", item.id).get();
        const flags = await adminDb().collection("teamCompanyFlags").where("teamId", "==", item.id).get();
        await Promise.all([...seats.docs, ...flags.docs].map((doc) => doc.ref.delete()));
        await item.ref.delete();
      }),
    );
    await adminDb().collection("users").doc(uid).delete();
    await adminDb().collection("publicProfiles").doc(uid).delete();
    await adminDb().collection("rateLimits").doc(uid).delete().catch(() => undefined);
    const [files] = await adminBucket().getFiles({ prefix: `users/${uid}/` });
    await Promise.all(files.map((file) => file.delete()));
    await (await adminAuth()).deleteUser(uid);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete the account.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
