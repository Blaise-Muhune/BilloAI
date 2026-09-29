"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { HomeBodySkeleton } from "@/components/loading";
import { BrandMark } from "@/components/brand";
import { Empty, ErrorNote, PageHeader, PageWrap, PersonLink } from "@/components/ui";
import { CHANNEL_LABELS, recommendedLabel } from "@/lib/channels";
import { getJson } from "@/lib/api";
import { userMessage } from "@/lib/errors";
import { dueBucket, formatDay, todayISO } from "@/lib/dates";
import { listContacts, listEvents, listTasks } from "@/lib/data";
import { cardFaceSrc } from "@/lib/profile-links";
import type { ContactRecord, EventRecord, TaskRecord } from "@/lib/types";

type PlanLine = { line: string; kind: string };

export default function HomePage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [planLine, setPlanLine] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  function load() {
    if (!user) return;
    setError("");
    void Promise.all([
      listTasks(user.uid),
      listContacts(user.uid),
      listEvents(user.uid),
      getJson<PlanLine>("/api/access/status").catch(() => null),
    ])
      .then(([nextTasks, nextContacts, nextEvents, nextPlan]) => {
        setTasks(nextTasks);
        setContacts(nextContacts);
        setEvents(nextEvents);
        setPlanLine(nextPlan?.line ?? "");
      })
      .catch((err: unknown) => setError(userMessage(err, "Could not load home.")))
      .finally(() => setReady(true));
  }

  useEffect(() => {
    load();
  }, [user]);

  const today = todayISO();
  const due = tasks.filter((task) => task.status === "open" && dueBucket(task.dueDate) === "today");
  const high = contacts.filter((contact) => contact.relevance?.level === "high").slice(0, 8);
  const upcoming = events.filter((event) => event.date >= today).slice(0, 5);
  const openTasks = tasks.filter((task) => task.status === "open").length;
  const hasEvent = events.length > 0;
  const hasPeople = contacts.length > 0;
  const firstRun = !hasEvent;
  const needsCapture = hasEvent && !hasPeople;
  const showStats = due.length > 0 || high.length > 0 || openTasks > 0;
  const captureEvent = upcoming[0] ?? events[0];
  const captureHref = captureEvent ? `/capture?event=${captureEvent.id}` : "/capture";
  const primaryHref = firstRun ? "/events/new" : captureHref;
  const primaryLabel = firstRun ? "Create an event" : "Add someone you met";

  return (
    <PageWrap>
      <PageHeader
        kicker="Home"
        title="Who from the room still matters"
        body={
          !ready
            ? "The people who fit why you went, and the conversations still open."
            : firstRun
              ? "Name the next room and why you’re going. That’s how we know who is worth staying connected to."
              : needsCapture
                ? "Save the people you met. We’ll show who matched why you went."
                : user && !user.emailVerified
                  ? "Your first event can match people you met now. Verify email before you pay or use that on later events."
                  : "The people who fit why you went, and the conversations still open."
        }
        action={
          ready ? (
            <Link href={primaryHref} className="inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink md:hidden">
              {firstRun ? "Create an event" : "Add someone"}
            </Link>
          ) : null
        }
      />
      {planLine ? <p className="text-sm font-semibold text-accent">{planLine}</p> : null}
      {error ? <ErrorNote retry={load}>{error}</ErrorNote> : null}

      {!ready ? (
        <HomeBodySkeleton />
      ) : firstRun || needsCapture ? (
        <div className="rounded-[1.6rem] bg-foreground p-6 text-card sm:p-8">
          <div className="flex items-center gap-2.5">
            <BrandMark className="h-7 w-7" />
            <p className="kicker text-[#9ddec8]">{firstRun ? "Before the room" : "After the room"}</p>
          </div>
          <h2 className="serif mt-3 text-3xl leading-tight">
            {firstRun ? "Name the next room." : "Keep the people you just met."}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/65">
            {firstRun
              ? "Say why you’re going. That’s the filter for everyone you save."
              : "We’ll show who is worth staying connected to. Nothing sends itself."}
          </p>
          <Link href={primaryHref} className="mt-6 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink">
            {primaryLabel}
          </Link>
          {needsCapture && upcoming.length > 0 ? (
            <div className="mt-8 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">Your events</p>
              {upcoming.map((event) => (
                <Link key={event.id} href={`/events/${event.id}`} className="block rounded-2xl bg-white/10 px-5 py-4 transition hover:bg-white/15">
                  <p className="font-semibold">{event.name}</p>
                  <p className="mt-1 text-sm text-white/65">
                    {formatDay(event.date)} · {event.location}
                  </p>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <>
          {showStats ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <Stat label="Reconnect today" value={due.length} href="/tasks" />
              <Stat label="Worth keeping" value={high.length} href="/people" />
              <Stat label="Open conversations" value={openTasks} href="/tasks" />
            </div>
          ) : null}

          <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.9fr)]">
            <div className="space-y-8">
              <section>
                <div className="mb-3 flex items-end justify-between">
                  <h2 className="kicker">Reconnect today</h2>
                  <Link href="/tasks" className="text-sm font-semibold text-accent">
                    All conversations
                  </Link>
                </div>
                {due.length === 0 ? (
                  <Empty title="None due today" body="Open conversations land here when there’s a next step." />
                ) : (
                  <div className="surface list-stack">
                    {due.map((task) => (
                      <PersonLink
                        key={task.id}
                        href={`/people/${task.contactId}`}
                        name={task.contactName}
                        detail={task.title}
                        action={CHANNEL_LABELS[task.channel]}
                        level={contacts.find((contact) => contact.id === task.contactId)?.relevance?.level ?? null}
                        photoSrc={cardFaceSrc(task.cardUid || contacts.find((contact) => contact.id === task.contactId)?.cardUid)}
                      />
                    ))}
                  </div>
                )}
              </section>

              <section>
                <div className="mb-3 flex items-end justify-between">
                  <h2 className="kicker">High-value relationships</h2>
                  <Link href="/people" className="text-sm font-semibold text-accent">
                    All people
                  </Link>
                </div>
                {high.length === 0 ? (
                  <Empty title="No high matches yet" body="People you saved still live under All people." />
                ) : (
                  <div className="surface list-stack">
                    <div className="desk-head">
                      <span>Person</span>
                      <span>Role</span>
                      <span>Fit</span>
                    </div>
                    {high.map((contact) => (
                      <PersonLink
                        key={contact.id}
                        href={`/people/${contact.id}`}
                        name={contact.name || "Unnamed contact"}
                        detail={[contact.title, contact.company].filter(Boolean).join(" · ")}
                        action={recommendedLabel(contact.relevance)}
                        level="high"
                        layout="columns"
                        photoSrc={cardFaceSrc(contact.cardUid)}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>

            <aside className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="kicker">Upcoming events</h2>
                <Link href="/events/new" className="text-sm font-semibold text-accent">
                  New event
                </Link>
              </div>
              {upcoming.length === 0 ? (
                <Empty title="No upcoming event" body="Past events stay under Events." href="/events" action="See events" />
              ) : (
                <div className="space-y-3">
                  {upcoming.map((event) => (
                    <Link key={event.id} href={`/events/${event.id}`} className="surface block p-5 transition hover:bg-[#f7f3ea]">
                      <p className="font-semibold">{event.name}</p>
                      <p className="mt-1 text-sm text-muted">
                        {formatDay(event.date)} · {event.location}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </aside>
          </div>
        </>
      )}
    </PageWrap>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="surface block px-5 py-6 transition hover:bg-[#f7f3ea]">
      <p className="kicker">{label}</p>
      <p className="serif mt-3 text-5xl leading-none">{value}</p>
    </Link>
  );
}
