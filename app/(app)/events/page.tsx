"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Empty, PageHeader, PageWrap } from "@/components/ui";
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
    <PageWrap>
      <PageHeader
        kicker="Events"
        title="Nights you showed up for"
        body="Each event has a goal. That’s how we know who from the room is worth staying connected to."
        action={
          <Link href="/events/new" className="inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink">
            New event
          </Link>
        }
      />
      {error ? (
        <p className="text-sm text-high">
          {error}{" "}
          <button type="button" className="font-semibold text-accent" onClick={load}>
            Retry
          </button>
        </p>
      ) : null}
      {events.length === 0 ? (
        <Empty title="Name the next room" body="Say why you’re going. That’s how we pick who to stay connected to." href="/events/new" action="Create an event" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <Link key={event.id} href={`/events/${event.id}`} className="surface flex flex-col p-6 transition hover:bg-[#f7f3ea]">
              <p className="kicker">{formatDay(event.date)}</p>
              <h2 className="serif mt-3 text-2xl leading-tight">{event.name}</h2>
              <p className="mt-2 text-sm text-muted">{event.location}</p>
              <p className="mt-auto pt-6 text-sm font-semibold">
                {event.goalDetail.trim() ? GOAL_LABELS[event.goal] : "Set why you went"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </PageWrap>
  );
}
