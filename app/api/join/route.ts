import { NextResponse } from "next/server";
import { adminDb, sessionFromRequest } from "@/lib/firebase/admin";
import { listTeamSeats, normalizeEmail, teamByJoinCode } from "@/lib/team";
import type { EventDoc, EventInput } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code")?.trim().toLowerCase();
  if (!code) return NextResponse.json({ error: "Enter a join code." }, { status: 400 });
  const session = await sessionFromRequest(request);
  const found = await adminDb().collection("organizedEvents").where("joinCode", "==", code).limit(1).get();
  if (!found.empty) {
    const data = found.docs[0]!.data();
    const open = Number(data.seatsUsed) < Number(data.seatLimit);
    const kind = data.groupKind === "company" || data.groupKind === "event" ? data.groupKind : "";
    const source = data.eventId ? await adminDb().collection("events").doc(String(data.eventId)).get() : null;
    return NextResponse.json({
      name: String(data.name || source?.data()?.name || "A group"),
      date: String(data.date || source?.data()?.date || ""),
      location: String(data.location || source?.data()?.location || ""),
      open,
      kind,
      own: session?.uid === data.organizerId,
    });
  }

  const team = await teamByJoinCode(code);
  if (!team) return NextResponse.json({ error: "That invite was not found." }, { status: 404 });
  const seats = await listTeamSeats(team.id);
  const email = normalizeEmail(session?.email ?? "");
  const seat = email ? seats.find((item) => item.email === email) : undefined;
  const open = seat?.status === "invited" || seat?.status === "active" || Number(team.seatLimit) > 0;
  return NextResponse.json({
    name: team.name || "A team",
    date: "",
    location: "",
    open,
    kind: "",
    team: true,
    own: session?.uid === team.adminUid,
  });
}

export async function POST(request: Request) {
  const session = await sessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const body = (await request.json()) as { code?: string };
  const code = body.code?.trim().toLowerCase();
  if (!code) return NextResponse.json({ error: "Enter a join code." }, { status: 400 });

  const found = await adminDb().collection("organizedEvents").where("joinCode", "==", code).limit(1).get();
  if (found.empty) {
    const team = await teamByJoinCode(code);
    if (!team) return NextResponse.json({ error: "That invite was not found." }, { status: 404 });
    if (team.adminUid === session.uid) {
      return NextResponse.json({ error: "This is your team. Invite people by email, then send them the link." }, { status: 400 });
    }
    const email = normalizeEmail(session.email ?? "");
    const seats = await listTeamSeats(team.id);
    const seat = seats.find((item) => item.email === email);
    if (!seat || (seat.status !== "invited" && seat.status !== "active")) {
      return NextResponse.json({ error: "This seat is for a specific invited email." }, { status: 403 });
    }
    if (seat.status === "invited") {
      const profile = await adminDb().collection("publicProfiles").doc(session.uid).get();
      const user = await adminDb().collection("users").doc(session.uid).get();
      await adminDb()
        .collection("teamSeats")
        .doc(seat.id)
        .set(
          {
            uid: session.uid,
            status: "active",
            name: String(profile.data()?.name || user.data()?.name || "").trim(),
            activatedAt: new Date().toISOString(),
          },
          { merge: true },
        );
    }
    await adminDb().collection("users").doc(session.uid).set({ teamId: team.id }, { merge: true });
    return NextResponse.json({ team: true });
  }
  const organized = found.docs[0]!;
  const data = organized.data();
  if (data.organizerId === session.uid) {
    return NextResponse.json({ error: "This is your group. Send the link to the people you are paying for." }, { status: 400 });
  }

  const already = await adminDb()
    .collection("eventMemberships")
    .where("uid", "==", session.uid)
    .where("organizedEventId", "==", organized.id)
    .limit(1)
    .get();
  if (!already.empty) {
    return NextResponse.json({ eventId: already.docs[0]!.data().eventId });
  }

  const source = await adminDb().collection("events").doc(String(data.eventId)).get();
  if (!source.exists) return NextResponse.json({ error: "That event is no longer available." }, { status: 404 });
  const fields = source.data() as EventDoc;
  const input: EventInput = {
    name: fields.name,
    type: fields.type,
    location: fields.location,
    date: fields.date,
    goal: "customers",
    goalDetail: "",
    targetPeople: "",
    targetCompaniesOrRoles: "",
  };

  const [account, card] = await Promise.all([
    adminDb().collection("users").doc(session.uid).get(),
    adminDb().collection("publicProfiles").doc(session.uid).get(),
  ]);
  const memberName = String(card.data()?.name || account.data()?.name || session.name || "").trim();
  const memberEmail = normalizeEmail(String(account.data()?.email || session.email || ""));

  const memberRef = adminDb().collection("eventMemberships").doc(`${session.uid}_${organized.id}`);
  const eventRef = adminDb().collection("events").doc();

  try {
    const eventId = await adminDb().runTransaction(async (tx) => {
      const member = await tx.get(memberRef);
      if (member.exists) return String(member.data()?.eventId ?? eventRef.id);
      const fresh = await tx.get(organized.ref);
      const next = fresh.data();
      if (!next) throw new Error("That invite was not found.");
      if (Number(next.seatsUsed) >= Number(next.seatLimit)) {
        throw new Error("This group has no open seats.");
      }
      tx.set(eventRef, {
        ...input,
        ownerId: session.uid,
        organizedEventId: organized.id,
        createdAt: new Date().toISOString(),
        forSeats: false,
      });
      tx.set(memberRef, {
        uid: session.uid,
        eventId: eventRef.id,
        organizedEventId: organized.id,
        createdAt: new Date().toISOString(),
        name: memberName,
        email: memberEmail,
      });
      tx.update(organized.ref, { seatsUsed: Number(next.seatsUsed) + 1 });
      return eventRef.id;
    });
    return NextResponse.json({ eventId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not join.";
    const status = message.includes("no open seats") ? 403 : message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
