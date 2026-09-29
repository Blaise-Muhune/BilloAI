import { NextResponse } from "next/server";
import { adminDb, sessionFromRequest } from "@/lib/firebase/admin";
import { listTeamSeats, teamByAdmin } from "@/lib/team";

export const runtime = "nodejs";

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export async function GET(request: Request) {
  const session = await sessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const team = await teamByAdmin(session.uid);
  if (!team) return NextResponse.json({ error: "No team on this account yet." }, { status: 404 });

  const seats = await listTeamSeats(team.id);
  const active = seats.filter((seat) => seat.status === "active" && seat.uid);
  const assigned = seats.filter((seat) => seat.status === "active" || seat.status === "invited");
  const owners = new Set<string>();
  let captures = 0;
  let high = 0;
  let followUpsDone = 0;
  const firstFollowDays: number[] = [];
  const events: { name: string; date: string; captures: number; high: number }[] = [];

  for (const seat of active) {
    const ownedEvents = await adminDb().collection("events").where("ownerId", "==", seat.uid).get();
    const people = await adminDb()
      .collection("contacts")
      .where("ownerId", "==", seat.uid)
      .select("eventId", "relevance", "createdAt")
      .get();
    const tasks = await adminDb()
      .collection("tasks")
      .where("ownerId", "==", seat.uid)
      .select("contactId", "createdAt", "status")
      .get();
    if (people.size > 0) owners.add(seat.uid);
    captures += people.size;

    const firstTaskByContact = new Map<string, string>();
    const doneByContact = new Set<string>();
    tasks.docs.forEach((item) => {
      const contactId = String(item.data().contactId ?? "");
      const createdAt = String(item.data().createdAt ?? "");
      if (item.data().status === "done" && contactId) doneByContact.add(contactId);
      if (!contactId || !createdAt) return;
      const current = firstTaskByContact.get(contactId);
      if (!current || createdAt < current) firstTaskByContact.set(contactId, createdAt);
    });

    const byEvent = new Map<string, { captures: number; high: number }>();
    people.docs.forEach((item) => {
      const level = item.data().relevance?.level;
      if (level === "high") {
        high += 1;
        if (doneByContact.has(item.id)) followUpsDone += 1;
      }
      const eventId = String(item.data().eventId ?? "");
      const bucket = byEvent.get(eventId) ?? { captures: 0, high: 0 };
      bucket.captures += 1;
      if (level === "high") bucket.high += 1;
      byEvent.set(eventId, bucket);
      if (level === "high") {
        const first = firstTaskByContact.get(item.id);
        const created = String(item.data().createdAt ?? "");
        if (first && created) {
          const days = (Date.parse(first) - Date.parse(created)) / 86_400_000;
          if (Number.isFinite(days) && days >= 0) firstFollowDays.push(days);
        }
      }
    });

    ownedEvents.docs.forEach((item) => {
      if (item.data().forSeats) return;
      const counts = byEvent.get(item.id) ?? { captures: 0, high: 0 };
      events.push({
        name: String(item.data().name ?? "Event"),
        date: String(item.data().date ?? ""),
        captures: counts.captures,
        high: counts.high,
      });
    });
  }

  return NextResponse.json({
    seatLimit: Number(team.seatLimit ?? 0),
    seatsAssigned: assigned.length,
    seatsActive: active.length,
    peopleWhoCaptured: owners.size,
    captures,
    high,
    captureRate: active.length ? owners.size / active.length : 0,
    followThrough: high ? followUpsDone / high : 0,
    medianDaysToFollowUp: Math.round(median(firstFollowDays) * 10) / 10,
    events: events.sort((a, b) => b.date.localeCompare(a.date)),
    companiesInPlayThisWeek: await companiesInPlayThisWeek(team.id),
  });
}

async function companiesInPlayThisWeek(teamId: string) {
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const flags = await adminDb().collection("teamCompanyFlags").where("teamId", "==", teamId).get();
  return flags.docs.filter((item) => String(item.data().updatedAt ?? "") >= weekAgo).length;
}
