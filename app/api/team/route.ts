import { NextResponse } from "next/server";
import { adminDb, sessionFromRequest } from "@/lib/firebase/admin";
import { asSeatPerson, coverageFor, profilesFor } from "@/lib/roster";
import { listTeamSeats, teamByAdmin, teamContextForUser } from "@/lib/team";
import type { SeatPerson } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await sessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const adminTeam = await teamByAdmin(session.uid);
  if (adminTeam) {
    const seats = await listTeamSeats(adminTeam.id);
    const profiles = await profilesFor(seats.map((seat) => seat.uid).filter(Boolean));
    const people: SeatPerson[] = await Promise.all(
      seats
        .filter((seat) => seat.status !== "revoked")
        .map(async (seat) => {
          const profile = seat.uid ? profiles.get(seat.uid) : undefined;
          const coverage = seat.uid && seat.status === "active" ? await coverageFor(seat.uid) : { captures: 0, high: 0, followUps: 0, followUpsDone: 0, lastCaptureAt: "" };
          return asSeatPerson({
            id: seat.id,
            name: seat.name || profile?.name || "",
            email: seat.email || profile?.email || "",
            joinedAt: seat.activatedAt || seat.createdAt,
            invited: seat.status === "invited" || !seat.uid,
            coverage,
          });
        }),
    );
    people.sort((a, b) => {
      const rank = { captured: 0, joined: 1, invited: 2 };
      return rank[a.status] - rank[b.status] || a.name.localeCompare(b.name) || a.email.localeCompare(b.email);
    });
    return NextResponse.json({
      admin: true,
      team: {
        id: adminTeam.id,
        name: adminTeam.name,
        icp: adminTeam.icp,
        targetCompanies: adminTeam.targetCompanies ?? [],
        targetRoles: adminTeam.targetRoles ?? "",
        seatLimit: adminTeam.seatLimit,
        joinCode: adminTeam.joinCode,
      },
      seats: seats.map((seat) => ({
        id: seat.id,
        email: seat.email,
        name: seat.name,
        status: seat.status,
      })),
      people,
    });
  }

  const context = await teamContextForUser(session.uid);
  if (!context) return NextResponse.json({ admin: false, team: null, seats: [] });
  const team = await adminDb().collection("teams").doc(context.teamId).get();
  return NextResponse.json({
    admin: false,
    team: {
      id: team.id,
      name: String(team.data()?.name ?? "Team"),
      icp: context.icp,
      targetCompanies: context.targetCompanies,
      targetRoles: context.targetRoles,
      seatLimit: Number(team.data()?.seatLimit ?? 0),
      joinCode: "",
    },
    seats: [],
    people: [],
  });
}

export async function PATCH(request: Request) {
  const session = await sessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const team = await teamByAdmin(session.uid);
  if (!team) return NextResponse.json({ error: "No team on this account yet." }, { status: 404 });

  const body = (await request.json()) as {
    name?: string;
    icp?: string;
    targetCompanies?: string[] | string;
    targetRoles?: string;
  };
  const companies = Array.isArray(body.targetCompanies)
    ? body.targetCompanies
    : String(body.targetCompanies ?? "")
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean);

  await adminDb()
    .collection("teams")
    .doc(team.id)
    .set(
      {
        ...(body.name !== undefined ? { name: String(body.name).trim() || team.name } : {}),
        ...(body.icp !== undefined ? { icp: String(body.icp) } : {}),
        ...(body.targetCompanies !== undefined ? { targetCompanies: companies } : {}),
        ...(body.targetRoles !== undefined ? { targetRoles: String(body.targetRoles) } : {}),
      },
      { merge: true },
    );
  return NextResponse.json({ ok: true });
}
