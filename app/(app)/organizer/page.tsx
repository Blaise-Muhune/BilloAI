"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Empty } from "@/components/ui";
import { getJson } from "@/lib/api";
import { listOrganizedEvents } from "@/lib/data";
import type { OrganizedEventDoc } from "@/lib/types";

type Organized = OrganizedEventDoc & { id: string };

type Metrics = {
  organizedEventId: string;
  attendees: number;
  attendeesWhoCaptured: number;
  contacts: number;
  high: number;
  medium: number;
  low: number;
  followUps: number;
  followUpsDone: number;
};

export default function OrganizerPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Organized[]>([]);
  const [metrics, setMetrics] = useState<Metrics[]>([]);
  const [error, setError] = useState("");

  function load() {
    if (!user) return;
    setError("");
    void Promise.all([
      listOrganizedEvents(user.uid),
      getJson<{ metrics: Metrics[] }>("/api/organizer/metrics"),
    ])
      .then(([nextEvents, nextMetrics]) => {
        setEvents(nextEvents);
        setMetrics(nextMetrics.metrics);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load events."));
  }

  useEffect(() => {
    load();
  }, [user]);

  return (
    <div className="space-y-5">
      <h1 className="serif text-4xl">Organizer</h1>
      <p className="text-muted">
        Counts only. You can see how many connections the room made. You cannot see who they met, what they said, or the drafts.
      </p>
      {error ? (
        <p className="text-sm text-high">
          {error}{" "}
          <button type="button" className="font-semibold text-accent" onClick={load}>
            Retry
          </button>
        </p>
      ) : null}
      {events.length === 0 ? (
        <Empty title="No paid event yet" body="Create an event, then pay for seats once." href="/billing" action="Choose a plan" />
      ) : (
        events.map((event) => {
          const stats = metrics.find((item) => item.organizedEventId === event.id);
          return (
            <article key={event.id} className="surface space-y-4 p-4">
              <div>
                <p className="font-semibold">{event.name}</p>
                <p className="text-sm text-muted">
                  {event.seatsUsed} of {event.seatLimit} seats used
                </p>
                <p className="mt-2 text-sm">Join code: {event.joinCode || "Available after payment"}</p>
                {event.joinCode ? <p className="text-sm text-muted">Join link: /join?code={event.joinCode}</p> : null}
              </div>
              {stats ? (
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Stat label="People who joined" value={stats.attendees} />
                  <Stat label="People who captured someone" value={stats.attendeesWhoCaptured} />
                  <Stat label="Contacts saved" value={stats.contacts} />
                  <Stat label="High-fit matches" value={stats.high} />
                  <Stat label="Follow-ups started" value={stats.followUps} />
                  <Stat label="Follow-ups finished" value={stats.followUpsDone} />
                </dl>
              ) : (
                <p className="text-sm text-muted">Loading the picture of the room…</p>
              )}
            </article>
          );
        })
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-[#f7f3ea] px-3 py-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="serif mt-1 text-3xl">{value}</dd>
    </div>
  );
}
