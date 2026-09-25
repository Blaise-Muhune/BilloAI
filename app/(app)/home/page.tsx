"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Empty, PersonLink } from "@/components/ui";
import { dueBucket, formatDay, todayISO } from "@/lib/dates";
import { listContacts, listEvents, listTasks } from "@/lib/data";
import type { ContactRecord, EventRecord, TaskRecord } from "@/lib/types";

export default function HomePage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [error, setError] = useState("");

  function load() {
    if (!user) return;
    setError("");
    void Promise.all([listTasks(user.uid), listContacts(user.uid), listEvents(user.uid)])
      .then(([nextTasks, nextContacts, nextEvents]) => {
        setTasks(nextTasks);
        setContacts(nextContacts);
        setEvents(nextEvents);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load home."));
  }

  useEffect(() => {
    load();
  }, [user]);

  const today = todayISO();
  const due = tasks.filter((task) => task.status === "open" && dueBucket(task.dueDate) === "today");
  const high = contacts.filter((contact) => contact.relevance?.level === "high").slice(0, 5);
  const upcoming = events.filter((event) => event.date >= today).slice(0, 3);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="serif text-4xl leading-tight">Your networking today</h1>
        <p className="mt-3 text-muted">
          BilloAI helps you remember who you met, understand who matters, and know exactly who to follow up with.
        </p>
        {user && !user.emailVerified ? (
          <p className="mt-3 text-sm text-muted">Your first event can use card reading now. Verify email before you pay or use AI on later events.</p>
        ) : (
          <p className="mt-3 text-sm text-muted">Your first event includes card reading and drafts. After that, those tools are on a paid plan.</p>
        )}
        {error ? (
          <p className="mt-3 text-sm text-high">
            {error}{" "}
            <button type="button" className="font-semibold text-accent" onClick={load}>
              Retry
            </button>
          </p>
        ) : null}
      </section>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]">
      <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="kicker">Due today</h2>
        {due.length === 0 ? (
          <Empty title="Nothing due" body="Follow-ups you owe today will show up here." href="/capture" action="Capture someone" />
        ) : (
          due.map((task) => (
            <PersonLink
              key={task.id}
              href={`/people/${task.contactId}`}
              name={task.contactName}
              detail={task.title}
              level={contacts.find((contact) => contact.id === task.contactId)?.relevance?.level ?? null}
            />
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="kicker">High-value relationships</h2>
        {high.length === 0 ? (
          <p className="text-muted">People who match your event goal will appear here after you capture them.</p>
        ) : (
          high.map((contact) => (
            <PersonLink
              key={contact.id}
              href={`/people/${contact.id}`}
              name={contact.name || "Unnamed contact"}
              detail={[contact.title, contact.company].filter(Boolean).join(", ")}
              level="high"
            />
          ))
        )}
      </section>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="kicker">Upcoming events</h2>
          <Link href="/events/new" className="text-sm font-semibold text-accent">
            New event
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <Empty title="No event yet" body="Create the event before you arrive so BilloAI knows what success looks like." href="/events/new" action="Create an event" />
        ) : (
          upcoming.map((event) => (
            <Link key={event.id} href={`/events/${event.id}`} className="surface block p-4 transition hover:-translate-y-0.5">
              <p className="font-semibold">{event.name}</p>
              <p className="text-sm text-muted">
                {formatDay(event.date)} · {event.location}
              </p>
            </Link>
          ))
        )}
      </section>
      </div>
    </div>
  );
}
