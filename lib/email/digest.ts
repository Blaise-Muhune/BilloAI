import { adminDb } from "@/lib/firebase/admin";
import { addDays, todayISO } from "@/lib/dates";
import { coverageFor } from "@/lib/roster";
import { skipFollowUp } from "@/lib/relevance";
import { teamByAdmin } from "@/lib/team";
import type { ContactDoc, EventDoc, TaskDoc, UserDoc } from "@/lib/types";
import { firstName, hoursSince, mailOrigin, renderNotice, sendMail, signUnsub } from "@/lib/email/mail";

const DIGEST_GAP_HOURS = 20;
const ACTIVE_SKIP_HOURS = 4;

type Section = { heading: string; intro: string; lines: string[]; href: string; action: string; weight: number };

function dayOf(iso: string) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

async function owned<T>(collection: string, uid: string) {
  const snap = await adminDb().collection(collection).where("ownerId", "==", uid).get();
  return snap.docs.map((item) => ({ id: item.id, ...(item.data() as T) }));
}

function bookSections(input: {
  contacts: Array<ContactDoc & { id: string }>;
  tasks: Array<TaskDoc & { id: string }>;
  events: Array<EventDoc & { id: string }>;
  today: string;
  yesterday: string;
}): Section[] {
  const open = input.tasks.filter((task) => task.status === "open");
  const due = open.filter((task) => task.dueDate && task.dueDate <= input.today);
  const doneByContact = new Set(input.tasks.filter((task) => task.status === "done").map((task) => task.contactId));
  const openByContact = new Set(open.map((task) => task.contactId));
  const sections: Section[] = [];

  if (due.length) {
    const names = due.slice(0, 3).map((task) => firstName(task.contactName));
    const extra = due.length > 3 ? ` and ${due.length - 3} more` : "";
    sections.push({
      heading: due.length === 1 ? `${names[0]} is due today` : `${due.length} people to reconnect today`,
      intro: "Open conversations from people who fit why you went. You still send the message.",
      lines: names.map((name, index) => (due[index]?.title ? `${name} · ${due[index]!.title}` : name)),
      href: due.length === 1 ? `/people/${due[0]!.contactId}` : "/tasks",
      action: "Open the conversations",
      weight: 50 + due.length,
    });
    if (extra) sections[0]!.lines.push(`${due.length - 3} more on Tasks`);
  }

  const lastNight = input.contacts.filter((contact) => dayOf(contact.createdAt) === input.yesterday);
  const lastNightOpen = lastNight.filter(
    (contact) => !doneByContact.has(contact.id) && !openByContact.has(contact.id) && !skipFollowUp(contact.relevance),
  );
  if (lastNight.length && lastNightOpen.length && !due.length) {
    sections.push({
      heading:
        lastNightOpen.length === 1
          ? `${firstName(lastNightOpen[0]!.name)} from last night still needs a note`
          : `${lastNightOpen.length} from last night still need a note`,
      intro: `You saved ${lastNight.length} ${lastNight.length === 1 ? "person" : "people"} yesterday.`,
      lines: lastNightOpen.slice(0, 3).map((contact) => firstName(contact.name)),
      href: "/people",
      action: "Open people",
      weight: 40 + lastNightOpen.length,
    });
  }

  const idleHigh = input.contacts.filter((contact) => {
    if (contact.relevance?.level !== "high") return false;
    if (skipFollowUp(contact.relevance)) return false;
    if (doneByContact.has(contact.id) || openByContact.has(contact.id)) return false;
    return dayOf(contact.createdAt) && dayOf(contact.createdAt) <= addDays(input.today, -2);
  });
  if (idleHigh.length && !due.length) {
    const names = idleHigh.slice(0, 2).map((contact) => firstName(contact.name));
    sections.push({
      heading: idleHigh.length === 1 ? `${names[0]} still has no follow-up` : `${idleHigh.length} high-fit people have no follow-up`,
      intro: "They already matched why you went. Nothing sends itself.",
      lines: names,
      href: `/people/${idleHigh[0]!.id}`,
      action: "Open the person",
      weight: 30 + idleHigh.length,
    });
  }

  return sections;
}

async function joinerSections(
  uid: string,
  user: UserDoc,
  events: Array<EventDoc & { id: string }>,
  contacts: Array<ContactDoc & { id: string }>,
  today: string,
): Promise<Section[]> {
  const memberships = await adminDb().collection("eventMemberships").where("uid", "==", uid).get();
  if (memberships.empty) return [];
  const sections: Section[] = [];
  for (const item of memberships.docs) {
    const eventId = String(item.data().eventId ?? "");
    const event = events.find((row) => row.id === eventId);
    if (!event) continue;
    if ((event.date === today || event.date === addDays(today, 1)) && !event.goalDetail.trim()) {
      sections.push({
        heading: `One line before you capture at ${event.name}`,
        intro: "The company or host does not set this. Matching stays on your account.",
        lines: [],
        href: `/capture?event=${event.id}`,
        action: "Set why you went",
        weight: 35,
      });
    }
    const onEvent = contacts.filter((contact) => contact.eventId === event.id).length;
    if (event.date === addDays(today, -1) && onEvent === 0 && !user.emailJoinerNudgeAt) {
      sections.push({
        heading: `The seat was for ${event.name}`,
        intro: "Add someone before the details fade. Next event is Individual, a Team seat, or another seat.",
        lines: [],
        href: `/capture?event=${event.id}`,
        action: "Add someone you met",
        weight: 28,
      });
    }
  }
  return sections;
}

