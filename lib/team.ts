import { adminDb } from "@/lib/firebase/admin";
import { companyFlagId, normalizeCompany } from "@/lib/company";
import type { EventInput, TeamDoc, TeamSeatDoc } from "@/lib/types";

export function joinCode() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}

export async function teamByAdmin(uid: string) {
  const found = await adminDb().collection("teams").where("adminUid", "==", uid).limit(1).get();
  if (found.empty) return null;
  return { id: found.docs[0]!.id, ...(found.docs[0]!.data() as TeamDoc) };
}

export async function teamByJoinCode(code: string) {
  const found = await adminDb().collection("teams").where("joinCode", "==", code).limit(1).get();
  if (found.empty) return null;
  return { id: found.docs[0]!.id, ...(found.docs[0]!.data() as TeamDoc) };
}

export async function activeSeatForUser(uid: string) {
  const found = await adminDb()
    .collection("teamSeats")
    .where("uid", "==", uid)
    .where("status", "==", "active")
    .limit(1)
    .get();
  if (found.empty) return null;
  return { id: found.docs[0]!.id, ...(found.docs[0]!.data() as TeamSeatDoc) };
}

export async function teamContextForUser(uid: string) {
  const adminTeam = await teamByAdmin(uid);
  if (adminTeam) {
    return {
      teamId: adminTeam.id,
      icp: adminTeam.icp,
      targetCompanies: adminTeam.targetCompanies,
      targetRoles: adminTeam.targetRoles,
      admin: true,
    };
  }
  const seat = await activeSeatForUser(uid);
  if (!seat) return null;
  const team = await adminDb().collection("teams").doc(seat.teamId).get();
  if (!team.exists) return null;
  const data = team.data() as TeamDoc;
  return {
    teamId: team.id,
    icp: data.icp,
    targetCompanies: data.targetCompanies ?? [],
    targetRoles: data.targetRoles ?? "",
    admin: false,
  };
}

export async function listTeamSeats(teamId: string) {
  const snap = await adminDb().collection("teamSeats").where("teamId", "==", teamId).get();
  return snap.docs.map((item) => ({ id: item.id, ...(item.data() as TeamSeatDoc) }));
}

export async function companyAlreadyInPlay(teamId: string, company: string, uid: string) {
  const result = await companyInPlay(teamId, company, uid);
  return result.inPlay;
}

function firstName(value: string) {
  return value.trim().split(/\s+/).filter(Boolean)[0] || "";
}

async function namesForUids(teamId: string, uids: string[]) {
  const seats = await listTeamSeats(teamId);
  const names: string[] = [];
  for (const uid of uids) {
    const seat = seats.find((item) => item.uid === uid);
    let name = firstName(seat?.name || "");
    if (!name) {
      const profile = await adminDb().collection("publicProfiles").doc(uid).get();
      name = firstName(String(profile.data()?.name || ""));
    }
    names.push(name || "A teammate");
  }
  return [...new Set(names)];
}

export async function companyInPlay(teamId: string, company: string, uid: string) {
  const id = companyFlagId(teamId, company);
  if (!id) return { inPlay: false, heldBy: [] as string[] };
  const flag = await adminDb().collection("teamCompanyFlags").doc(id).get();
  if (!flag.exists) return { inPlay: false, heldBy: [] as string[] };
  const uids = (Array.isArray(flag.data()?.uids) ? (flag.data()?.uids as string[]) : []).filter(
    (item) => item && item !== uid,
  );
  if (!uids.length) return { inPlay: false, heldBy: [] as string[] };
  return { inPlay: true, heldBy: await namesForUids(teamId, uids) };
}

export function applyTeamHunt(
  event: EventInput,
  team: { icp: string; targetCompanies: string[]; targetRoles: string } | null,
): EventInput {
  if (!team) return event;
  const companies = team.targetCompanies.filter(Boolean).join(", ");
  const hunt = [
    team.icp ? `Company hunt: ${team.icp}` : "",
    companies ? `Target companies: ${companies}` : "",
    team.targetRoles ? `Target roles: ${team.targetRoles}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  if (!hunt) return event;
  return {
    ...event,
    goalDetail: [event.goalDetail, hunt].filter(Boolean).join(" "),
    targetCompaniesOrRoles: [event.targetCompaniesOrRoles, companies, team.targetRoles].filter(Boolean).join("; "),
  };
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function ensureSeat(teamId: string, email: string, uid: string, status: TeamSeatDoc["status"]) {
  const normalized = normalizeEmail(email);
  if (!normalized) return;
  let name = "";
  if (uid) {
    const [user, profile] = await Promise.all([
      adminDb().collection("users").doc(uid).get(),
      adminDb().collection("publicProfiles").doc(uid).get(),
    ]);
    name = String(profile.data()?.name || user.data()?.name || "").trim();
  }
  const existing = await adminDb()
    .collection("teamSeats")
    .where("teamId", "==", teamId)
    .where("email", "==", normalized)
    .limit(1)
    .get();
  const now = new Date().toISOString();
  const patch = {
    teamId,
    email: normalized,
    uid,
    name,
    status,
    ...(status === "active" ? { activatedAt: now } : {}),
  };
  if (existing.empty) {
    await adminDb().collection("teamSeats").add({
      ...patch,
      createdAt: now,
    } satisfies TeamSeatDoc);
    return;
  }
  await existing.docs[0]!.ref.set(patch, { merge: true });
}

export async function recordCompanyPlay(teamId: string, company: string, uid: string, level: "high" | "medium") {
  const id = companyFlagId(teamId, company);
  const key = normalizeCompany(company);
  if (!id || !key) return;
  const ref = adminDb().collection("teamCompanyFlags").doc(id);
  await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const uids = new Set(Array.isArray(snap.data()?.uids) ? (snap.data()?.uids as string[]) : []);
    uids.add(uid);
    tx.set(
      ref,
      {
        teamId,
        companyKey: key,
        level,
        uids: [...uids],
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  });
}
