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

export async function POST(request: Request) {
  const session = await sessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const body = (await request.json()) as { code?: string };
  const code = body.code?.trim().toLowerCase();
  if (!code) return NextResponse.json({ error: "Enter a join code." }, { status: 400 });

  const found = await adminDb().collection("organizedEvents").where("joinCode", "==", code).limit(1).get();
  if (found.empty) return NextResponse.json({ error: "That invite was not found." }, { status: 404 });
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
