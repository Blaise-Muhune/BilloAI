"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { DetailSkeleton } from "@/components/loading";
import { Button, Empty, ErrorNote, Field, PageWrap, PersonLink, PriorityBadge, SelectField } from "@/components/ui";
import { MorningRoom } from "@/components/morning-room";
import { recommendedLabel } from "@/lib/channels";
import { cardFaceSrc } from "@/lib/profile-links";
import { formatDay } from "@/lib/dates";
import { userMessage } from "@/lib/errors";
import { getEvent, listContactsForEvent, listTasks, updateEvent } from "@/lib/data";
import { useCaptureSync } from "@/lib/use-capture-sync";
import { groupSeatsHref } from "@/lib/workspace";
import {
  GOAL_LABELS,
  NETWORKING_GOALS,
  type ContactRecord,
  type EventRecord,
  type NetworkingGoal,
  type TaskRecord,
} from "@/lib/types";

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [missing, setMissing] = useState(false);
  const [goal, setGoal] = useState<NetworkingGoal>("customers");
  const [goalDetail, setGoalDetail] = useState("");
  const [savingGoal, setSavingGoal] = useState(false);
  const [goalError, setGoalError] = useState("");
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [savingNight, setSavingNight] = useState(false);
  const [nightError, setNightError] = useState("");
  const [nightSaved, setNightSaved] = useState(false);
  useCaptureSync(user?.uid);

  useEffect(() => {
    if (!user || !id) return;
    void Promise.all([getEvent(user.uid, id), listContactsForEvent(user.uid, id), listTasks(user.uid)])
      .then(([nextEvent, nextContacts, nextTasks]) => {
        setEvent(nextEvent);
        setContacts(nextContacts);
        setTasks(nextTasks.filter((task) => task.eventId === id));
        setMissing(!nextEvent);
        if (nextEvent) {
          setGoal(nextEvent.goal);
          setGoalDetail(nextEvent.goalDetail);
          setName(nextEvent.name);
          setType(nextEvent.type);
          setLocation(nextEvent.location);
          setDate(nextEvent.date);
        }
      })
      .finally(() => setReady(true));
  }, [user, id]);

  if (!ready) return <DetailSkeleton />;
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
  if (!event) return <DetailSkeleton />;

  async function saveNight(form: React.FormEvent) {
    form.preventDefault();
    if (!user || !event) return;
    if (!name.trim() || !location.trim() || !date) {
      setNightError("Add the name, place, and date.");
      return;
    }
    setSavingNight(true);
    setNightError("");
    try {
      await updateEvent(user.uid, event.id, { name, type, location, date });
      setEvent({ ...event, name, type, location, date });
      setNightSaved(true);
      window.setTimeout(() => setNightSaved(false), 1600);
    } catch (err) {
      setNightError(userMessage(err, "Could not save this event."));
    } finally {
      setSavingNight(false);
    }
  }

  const nightForm = (
    <form onSubmit={(form) => void saveNight(form)} className="surface max-w-2xl space-y-4 p-6">
      <h2 className="kicker">This event</h2>
      <div className="form-grid">
        <Field label="Event name" value={name} onChange={(item) => setName(item.target.value)} />
        <Field label="Event type" value={type} onChange={(item) => setType(item.target.value)} placeholder="Conference, chamber, meetup" />
        <Field label="Location" value={location} onChange={(item) => setLocation(item.target.value)} />
        <Field label="Date" type="date" value={date} onChange={(item) => setDate(item.target.value)} />
      </div>
      {nightError ? <ErrorNote>{nightError}</ErrorNote> : null}
      {nightSaved ? <p className="text-sm text-accent">Saved</p> : null}
      <Button type="submit" busy={savingNight} className="min-w-40">
        {savingNight ? "Saving…" : "Save event"}
      </Button>
    </form>
  );

  if (event.forSeats) {
    return (
      <PageWrap>
        <p className="kicker">
          {formatDay(event.date)} · {event.location}
        </p>
        <h1 className="serif mt-2 text-4xl leading-tight xl:text-5xl">{event.name}</h1>
        <p className="mt-4 max-w-2xl text-muted">
          Seats attach to this event. People you pay for set why they went. You see who used a seat, who captured someone, and whether they followed through.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/group" className="inline-flex rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-ink">
            Group overview
          </Link>
          <Link href={groupSeatsHref(event.id)} className="inline-flex rounded-full border border-line px-5 py-3 text-sm font-semibold">
            Buy seats
          </Link>
        </div>
        <div className="mt-8">{nightForm}</div>
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
      setGoalError(userMessage(err, "Could not save why you went."));
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
          {goalError ? <ErrorNote>{goalError}</ErrorNote> : null}
          <Button type="submit" busy={savingGoal} className="min-w-40">
            {savingGoal ? "Saving…" : "Save my goal"}
          </Button>
        </form>
        <div className="mt-8">{nightForm}</div>
      </PageWrap>
    );
  }

  const counts = {
    high: contacts.filter((contact) => contact.relevance?.level === "high").length,
    medium: contacts.filter((contact) => contact.relevance?.level === "medium").length,
    low: contacts.filter((contact) => contact.relevance?.level === "low").length,
    unknown: contacts.filter((contact) => contact.relevance?.level === "unknown").length,
  };

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
      {contacts.length === 0 ? (
        <Empty
          title="No one from this event yet"
          body="Save a person you met. We’ll match them to why you went."
          href={`/capture?event=${event.id}`}
          action="Add someone you met"
        />
      ) : (
        <>
      <MorningRoom event={event} contacts={contacts} tasks={tasks} />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {(["high", "medium", "low", "unknown"] as const).map((level) => (
          <div key={level} className="surface px-5 py-6 text-center">
            <p className="serif text-4xl xl:text-5xl">{counts[level]}</p>
            <div className="mt-3 flex justify-center">
              <PriorityBadge level={level} />
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <h2 className="kicker">Everyone</h2>
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
                action={recommendedLabel(contact.relevance)}
                level={contact.relevance?.level ?? null}
                layout="columns"
                photoSrc={cardFaceSrc(contact.cardUid)}
              />
            ))}
          </div>
      </div>
        </>
      )}
      {nightForm}
    </PageWrap>
  );
}
