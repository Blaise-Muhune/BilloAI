"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Empty, PersonLink, PriorityBadge } from "@/components/ui";
import { formatDay } from "@/lib/dates";
import { getEvent, listContactsForEvent } from "@/lib/data";
import { GOAL_LABELS, type ContactRecord, type EventRecord, type RelevanceLevel } from "@/lib/types";

const rank: Record<RelevanceLevel, number> = { high: 0, medium: 1, low: 2 };

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    void Promise.all([getEvent(user.uid, id), listContactsForEvent(user.uid, id)]).then(([nextEvent, nextContacts]) => {
      setEvent(nextEvent);
      setContacts(nextContacts);
      setMissing(!nextEvent);
    });
  }, [user, id]);

  if (missing) {
    return (
      <div className="space-y-3">
        <h1 className="serif text-4xl">That event is not here.</h1>
        <p className="text-muted">It may have been deleted.</p>
        <Link href="/events" className="font-semibold text-accent">Back to events</Link>
      </div>
    );
  }
  if (!event) return <p className="text-muted">Loading…</p>;

  const counts = {
    high: contacts.filter((contact) => contact.relevance?.level === "high").length,
    medium: contacts.filter((contact) => contact.relevance?.level === "medium").length,
    low: contacts.filter((contact) => contact.relevance?.level === "low").length,
  };
  const top = [...contacts]
    .filter((contact) => contact.relevance)
    .sort((a, b) => rank[a.relevance!.level] - rank[b.relevance!.level])
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="serif text-4xl">{event.name}</h1>
        <p className="mt-2 text-muted">
          {formatDay(event.date)} · {event.location}
        </p>
        <p className="mt-3">{GOAL_LABELS[event.goal]}</p>
        <p className="text-muted">{event.goalDetail}</p>
      </div>
      <Link href={`/capture?event=${event.id}`} className="inline-block rounded-full bg-accent px-4 py-3 text-sm font-semibold text-accent-ink shadow-[0_8px_20px_rgb(11_107_79/0.25)]">
        Capture a contact
      </Link>
      <div className="grid grid-cols-3 gap-2 text-center">
        {(["high", "medium", "low"] as const).map((level) => (
          <div key={level} className="surface p-3">
            <p className="serif text-3xl">{counts[level]}</p>
            <PriorityBadge level={level} />
          </div>
        ))}
      </div>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Top conversations</h2>
        {top.length === 0 ? (
          <Empty title="No one captured yet" body="Scan a card or jot a name. Scoring happens after your note." />
        ) : (
          top.map((contact, index) => (
            <PersonLink
              key={contact.id}
              href={`/people/${contact.id}`}
              name={`${index + 1}. ${contact.name || "Unnamed"}`}
              detail={[contact.relevance?.opportunityType, contact.title, contact.company].filter(Boolean).join(" · ")}
              level={contact.relevance?.level ?? null}
            />
          ))
        )}
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Everyone</h2>
        {contacts.map((contact) => (
          <PersonLink
            key={contact.id}
            href={`/people/${contact.id}`}
            name={contact.name || "Unnamed"}
            detail={contact.company}
            level={contact.relevance?.level ?? null}
          />
        ))}
      </section>
    </div>
  );
}
