import { adminDb } from "@/lib/firebase/admin";
import type { OpsOverview } from "@/lib/ops-types";
import { INDIVIDUAL_MONTHLY_USD, ORGANIZER_SEAT_USD, TEAM_SEAT_YEARLY_USD } from "@/lib/pricing";
import type { AccountPlan, SubscriptionStatus } from "@/lib/types";

function ms(iso: string) {
  const value = Date.parse(iso);
  return Number.isFinite(value) ? value : 0;
}

function since(iso: string, start: number) {
  return ms(iso) >= start;
}

export async function loadOpsOverview(): Promise<OpsOverview> {
  const weekAgo = Date.now() - 7 * 86_400_000;
  const dayAgo = Date.now() - 86_400_000;

  const [usersSnap, contactsSnap, eventsSnap, tasksSnap, teamsSnap, seatsSnap, organizedSnap, messagesSnap, flagsSnap] =
    await Promise.all([
      adminDb().collection("users").get(),
      adminDb().collection("contacts").select("ownerId", "relevance", "createdAt").get(),
      adminDb().collection("events").select("ownerId", "createdAt", "forSeats", "name", "date").get(),
      adminDb().collection("tasks").select("status", "createdAt").get(),
      adminDb().collection("teams").get(),
      adminDb().collection("teamSeats").select("teamId", "status", "email", "uid").get(),
      adminDb().collection("organizedEvents").get(),
      adminDb().collection("contactMessages").get(),
      adminDb().collection("teamCompanyFlags").select("teamId", "updatedAt").get(),
    ]);

  const users = usersSnap.docs.map((item) => {
    const data = item.data();
    return {
      id: item.id,
      name: String(data.name ?? ""),
      email: String(data.email ?? ""),
      createdAt: String(data.createdAt ?? ""),
      lastSeenAt: String(data.lastSeenAt ?? ""),
      onboardedAt: String(data.onboardedAt ?? ""),
      plan: (data.plan as AccountPlan) || "free",
      subscriptionStatus: (data.subscriptionStatus as SubscriptionStatus) || "none",
      emailUnsubscribedAt: String(data.emailUnsubscribedAt ?? ""),
      includedEventId: String(data.includedEventId ?? ""),
    };
  });

  const userById = new Map(users.map((item) => [item.id, item]));
  const capturesByOwner = new Map<string, number>();
  const highByOwner = new Map<string, number>();
  let high = 0;
  let medium = 0;
  let low = 0;
  let unknown = 0;
  let contactsWeek = 0;

  contactsSnap.docs.forEach((item) => {
    const ownerId = String(item.data().ownerId ?? "");
    const createdAt = String(item.data().createdAt ?? "");
    const level = item.data().relevance?.level;
    capturesByOwner.set(ownerId, (capturesByOwner.get(ownerId) ?? 0) + 1);
    if (since(createdAt, weekAgo)) contactsWeek += 1;
    if (level === "high") {
      high += 1;
      highByOwner.set(ownerId, (highByOwner.get(ownerId) ?? 0) + 1);
    } else if (level === "medium") medium += 1;
    else if (level === "low") low += 1;
    else unknown += 1;
  });

  let eventsWeek = 0;
  let seatEvents = 0;
  eventsSnap.docs.forEach((item) => {
    if (since(String(item.data().createdAt ?? ""), weekAgo)) eventsWeek += 1;
    if (item.data().forSeats) seatEvents += 1;
  });

  let tasksOpen = 0;
  let tasksDone = 0;
  let tasksWeek = 0;
  tasksSnap.docs.forEach((item) => {
    if (item.data().status === "done") tasksDone += 1;
    else tasksOpen += 1;
    if (since(String(item.data().createdAt ?? ""), weekAgo)) tasksWeek += 1;
  });

  const byPlan = { free: 0, individual: 0, organizer: 0, team: 0 };
  const byStatus = { none: 0, active: 0, past_due: 0, canceled: 0 };
  let onboarded = 0;
  let week = 0;
  let day = 0;
  let seenWeek = 0;
  let unsubscribed = 0;
  let individualActive = 0;
  let teamAdminsActive = 0;
  const atRisk: Array<{ name: string; email: string; plan: string; status: string }> = [];

  users.forEach((user) => {
    byPlan[user.plan] += 1;
    byStatus[user.subscriptionStatus] += 1;
    if (user.onboardedAt) onboarded += 1;
    if (since(user.createdAt, weekAgo)) week += 1;
    if (since(user.createdAt, dayAgo)) day += 1;
    if (since(user.lastSeenAt, weekAgo)) seenWeek += 1;
    if (user.emailUnsubscribedAt) unsubscribed += 1;
    if (user.plan === "individual" && user.subscriptionStatus === "active") individualActive += 1;
    if (user.plan === "team" && user.subscriptionStatus === "active") teamAdminsActive += 1;
    if (user.subscriptionStatus === "past_due") {
      atRisk.push({ name: user.name, email: user.email, plan: user.plan, status: user.subscriptionStatus });
    }
  });

  const capturesByTeam = new Map<string, number>();
  const seatsByTeam = new Map<string, { assigned: number; active: number }>();
  seatsSnap.docs.forEach((item) => {
    const teamId = String(item.data().teamId ?? "");
    const status = String(item.data().status ?? "");
    const bucket = seatsByTeam.get(teamId) ?? { assigned: 0, active: 0 };
    if (status === "active" || status === "invited") bucket.assigned += 1;
    if (status === "active") {
      bucket.active += 1;
      capturesByTeam.set(teamId, (capturesByTeam.get(teamId) ?? 0) + (capturesByOwner.get(String(item.data().uid ?? "")) ?? 0));
    }
    seatsByTeam.set(teamId, bucket);
  });

  let teamSeatsSold = 0;
  const teams = teamsSnap.docs.map((item) => {
    const data = item.data();
    const admin = userById.get(String(data.adminUid ?? ""));
    const seats = seatsByTeam.get(item.id) ?? { assigned: 0, active: 0 };
    const seatLimit = Number(data.seatLimit ?? 0);
    teamSeatsSold += seatLimit;
    return {
      id: item.id,
      name: String(data.name ?? "Team"),
      admin: admin?.name || admin?.email || "Admin",
      email: admin?.email ?? "",
      seatLimit,
      assigned: seats.assigned,
      active: seats.active,
      captures: capturesByTeam.get(item.id) ?? 0,
    };
  });

  let groupSeatsSold = 0;
  let groupSeatsUsed = 0;
  const groups = organizedSnap.docs
    .map((item) => {
      const data = item.data();
      const organizer = userById.get(String(data.organizerId ?? ""));
      const seatLimit = Number(data.seatLimit ?? 0);
      const seatsUsed = Number(data.seatsUsed ?? 0);
      groupSeatsSold += seatLimit;
      groupSeatsUsed += seatsUsed;
      return {
        id: item.id,
        name: String(data.name ?? "Event"),
        date: String(data.date ?? ""),
        organizer: organizer?.name || organizer?.email || "Organizer",
        email: organizer?.email ?? "",
        seatLimit,
        seatsUsed,
      };
    })
    .sort((a, b) => (b.date || b.id).localeCompare(a.date || a.id));

  const inPlayWeek = flagsSnap.docs.filter((item) => since(String(item.data().updatedAt ?? ""), weekAgo)).length;

  const messages = messagesSnap.docs
    .map((item) => {
      const data = item.data();
      return {
        id: item.id,
        name: String(data.name ?? ""),
        email: String(data.email ?? ""),
        message: String(data.message ?? ""),
        createdAt: String(data.createdAt ?? ""),
        mailedAt: String(data.mailedAt ?? ""),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 40);

  const recent = [...users]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 30)
    .map((user) => ({
      name: user.name,
      email: user.email,
      plan: user.plan,
      status: user.subscriptionStatus,
      createdAt: user.createdAt,
      lastSeenAt: user.lastSeenAt,
      onboarded: Boolean(user.onboardedAt),
      captures: capturesByOwner.get(user.id) ?? 0,
      high: highByOwner.get(user.id) ?? 0,
    }));

  const capturedPeople = capturesByOwner.size;
  const listedIndividualMonthly = individualActive * INDIVIDUAL_MONTHLY_USD;
  const listedTeamYearly = teamSeatsSold * TEAM_SEAT_YEARLY_USD;
  const listedGroupOnce = groupSeatsSold * ORGANIZER_SEAT_USD;
  const unmailed = messages.filter((item) => !item.mailedAt).length;

  return {
    generatedAt: new Date().toISOString(),
    accounts: {
      total: users.length,
      day,
      week,
      seenWeek,
      onboarded,
      unsubscribed,
      capturedPeople,
      stillOnIncluded: users.filter((user) => user.plan === "free" && user.includedEventId).length,
      byPlan,
      byStatus,
    },
    money: {
      individualActive,
      teamAdminsActive,
      teamSeatsSold,
      groupSeatsSold,
      groupSeatsUsed,
      listedIndividualMonthly,
      listedTeamYearly,
      listedGroupOnce,
      pastDue: atRisk.length,
    },
    usage: {
      contacts: contactsSnap.size,
      contactsWeek,
      high,
      medium,
      low,
      unknown,
      events: eventsSnap.size,
      eventsWeek,
      seatEvents,
      tasksOpen,
      tasksDone,
      tasksWeek,
      inPlayWeek,
    },
    inbox: {
      total: messagesSnap.size,
      unmailed,
      messages,
    },
    atRisk,
    recent,
    teams: teams.sort((a, b) => b.seatLimit - a.seatLimit),
    groups,
  };
}
