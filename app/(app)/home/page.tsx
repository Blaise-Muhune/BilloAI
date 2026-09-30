"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { HomeBodySkeleton } from "@/components/loading";
import { BrandMark } from "@/components/brand";
import { Empty, ErrorNote, PageHeader, PageWrap } from "@/components/ui";
import { MorningRoom } from "@/components/morning-room";
import { getJson } from "@/lib/api";
import { CAPTURE_QUEUE_EVENT, CAPTURE_WORK_EVENT } from "@/lib/capture-events";
import { userMessage } from "@/lib/errors";
import { formatDay, todayISO } from "@/lib/dates";
import { listContacts, listEvents, listTasks } from "@/lib/data";
import { useCaptureSync } from "@/lib/use-capture-sync";
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
  useCaptureSync(user?.uid);

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
      .catch((err: unknown) => setError(userMessage(err, "Could not load home.")))
      .finally(() => setReady(true));
  }

  useEffect(() => {
    load();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    function refresh() {
      void Promise.all([listTasks(uid), listContacts(uid), listEvents(uid)])
        .then(([nextTasks, nextContacts, nextEvents]) => {
          setTasks(nextTasks);
          setContacts(nextContacts);
          setEvents(nextEvents);
        })
        .catch(() => undefined);
    }
    window.addEventListener(CAPTURE_WORK_EVENT, refresh);
    window.addEventListener(CAPTURE_QUEUE_EVENT, refresh);
    return () => {
      window.removeEventListener(CAPTURE_WORK_EVENT, refresh);
      window.removeEventListener(CAPTURE_QUEUE_EVENT, refresh);
    };
  }, [user]);

  const today = todayISO();
  const upcoming = events.filter((event) => event.date >= today).slice(0, 5);
  const latestCapture = contacts[0];
  const room = latestCapture ? events.find((event) => event.id === latestCapture.eventId) ?? null : null;
  const hasEvent = events.length > 0;
  const hasPeople = contacts.length > 0;
  const firstRun = !hasEvent;
  const needsCapture = hasEvent && !hasPeople;
  const captureEvent = upcoming[0] ?? events[0];
  const captureHref = captureEvent ? `/capture?event=${captureEvent.id}` : "/capture";
  const primaryHref = firstRun ? "/events/new" : captureHref;
  const primaryLabel = firstRun ? "Create an event" : "Add someone you met";

  return (
    <PageWrap>
      <PageHeader
        kicker="Home"
        title="Who from the room still matters"
        body={
          !ready
            ? "The people who fit why you went, and the conversations still open."
            : firstRun
              ? "Name the next room and why you’re going. That’s how we know who is worth staying connected to."
              : needsCapture
                ? "Save the people you met. Speak the note and keep going. We’ll show who matched why you went."
                : user && !user.emailVerified
                  ? "Your first event can match people you met now. Verify email before you pay or use that on later events."
                  : "The two or three from that room worth writing, with the line you said and the draft. Ranking fills in while you keep capturing."
        }
        action={
          ready ? (
            <Link href={primaryHref} className="inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink md:hidden">
              {firstRun ? "Create an event" : "Add someone"}
            </Link>
          ) : null
        }
      />
      {planLine ? <p className="text-sm font-semibold text-accent">{planLine}</p> : null}
      {error ? <ErrorNote retry={load}>{error}</ErrorNote> : null}

      {!ready ? (
        <HomeBodySkeleton />
      ) : firstRun || needsCapture ? (
        <div className="rounded-[1.6rem] bg-foreground p-6 text-card sm:p-8">
          <div className="flex items-center gap-2.5">
            <BrandMark className="h-7 w-7" />
            <p className="kicker text-[#9ddec8]">{firstRun ? "Before the room" : "After the room"}</p>
          </div>
          <h2 className="serif mt-3 text-3xl leading-tight">
            {firstRun ? "Name the next room." : "Keep the people you just met."}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/65">
            {firstRun
              ? "Say why you’re going. That’s the filter for everyone you save."
              : "We’ll show who is worth staying connected to. Nothing sends itself."}
          </p>
          <Link href={primaryHref} className="mt-6 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink">
            {primaryLabel}
          </Link>
          {needsCapture && upcoming.length > 0 ? (
            <div className="mt-8 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">Your events</p>
              {upcoming.map((event) => (
                <Link key={event.id} href={`/events/${event.id}`} className="block rounded-2xl bg-white/10 px-5 py-4 transition hover:bg-white/15">
                  <p className="font-semibold">{event.name}</p>
                  <p className="mt-1 text-sm text-white/65">
                    {formatDay(event.date)} · {event.location}
                  </p>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.9fr)]">
            <div className="space-y-8">
              {room ? (
                <MorningRoom event={room} contacts={contacts} tasks={tasks} />
              ) : (
                <Empty title="No high matches yet" body="People you saved still live under All people." href="/people" action="All people" />
              )}
            </div>

            <aside className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="kicker">Upcoming events</h2>
                <Link href="/events/new" className="text-sm font-semibold text-accent">
                  New event
                </Link>
              </div>
              {upcoming.length === 0 ? (
                <Empty title="No upcoming event" body="Past events stay under Events." href="/events" action="See events" />
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
