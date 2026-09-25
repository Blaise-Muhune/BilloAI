"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Empty } from "@/components/ui";
import { formatDay } from "@/lib/dates";
import { listEvents } from "@/lib/data";
import { GOAL_LABELS, type EventRecord } from "@/lib/types";

export default function EventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [error, setError] = useState("");

  function load() {
    if (!user) return;
    setError("");
    listEvents(user.uid)
      .then(setEvents)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load events."));
  }

  useEffect(() => {
    load();
  }, [user]);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <h1 className="serif text-4xl">Events</h1>
        <Link href="/events/new" className="text-sm font-semibold text-accent">
          New
        </Link>
      </div>
      {error ? (
        <p className="text-sm text-high">
          {error}{" "}
          <button type="button" className="font-semibold text-accent" onClick={load}>
            Retry
          </button>
        </p>
      ) : null}
      {events.length === 0 ? (
        <Empty title="Create your first event" body="Your goal is how BilloAI decides who is worth a follow-up." href="/events/new" action="Create an event" />
      ) : (
        events.map((event) => (
          <Link key={event.id} href={`/events/${event.id}`} className="surface block p-4 transition hover:-translate-y-0.5">
            <p className="font-semibold">{event.name}</p>
            <p className="text-sm text-muted">
              {formatDay(event.date)} · {event.location}
            </p>
            <p className="mt-2 text-sm">{GOAL_LABELS[event.goal]}</p>
          </Link>
        ))
      )}
    </div>
  );
}
