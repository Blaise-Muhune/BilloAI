import { NextResponse } from "next/server";
import { sendTeamInvite } from "@/lib/email/digest";
import { mailOrigin } from "@/lib/email/mail";
import { adminDb, sessionFromRequest } from "@/lib/firebase/admin";
import { ensureSeat, listTeamSeats, normalizeEmail, teamByAdmin } from "@/lib/team";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await sessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const team = await teamByAdmin(session.uid);
  if (!team) return NextResponse.json({ error: "Pay for Team seats first." }, { status: 402 });
  if (Number(team.seatLimit) < 1) {
    return NextResponse.json({ error: "Team seats are not active yet." }, { status: 402 });
  }

  const body = (await request.json()) as { email?: string };
  const email = normalizeEmail(body.email ?? "");
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Enter a work email to invite." }, { status: 400 });
  }

  const seats = await listTeamSeats(team.id);
  const existing = seats.find((seat) => seat.email === email);
  if (existing?.status === "active" || existing?.status === "invited") {
    return NextResponse.json({ error: "That email already has a seat." }, { status: 400 });
  }
  const assigned = seats.filter((seat) => seat.status === "active" || seat.status === "invited").length;
  if (!existing && assigned >= Number(team.seatLimit)) {
    return NextResponse.json({ error: "Every paid seat is assigned. Revoke one, or add seats in billing." }, { status: 400 });
  }

  await ensureSeat(team.id, email, existing?.uid ?? "", "invited");
  const origin = mailOrigin(request);
  if (origin && team.joinCode) {
    const sent = await sendTeamInvite({ email, teamName: team.name, joinCode: team.joinCode, origin }).catch(() => false);
    if (sent) {
      const seatsNow = await listTeamSeats(team.id);
      const seat = seatsNow.find((item) => item.email === email);
      if (seat) {
        await adminDb()
          .collection("teamSeats")
          .doc(seat.id)
          .set({ inviteEmailAt: new Date().toISOString() }, { merge: true });
      }
    }
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const session = await sessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const team = await teamByAdmin(session.uid);
  if (!team) return NextResponse.json({ error: "No team on this account yet." }, { status: 404 });

  const body = (await request.json()) as { seatId?: string; status?: "revoked" };
  if (!body.seatId || body.status !== "revoked") {
    return NextResponse.json({ error: "Choose a seat to revoke." }, { status: 400 });
  }

  const seats = await listTeamSeats(team.id);
  const seat = seats.find((item) => item.id === body.seatId);
  if (!seat) return NextResponse.json({ error: "That seat was not found." }, { status: 404 });

  await adminDb().collection("teamSeats").doc(seat.id).set({ status: "revoked", uid: "" }, { merge: true });
  return NextResponse.json({ ok: true });
}