async function adminSections(uid: string, user: UserDoc, today: string): Promise<Section[]> {
  const recentAdmin = hoursSince(user.emailAdminDigestAt ?? "") < 72;
  const organized = await adminDb().collection("organizedEvents").where("organizerId", "==", uid).get();
  const sections: Section[] = [];

  for (const item of organized.docs) {
    const data = item.data();
    const name = String(data.name ?? "the event");
    const date = String(data.date ?? "");
    const limit = Number(data.seatLimit ?? 0);
    const used = Number(data.seatsUsed ?? 0);
    if (limit < 1) continue;
    if (date === addDays(today, 1) && used < limit) {
      sections.push({
        heading: `${limit - used} unused seats for ${name}`,
        intro: "Share the join link. You never see who they meet.",
        lines: [],
        href: "/group",
        action: "Open the group",
        weight: 32,
      });
    }
    if (date === addDays(today, -1)) {
      const members = await adminDb().collection("eventMemberships").where("organizedEventId", "==", item.id).get();
      let quiet = 0;
      for (const member of members.docs) {
        const coverage = await coverageFor(String(member.data().uid ?? ""), String(member.data().eventId ?? ""));
        if (coverage.captures === 0) quiet += 1;
      }
      if (quiet > 0) {
        sections.push({
          heading: `${quiet} ${quiet === 1 ? "person" : "people"} joined ${name} and have not saved anyone`,
          intro: "Counts only. Not who they met, notes, or drafts.",
          lines: [],
          href: "/group",
          action: "Open the roster",
          weight: 26,
        });
      }
    }
  }

  const team = await teamByAdmin(uid);
  if (team) {
    const seats = await adminDb().collection("teamSeats").where("teamId", "==", team.id).get();
    const waiting = seats.docs.filter((seat) => {
      if (seat.data().status !== "invited") return false;
      return hoursSince(String(seat.data().createdAt ?? "")) >= 48;
    }).length;
    if (waiting > 0 && !recentAdmin) {
      sections.push({
        heading: `${waiting} Team ${waiting === 1 ? "invite has" : "invites have"} not been claimed`,
        intro: "They need the email that was invited. Their book stays theirs.",
        lines: [],
        href: "/team",
        action: "Open Team",
        weight: 24,
      });
    }
    if (!recentAdmin && hoursSince(user.emailAdminDigestAt ?? "") >= 168) {
      const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
      const flags = await adminDb().collection("teamCompanyFlags").where("teamId", "==", team.id).get();
      const inPlay = flags.docs.filter((flag) => String(flag.data().updatedAt ?? "") >= weekAgo).length;
      if (inPlay > 0) {
        sections.push({
          heading: `${inPlay} ${inPlay === 1 ? "company is" : "companies are"} in play this week`,
          intro: "A count only. Names stay in each rep’s book.",
          lines: [],
          href: "/team",
          action: "Open coverage",
          weight: 18,
        });
      }
    }
  }

  return sections;
}

