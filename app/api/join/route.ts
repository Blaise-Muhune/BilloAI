import { NextResponse } from "next/server";
import { adminDb, sessionFromRequest } from "@/lib/firebase/admin";
import type { EventDoc, EventInput } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code")?.trim().toLowerCase();
  if (!code) return NextResponse.json({ error: "Enter a join code." }, { status: 400 });
  const found = await adminDb().collection("organizedEvents").where("joinCode", "==", code).limit(1).get();
  if (found.empty) return NextResponse.json({ error: "That invite was not found." }, { status: 404 });
  const data = found.docs[0]!.data();
  const open = Number(data.seatsUsed) < Number(data.seatLimit);
  const session = await sessionFromRequest(request);
  const kind = data.groupKind === "company" || data.groupKind === "event" ? data.groupKind : "";
  return NextResponse.json({
    name: String(data.name || "A group"),
    open,
    kind,
    own: session?.uid === data.organizerId,
  });
}

export async function POST(request: Request) {
  const session = await sessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const body = (await request.json()) as { code?: string };
  const code = body.code?.trim().toLowerCase();
  if (!code) return NextResponse.json({ error: "Enter a join code." }, { status: 400 });

  const found = await adminDb().collection("organizedEvents").where("joinCode", "==", code).limit(1).get();
  if (found.empty) return NextResponse.json({ error: "That event code was not found." }, { status: 404 });
  const organized = found.docs[0]!;
  const data = organized.data();
  if (data.organizerId === session.uid) {
    return NextResponse.json({ error: "This is your group. Send the link to the people you are paying for." }, { status: 400 });
  }
  if (Number(data.seatsUsed) >= Number(data.seatLimit)) {
    return NextResponse.json({ error: "This event has no open seats." }, { status: 403 });
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
    goal: fields.goal,
    goalDetail: fields.goalDetail,
    targetPeople: fields.targetPeople,
    targetCompaniesOrRoles: fields.targetCompaniesOrRoles,
  };
  const event = await adminDb().collection("events").add({
    ...input,
    ownerId: session.uid,
    organizedEventId: organized.id,
    createdAt: new Date().toISOString(),
  });
  await adminDb().collection("eventMemberships").add({
    uid: session.uid,
    eventId: event.id,
    organizedEventId: organized.id,
    createdAt: new Date().toISOString(),
  });
  await organized.ref.update({ seatsUsed: Number(data.seatsUsed) + 1 });
  return NextResponse.json({ eventId: event.id });
}
