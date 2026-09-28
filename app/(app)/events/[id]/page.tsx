"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Empty, PageWrap, PersonLink, PriorityBadge } from "@/components/ui";
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
      <PageWrap>
        <h1 className="serif text-4xl">That event is not here.</h1>
        <p className="text-muted">It may have been deleted.</p>
        <Link href="/events" className="font-semibold text-accent">
          Back to events
        </Link>
      </PageWrap>
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
    .slice(0, 5);

  return (
    <PageWrap>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="kicker">
            {formatDay(event.date)} · {event.location}
          </p>
          <h1 className="serif mt-2 text-4xl leading-tight xl:text-5xl">{event.name}</h1>
          <p className="mt-4 font-semibold">{GOAL_LABELS[event.goal]}</p>
          <p className="mt-2 max-w-2xl text-muted">{event.goalDetail}</p>
        </div>
        <Link
          href={`/capture?event=${event.id}`}
          className="inline-flex shrink-0 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-ink shadow-[0_8px_20px_rgb(11_107_79/0.25)]"
        >
          Add someone you met
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {(["high", "medium", "low"] as const).map((level) => (
          <div key={level} className="surface px-5 py-6 text-center">
            <p className="serif text-4xl xl:text-5xl">{counts[level]}</p>
            <div className="mt-3 flex justify-center">
              <PriorityBadge level={level} />
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="kicker">Top conversations</h2>
          {top.length === 0 ? (
            <Empty title="No one from this night yet" body="Save a person you met. We’ll match them to why you went." />
          ) : (
            <div className="surface list-stack">
              {top.map((contact, index) => (
                <PersonLink
                  key={contact.id}
                  href={`/people/${contact.id}`}
                  name={`${index + 1}. ${contact.name || "Unnamed"}`}
                  detail={[contact.relevance?.opportunityType, contact.title, contact.company].filter(Boolean).join(" · ")}
                  level={contact.relevance?.level ?? null}
                />
              ))}
            </div>
          )}
        </section>
        <section className="space-y-3">
          <h2 className="kicker">Everyone</h2>
          {contacts.length === 0 ? (
            <p className="text-muted">People you met at this event land here.</p>
          ) : (
            <div className="surface list-stack">
              <div className="desk-head">
                <span>Person</span>
                <span>Company</span>
                <span>Fit</span>
              </div>
              {contacts.map((contact) => (
                <PersonLink
                  key={contact.id}
                  href={`/people/${contact.id}`}
                  name={contact.name || "Unnamed"}
                  detail={contact.company}
                  level={contact.relevance?.level ?? null}
                  layout="columns"
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </PageWrap>
  );
}
