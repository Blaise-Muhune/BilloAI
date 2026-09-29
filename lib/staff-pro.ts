import { adminDb } from "@/lib/firebase/admin";
import { isOpsEmail } from "@/lib/ops";
import { clampSeats, clampTeamSeats, TEAM_SEAT_MIN } from "@/lib/pricing";
import { ensureSeat, joinCode, teamByAdmin } from "@/lib/team";

export const STAFF_TEAM_SEATS = 25;
export const STAFF_GROUP_SEATS = 25;

export function hasStaffProAccess(email?: string | null, staffAccess?: boolean) {
  return Boolean(staffAccess) || isOpsEmail(email);
}

export async function grantStaffProAccess(input: { uid: string; email?: string; name?: string; teamSeats?: number }) {
  const uid = input.uid;
  const userRef = adminDb().collection("users").doc(uid);
  const user = await userRef.get();
  const email = (input.email || String(user.data()?.email ?? "")).trim().toLowerCase();
  const name = input.name || String(user.data()?.name || "Team");
  const seats = clampTeamSeats(Math.max(input.teamSeats ?? STAFF_TEAM_SEATS, TEAM_SEAT_MIN));

  const existingTeam = await teamByAdmin(uid);
  let teamId = existingTeam?.id ?? "";
  if (!teamId) {
    const created = await adminDb().collection("teams").add({
      adminUid: uid,
      name,
      seatLimit: seats,
      stripeCustomerId: String(user.data()?.stripeCustomerId ?? ""),
      icp: "",
      targetCompanies: [],
      targetRoles: "",
      joinCode: joinCode(),
      createdAt: new Date().toISOString(),
    });
    teamId = created.id;
  } else if (Number(existingTeam?.seatLimit ?? 0) < seats) {
    await adminDb().collection("teams").doc(teamId).set({ seatLimit: seats }, { merge: true });
  }

  await userRef.set(
    {
      staffAccess: true,
      subscriptionStatus: "active",
      plan: "team",
      teamId,
    },
    { merge: true },
  );

  if (email) await ensureSeat(teamId, email, uid, "active");

  const events = await adminDb().collection("events").where("ownerId", "==", uid).get();
  for (const event of events.docs) {
    if (!event.data()?.forSeats) continue;
    const found = await adminDb()
      .collection("organizedEvents")
      .where("organizerId", "==", uid)
      .where("eventId", "==", event.id)
      .limit(1)
      .get();
    if (found.empty) {
      await adminDb().collection("organizedEvents").add({
        organizerId: uid,
        eventId: event.id,
        name: String(event.data()?.name ?? "Event"),
        date: String(event.data()?.date ?? ""),
        location: String(event.data()?.location ?? ""),
        seatLimit: STAFF_GROUP_SEATS,
        seatsUsed: 0,
        joinCode: joinCode(),
        createdAt: new Date().toISOString(),
        groupKind: user.data()?.groupKind === "company" || user.data()?.groupKind === "event" ? user.data()?.groupKind : "",
      });
      continue;
    }
    const org = found.docs[0]!;
    if (Number(org.data()?.seatLimit ?? 0) < 1) {
      await org.ref.set({ seatLimit: STAFF_GROUP_SEATS }, { merge: true });
    }
  }

  return { teamId };
}

export async function grantStaffGroupSeats(uid: string, organizedEventId: string, seats: number) {
  const add = clampSeats(seats);
  const orgRef = adminDb().collection("organizedEvents").doc(organizedEventId);
  const current = await orgRef.get();
  if (!current.exists) return;
  await orgRef.set({ seatLimit: Number(current.data()?.seatLimit ?? 0) + add }, { merge: true });
  const user = await adminDb().collection("users").doc(uid).get();
  const plan = user.data()?.plan;
  await adminDb()
    .collection("users")
    .doc(uid)
    .set(
      {
        staffAccess: true,
        subscriptionStatus: "active",
        ...(plan === "individual" || plan === "team" ? {} : { plan: "organizer" }),
      },
      { merge: true },
    );
}
