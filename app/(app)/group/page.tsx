"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { GroupBodySkeleton, GroupSkeleton, Pulse } from "@/components/loading";
import { SeatRoster } from "@/components/seat-roster";
import { Button, Empty, ErrorNote, PageHeader, PageWrap } from "@/components/ui";
import { getJson } from "@/lib/api";
import { getUser, listOrganizedEvents, saveWorkspace } from "@/lib/data";
import { userMessage } from "@/lib/errors";
import { formatDay } from "@/lib/dates";
import type { GroupKind, OrganizedEventDoc, SeatPerson } from "@/lib/types";
import { groupCopy, groupSeatsHref, invitePath } from "@/lib/workspace";

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
  members: SeatPerson[];
};

function GroupOverview() {
  const { user } = useAuth();
  const params = useSearchParams();
  const [kind, setKind] = useState<GroupKind | "">("");
  const [events, setEvents] = useState<Organized[]>([]);
  const [metrics, setMetrics] = useState<Metrics[]>([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [ready, setReady] = useState(false);
  const copy = groupCopy(kind);
  const paid = params.get("status") === "success";

  function load() {
    if (!user) return;
    setError("");
    const fromQuery = params.get("for") === "company" || params.get("for") === "event" ? params.get("for") : "";
    void Promise.all([getUser(user.uid), listOrganizedEvents(user.uid), getJson<{ metrics: Metrics[] }>("/api/organizer/metrics")])
      .then(([account, nextEvents, nextMetrics]) => {
        const saved = account?.groupKind === "company" || account?.groupKind === "event" ? account.groupKind : "";
        const nextKind = saved || fromQuery;
        setKind(nextKind === "company" || nextKind === "event" ? nextKind : "");
        setEvents(nextEvents);
        setMetrics(nextMetrics.metrics);
        if (!saved && (fromQuery === "company" || fromQuery === "event")) {
          void saveWorkspace(user.uid, "group", fromQuery);
        }
      })
      .catch((err: unknown) => setError(userMessage(err, "Could not load the group.")))
      .finally(() => setReady(true));
  }

  useEffect(() => {
    load();
  }, [user, params]);

  async function chooseKind(next: GroupKind) {
    if (!user) return;
    await saveWorkspace(user.uid, "group", next);
    setKind(next);
  }

  async function copyInvite(code: string) {
    const url = `${window.location.origin}${invitePath(code, kind)}`;
    await navigator.clipboard.writeText(url);
    setCopied(code);
  }

  return (
    <PageWrap>
      <PageHeader kicker={copy.kicker} title={copy.overviewTitle} body={copy.overviewBody} />
      {paid ? <p className="text-sm text-accent">Seats are on the way. Share the join link as soon as the code appears.</p> : null}
      {error ? <ErrorNote retry={load}>{error}</ErrorNote> : null}
      {!ready ? <GroupBodySkeleton /> : null}
      {ready && !kind ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <button type="button" className="surface p-7 text-left transition hover:bg-[#f7f3ea]" onClick={() => void chooseKind("company")}>
            <span className="kicker">Paying for people</span>
            <span className="serif mt-3 block text-3xl">A company sending people</span>
            <span className="mt-3 block text-sm leading-relaxed text-muted">
              You buy seats for one event they are attending. You see who used a seat, who captured someone, and whether they followed through.
            </span>
          </button>
          <button type="button" className="surface p-7 text-left transition hover:bg-[#f7f3ea]" onClick={() => void chooseKind("event")}>
            <span className="kicker">Hosting an event</span>
            <span className="serif mt-3 block text-3xl">A room or event</span>
            <span className="mt-3 block text-sm leading-relaxed text-muted">
              You buy seats for attendees of this event. You see who used a seat, who captured someone, and whether they followed through.
            </span>
          </button>
        </div>
      ) : null}
      {ready && kind && events.length === 0 ? (
        <Empty title="No seats yet" body={copy.emptySeats} href="/events/new?for=group" action="Create the event" />
      ) : null}
      {ready && kind && events.length > 0 ? (
        <div className="space-y-4">
          {events.map((event) => {
            const stats = metrics.find((item) => item.organizedEventId === event.id);
            const share = event.joinCode ? `${typeof window !== "undefined" ? window.location.origin : ""}${invitePath(event.joinCode, kind)}` : "";
            return (
              <article key={event.id} className="surface space-y-5 p-6">
                <div>
                  <p className="serif text-2xl">{event.name}</p>
                  <p className="mt-1 text-sm text-muted">
                    {event.date ? `${formatDay(event.date)} · ` : ""}
                    {event.seatLimit > 0 ? `${event.seatsUsed} of ${event.seatLimit} seats used` : "Payment has not confirmed yet"}
                  </p>
                </div>
                {event.seatLimit > 0 && event.joinCode ? (
                  <div className="rounded-2xl bg-[#f7f3ea] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">{copy.shareLabel}</p>
                    <p className="mt-2 break-all text-sm font-semibold">{share}</p>
                    <p className="mt-1 text-sm text-muted">Code {event.joinCode}</p>
                    <Button type="button" tone="ghost" className="mt-3" onClick={() => void copyInvite(event.joinCode)}>
                      {copied === event.joinCode ? "Copied" : "Copy join link"}
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted">
                    Join link appears after payment confirms. Unused seats stay with this event.
                  </p>
                )}
                {event.seatLimit > 0 ? (
                  <Link
                    href={groupSeatsHref(event.eventId)}
                    className="inline-flex text-sm font-semibold text-accent"
                  >
                    Add seats
                  </Link>
                ) : (
                  <Link href={groupSeatsHref(event.eventId)} className="inline-flex text-sm font-semibold text-accent">
                    Finish paying for seats
                  </Link>
                )}
                {event.seatLimit > 0 && stats ? (
                  <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <Stat label="Seats used" value={stats.attendees} />
                    <Stat label="People who captured someone" value={stats.attendeesWhoCaptured} />
                    <Stat label="Contacts saved" value={stats.contacts} />
                    <Stat label="High-fit matches" value={stats.high} />
                    <Stat label="Follow-ups started" value={stats.followUps} />
                    <Stat label="Follow-ups finished" value={stats.followUpsDone} />
                  </dl>
                ) : event.seatLimit > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-busy="true">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div key={index} className="rounded-2xl bg-[#f7f3ea] px-3 py-3">
                        <Pulse className="h-3 w-16" />
                        <Pulse className="mt-2 h-8 w-10" />
                      </div>
                    ))}
                    <span className="sr-only">Loading counts</span>
                  </div>
                ) : null}
                {event.seatLimit > 0 && stats ? (
                  <SeatRoster people={stats.members ?? []} openSeats={Math.max(0, event.seatLimit - event.seatsUsed)} />
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}
      {ready && kind ? (
        <p className="text-sm text-muted">
          If this is every month for a sales team,{" "}
          <Link href="/billing?plan=team" className="font-semibold text-accent">
            Team is the year-round seat
          </Link>
          . For one person,{" "}
          <Link href="/billing" className="font-semibold text-accent">
            Individual
          </Link>
          . Unused Group seats do not move to the next event.
        </p>
      ) : null}
      {ready && kind ? (
        <p className="text-sm text-muted">
          Paying for a different kind of group?{" "}
          <button
            type="button"
            className="font-semibold text-accent"
            onClick={() => {
              setKind("");
              if (user) void saveWorkspace(user.uid, "group", "");
            }}
          >
            Switch company or event
          </button>
        </p>
      ) : null}
    </PageWrap>
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

export default function GroupPage() {
  return (
    <Suspense fallback={<GroupSkeleton />}>
      <GroupOverview />
    </Suspense>
  );
}