export async function digestForUser(uid: string, user: UserDoc, origin: string, opts?: { force?: boolean }): Promise<boolean> {
  const email = String(user.email ?? "").trim().toLowerCase();
  if (!email.includes("@")) return false;
  if (!opts?.force) {
    if (user.emailUnsubscribedAt) return false;
    if (hoursSince(user.emailDigestAt ?? "") < DIGEST_GAP_HOURS) return false;
    if (hoursSince(user.lastSeenAt ?? "") < ACTIVE_SKIP_HOURS) return false;
  }

  const today = todayISO();
  const yesterday = addDays(today, -1);
  const [contacts, tasks, events] = await Promise.all([
    owned<ContactDoc>("contacts", uid),
    owned<TaskDoc>("tasks", uid),
    owned<EventDoc>("events", uid),
  ]);

  const personal = bookSections({ contacts, tasks, events, today, yesterday });
  const joiner = await joinerSections(uid, user, events, contacts, today);
  const admin = await adminSections(uid, user, today);
  const sections = [...personal, ...joiner, ...admin].sort((a, b) => b.weight - a.weight);
  if (!sections.length) {
    if (!opts?.force) return false;
    sections.push({
      heading: "This is a test of BilloAI email",
      intro: "The daily cron can reach this account. We never email the people you met.",
      lines: [],
      href: "/home",
      action: "Open BilloAI",
      weight: 1,
    });
  }

  const lead = sections[0]!;
  const extra = sections.slice(1, 3);
  const lines = [...lead.lines, ...extra.flatMap((item) => (item.heading ? [item.heading] : []))];
  const unsubscribeUrl = `${origin}/api/email/unsubscribe?t=${encodeURIComponent(signUnsub(uid))}`;
  const rendered = renderNotice({
    origin,
    heading: lead.heading,
    intro: lead.intro,
    lines,
    href: lead.href,
    action: lead.action,
    unsubscribeUrl,
  });

  const sent = await sendMail({
    to: email,
    subject: lead.heading,
    text: rendered.text,
    html: rendered.html,
    unsubscribeUrl,
  });
  if (!sent) return false;

  if (!opts?.force) {
    const patch: Record<string, string> = { emailDigestAt: new Date().toISOString() };
    if (joiner.some((item) => item.heading.startsWith("The seat was for"))) {
      patch.emailJoinerNudgeAt = patch.emailDigestAt;
    }
    if (admin.length) patch.emailAdminDigestAt = patch.emailDigestAt;
    await adminDb().collection("users").doc(uid).set(patch, { merge: true });
  }
  return true;
}

export async function sendTeamInvite(input: {
  email: string;
  teamName: string;
  joinCode: string;
  origin: string;
  reminder?: boolean;
}) {
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@") || !input.origin || !input.joinCode) return false;
  const href = `/join?code=${encodeURIComponent(input.joinCode)}&from=team`;
  const heading = input.reminder ? `Your Team seat on ${input.teamName} is still open` : `You have a Team seat on ${input.teamName}`;
  const rendered = renderNotice({
    origin: input.origin,
    heading,
    intro: input.reminder
      ? "Use the invited email to join. Your book stays yours. Nobody sees who you meet. This is a seat invite, not a marketing list."
      : "Use this email to join. Your book stays yours. Nobody sees who you meet. This is a seat invite, not a marketing list.",
    lines: [],
    href,
    action: "Join the seat",
  });
  return sendMail({
    to: email,
    subject: heading,
    text: rendered.text,
    html: rendered.html,
  });
}

export async function runInviteReminders(origin: string) {
  const seats = await adminDb().collection("teamSeats").where("status", "==", "invited").get();
  let sent = 0;
  for (const item of seats.docs) {
    const data = item.data();
    const email = String(data.email ?? "");
    const created = String(data.createdAt ?? "");
    const invitedAt = String(data.inviteEmailAt ?? "");
    const reminded = String(data.inviteRemindedAt ?? "");
    const team = await adminDb().collection("teams").doc(String(data.teamId ?? "")).get();
    const joinCode = String(team.data()?.joinCode ?? "");
    const teamName = String(team.data()?.name ?? "a team");
    if (!joinCode) continue;
    if (!invitedAt) {
      const ok = await sendTeamInvite({ email, teamName, joinCode, origin });
      if (ok) {
        await item.ref.set({ inviteEmailAt: new Date().toISOString() }, { merge: true });
        sent += 1;
      }
      continue;
    }
    if (!reminded && hoursSince(created) >= 72 && hoursSince(invitedAt) >= 72) {
      const ok = await sendTeamInvite({ email, teamName, joinCode, origin, reminder: true });
      if (ok) {
        await item.ref.set({ inviteRemindedAt: new Date().toISOString() }, { merge: true });
        sent += 1;
      }
    }
  }
  return sent;
}

async function usersToScan(onlyEmail: string) {
  const all = await adminDb().collection("users").get();
  if (!onlyEmail) return all.docs;
  return all.docs.filter((item) => String(item.data().email ?? "").trim().toLowerCase() === onlyEmail);
}

export async function runDigests(request: Request) {
  let origin = mailOrigin(request) || "https://billoai.com";
  if (origin.includes("localhost") || origin.includes("127.0.0.1")) origin = "https://billoai.com";
  const url = new URL(request.url);
  const onlyEmail = (url.searchParams.get("email") ?? "").trim().toLowerCase();
  const force = url.searchParams.get("force") === "1";
  if (!onlyEmail && force) return { scanned: 0, sent: 0, invites: 0, error: "force needs an email." };
  const invites = onlyEmail ? 0 : await runInviteReminders(origin);
  const users = await usersToScan(onlyEmail);
  let sent = 0;
  for (const item of users) {
    const data = item.data() as UserDoc;
    try {
      if (await digestForUser(item.id, data, origin, { force })) sent += 1;
    } catch {
      // Keep going. One bad account must not stop the rest.
    }
  }
  return { scanned: users.length, sent, invites, email: onlyEmail || undefined, forced: force || undefined };
}

export { mailOrigin };
