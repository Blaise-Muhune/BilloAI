import { NextResponse } from "next/server";
import { adminDb, sessionFromRequest } from "@/lib/firebase/admin";
import { asSeatPerson, coverageFor, profilesFor } from "@/lib/roster";
import type { SeatPerson } from "@/lib/types";

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
  members: SeatPerson[];
};

export async function GET(request: Request) {
  const session = await sessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const organized = await adminDb().collection("organizedEvents").where("organizerId", "==", session.uid).get();
  const metrics: Counts[] = await Promise.all(
    organized.docs.map(async (item) => {
      const data = item.data();
      const memberships = await adminDb().collection("eventMemberships").where("organizedEventId", "==", item.id).get();
      const profiles = await profilesFor(memberships.docs.map((membership) => String(membership.data().uid ?? "")));
      const members: SeatPerson[] = [];
      const owners = new Set<string>();
      let contacts = 0;
      let high = 0;
      let medium = 0;
      let low = 0;
      let followUps = 0;
      let followUpsDone = 0;

      for (const membership of memberships.docs) {
        const uid = String(membership.data().uid ?? "");
        const eventId = String(membership.data().eventId ?? "");
        const profile = profiles.get(uid);
        const coverage = uid && eventId ? await coverageFor(uid, eventId) : { captures: 0, high: 0, medium: 0, low: 0, followUps: 0, followUpsDone: 0, lastCaptureAt: "" };
        contacts += coverage.captures;
        high += coverage.high;
        medium += coverage.medium;
        low += coverage.low;
        followUps += coverage.followUps;
        followUpsDone += coverage.followUpsDone;
        if (coverage.captures > 0) owners.add(uid);
        members.push(
          asSeatPerson({
            id: membership.id,
            uid,
            name: String(membership.data().name || profile?.name || ""),
            email: String(membership.data().email || profile?.email || ""),
            joinedAt: String(membership.data().createdAt ?? ""),
            coverage,
          }),
        );
      }

      members.sort((a, b) => {
        const rank = { captured: 0, joined: 1, invited: 2 };
        return rank[a.status] - rank[b.status] || a.name.localeCompare(b.name);
      });

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
        members,
      };
    }),
  );

  return NextResponse.json({ metrics });
}
