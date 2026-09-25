import { NextResponse } from "next/server";
import { adminDb, sessionFromRequest } from "@/lib/firebase/admin";
import type { EventDoc, EventInput } from "@/lib/types";

export const runtime = "nodejs";

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
