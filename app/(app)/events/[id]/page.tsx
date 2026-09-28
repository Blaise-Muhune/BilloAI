"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Button, Empty, Field, PageWrap, PersonLink, PriorityBadge, SelectField } from "@/components/ui";
import { formatDay } from "@/lib/dates";
import { getEvent, listContactsForEvent, updateEvent } from "@/lib/data";
import { groupSeatsHref } from "@/lib/workspace";
import {
  GOAL_LABELS,
  NETWORKING_GOALS,
  type ContactRecord,
  type EventRecord,
  type NetworkingGoal,
  type RelevanceLevel,
} from "@/lib/types";

const rank: Record<RelevanceLevel, number> = { high: 0, medium: 1, low: 2 };

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [missing, setMissing] = useState(false);
  const [goal, setGoal] = useState<NetworkingGoal>("customers");
  const [goalDetail, setGoalDetail] = useState("");
  const [savingGoal, setSavingGoal] = useState(false);
  const [goalError, setGoalError] = useState("");

  useEffect(() => {
    if (!user || !id) return;
    void Promise.all([getEvent(user.uid, id), listContactsForEvent(user.uid, id)]).then(([nextEvent, nextContacts]) => {
      setEvent(nextEvent);
      setContacts(nextContacts);
      setMissing(!nextEvent);
      if (nextEvent) {
        setGoal(nextEvent.goal);
        setGoalDetail(nextEvent.goalDetail);
      }
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

  if (event.forSeats) {
    return (
      <PageWrap>
        <p className="kicker">
          {formatDay(event.date)} · {event.location}
        </p>
        <h1 className="serif mt-2 text-4xl leading-tight xl:text-5xl">{event.name}</h1>
        <p className="mt-4 max-w-2xl text-muted">
          Seats attach to this night. People you pay for set why they went. You see counts on Group, not who joined or who they met.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/group" className="inline-flex rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-ink">
            Group overview
          </Link>
          <Link href={groupSeatsHref(event.id)} className="inline-flex rounded-full border border-line px-5 py-3 text-sm font-semibold">
            Buy seats
          </Link>
        </div>
      </PageWrap>
    );
  }

  async function saveGoal(form: React.FormEvent) {
    form.preventDefault();
    if (!user || !event) return;
    if (!goalDetail.trim()) {
      setGoalError("Say why you are here. The company or host does not set this.");
      return;
    }
    setSavingGoal(true);
    setGoalError("");
    try {
      await updateEvent(user.uid, event.id, { goal, goalDetail });
      setEvent({ ...event, goal, goalDetail });
    } catch (err) {
      setGoalError(err instanceof Error ? err.message : "Could not save why you went.");
    } finally {
      setSavingGoal(false);
    }
  }

  if (!event.goalDetail.trim()) {
    return (
      <PageWrap>
        <p className="kicker">
          {formatDay(event.date)} · {event.location}
        </p>
        <h1 className="serif mt-2 text-4xl leading-tight xl:text-5xl">{event.name}</h1>
        <form onSubmit={(formEvent) => void saveGoal(formEvent)} className="surface mt-6 max-w-xl space-y-5 p-6 lg:p-8">
          <h2 className="serif text-3xl">Why are you at this event?</h2>
          <p className="text-muted">Whoever paid for the seat does not set this. Matching who you meet stays on your account.</p>
          <SelectField label="Goal" value={goal} onChange={(item) => setGoal(item.target.value as NetworkingGoal)}>
            {NETWORKING_GOALS.map((item) => (
              <option key={item} value={item}>
                {GOAL_LABELS[item]}
              </option>
            ))}
          </SelectField>
          <Field
            label="In your own words"
            value={goalDetail}
            onChange={(item) => setGoalDetail(item.target.value)}
            placeholder="Find operators who need automation"
          />
          {goalError ? <p className="text-sm text-high">{goalError}</p> : null}
          <Button type="submit" disabled={savingGoal} className="min-w-40">
            {savingGoal ? "Saving…" : "Save my goal"}
          </Button>
        </form>
      </PageWrap>
    );
  }

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
