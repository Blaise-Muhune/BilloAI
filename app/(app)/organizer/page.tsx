"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Empty } from "@/components/ui";
import { listOrganizedEvents } from "@/lib/data";
import type { OrganizedEventDoc } from "@/lib/types";

type Organized = OrganizedEventDoc & { id: string };

export default function OrganizerPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Organized[]>([]);
  const [error, setError] = useState("");

  function load() {
    if (!user) return;
    setError("");
    listOrganizedEvents(user.uid).then(setEvents).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Could not load events.");
    });
  }

  useEffect(() => {
    load();
  }, [user]);

  return (
    <div className="space-y-5">
      <h1 className="serif text-4xl">Organizer</h1>
      <p className="text-muted">Seat counts only. Attendee contacts, notes, and drafts stay private.</p>
      {error ? (
        <p className="text-sm text-high">
          {error}{" "}
          <button type="button" className="font-semibold text-accent" onClick={load}>
            Retry
          </button>
        </p>
      ) : null}
      {events.length === 0 ? (
        <Empty title="No paid event yet" body="Create an event, then subscribe with a seat count." href="/billing" action="Choose a plan" />
      ) : (
        events.map((event) => (
          <article key={event.id} className="surface p-4">
            <p className="font-semibold">{event.name}</p>
            <p className="text-sm text-muted">
              {event.seatsUsed} of {event.seatLimit} seats used
            </p>
            <p className="mt-2 text-sm">Join code: {event.joinCode || "Available after payment"}</p>
            {event.joinCode ? <p className="text-sm text-muted">Join link: /join?code={event.joinCode}</p> : null}
          </article>
        ))
      )}
    </div>
  );
}
