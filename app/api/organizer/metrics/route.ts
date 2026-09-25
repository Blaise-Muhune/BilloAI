import { NextResponse } from "next/server";
import { adminDb, sessionFromRequest } from "@/lib/firebase/admin";

export const runtime = "nodejs";

type Counts = {
  organizedEventId: string;
  eventId: string;
  name: string;
  seatsUsed: number;
  seatLimit: number;
  attendees: number;
  attendeesWhoCaptured: number;
  contacts: number;
  high: number;
  medium: number;
  low: number;
  followUps: number;
  followUpsDone: number;
};

export async function GET(request: Request) {
  const session = await sessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const organized = await adminDb().collection("organizedEvents").where("organizerId", "==", session.uid).get();
  const metrics: Counts[] = await Promise.all(
    organized.docs.map(async (item) => {
      const data = item.data();
      const memberships = await adminDb().collection("eventMemberships").where("organizedEventId", "==", item.id).get();
      const eventIds = memberships.docs.map((membership) => String(membership.data().eventId));
      const owners = new Set<string>();
      let contacts = 0;
      let high = 0;
      let medium = 0;
      let low = 0;
      let followUps = 0;
      let followUpsDone = 0;

      for (const eventId of eventIds) {
        const people = await adminDb().collection("contacts").where("eventId", "==", eventId).get();
        contacts += people.size;
        people.docs.forEach((contact) => {
          owners.add(String(contact.data().ownerId ?? ""));
          const level = contact.data().relevance?.level;
          if (level === "high") high += 1;
          else if (level === "medium") medium += 1;
          else if (level === "low") low += 1;
        });
        const tasks = await adminDb().collection("tasks").where("eventId", "==", eventId).get();
        followUps += tasks.size;
        followUpsDone += tasks.docs.filter((task) => task.data().status === "done").length;
      }

      return {
        organizedEventId: item.id,
        eventId: String(data.eventId ?? ""),
        name: String(data.name ?? "Event"),
        seatsUsed: Number(data.seatsUsed ?? 0),
        seatLimit: Number(data.seatLimit ?? 0),
        attendees: memberships.size,
        attendeesWhoCaptured: owners.size,
        contacts,
        high,
        medium,
        low,
        followUps,
        followUpsDone,
      };
    }),
  );

  return NextResponse.json({ metrics });
}
