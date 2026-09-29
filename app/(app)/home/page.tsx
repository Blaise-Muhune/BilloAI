"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { HomeBodySkeleton } from "@/components/loading";
import { BrandMark } from "@/components/brand";
import { Empty, PageHeader, PageWrap, PersonLink } from "@/components/ui";
import { CHANNEL_LABELS, recommendedLabel } from "@/lib/channels";
import { getJson } from "@/lib/api";
import { dueBucket, formatDay, todayISO } from "@/lib/dates";
import { listContacts, listEvents, listTasks } from "@/lib/data";
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
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load home."))
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

  return (
    <PageWrap>
      <PageHeader
        kicker="Home"
        title="Who from the room still matters"
        body={
          user && !user.emailVerified
            ? "Your first event can match people you met now. Verify email before you pay or use that on later events."
            : "The people who fit why you went, and the conversations still open."
        }
        action={
          <Link href="/capture" className="inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink md:hidden">
            Add someone
          </Link>
        }
      />
      {planLine ? <p className="text-sm font-semibold text-accent">{planLine}</p> : null}
      {error ? (
        <p className="text-sm text-high">
          {error}{" "}
          <button type="button" className="font-semibold text-accent" onClick={load}>
            Retry
          </button>
        </p>
      ) : null}

      {!ready ? <HomeBodySkeleton /> : (
        <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Reconnect today" value={due.length} href="/tasks" />
        <Stat label="Worth keeping" value={high.length} href="/people" />
        <Stat label="Open conversations" value={openTasks} href="/tasks" />
      </div>

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
              <Empty title="No one to reconnect with today" body="When someone is worth staying connected to, they show up here." href="/capture" action="Add someone you met" />
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
              <Empty title="No strong matches yet" body="Add someone you met. We’ll show who fits why you went." href="/capture" action="Add someone you met" />
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
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.6rem] bg-foreground p-6 text-card">
            <div className="flex items-center gap-2.5">
              <BrandMark className="h-7 w-7" />
              <p className="kicker text-[#9ddec8]">After the room</p>
            </div>
            <h2 className="serif mt-3 text-3xl leading-tight">Keep the people you just met.</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/65">Save them before the details fade. We’ll show who is worth staying connected to. Nothing sends itself.</p>
            <Link href="/capture" className="mt-6 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink">
              Add someone you met
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <h2 className="kicker">Upcoming events</h2>
            <Link href="/events/new" className="text-sm font-semibold text-accent">
              New event
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <Empty title="No event yet" body="Name the next room and why you’re going. That’s how we know who is worth staying connected to." href="/events/new" action="Create an event" />
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
