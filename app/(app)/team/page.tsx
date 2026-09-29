"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { GroupBodySkeleton, GroupSkeleton, Pulse } from "@/components/loading";
import { SeatRoster } from "@/components/seat-roster";
import { Area, Button, Empty, ErrorNote, Field, PageHeader, PageWrap } from "@/components/ui";
import { getJson, patchJson, postJson } from "@/lib/api";
import { userMessage } from "@/lib/errors";
import { TEAM_SEAT_MIN, TEAM_SEAT_MONTHLY_USD, TEAM_SEAT_YEARLY_USD, TEAM_YEARLY_FLOOR_USD, usd } from "@/lib/pricing";
import type { SeatPerson, TeamSeatStatus } from "@/lib/types";
import { invitePath, teamBillingHref, teamCopy } from "@/lib/workspace";

type TeamPayload = {
  admin: boolean;
  team: {
    id: string;
    name: string;
    icp: string;
    targetCompanies: string[];
    targetRoles: string;
    seatLimit: number;
    joinCode: string;
  } | null;
  seats: { id: string; email: string; name?: string; status: TeamSeatStatus }[];
  people: SeatPerson[];
};

type Metrics = {
  seatLimit: number;
  seatsAssigned: number;
  seatsActive: number;
  peopleWhoCaptured: number;
  captures: number;
  high: number;
  captureRate: number;
  followThrough: number;
  medianDaysToFollowUp: number;
  events: { name: string; date: string; captures: number; high: number }[];
  companiesInPlayThisWeek: number;
};

function TeamOverview() {
  const { user } = useAuth();
  const params = useSearchParams();
  const [data, setData] = useState<TeamPayload | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [name, setName] = useState("");
  const [icp, setIcp] = useState("");
  const [companies, setCompanies] = useState("");
  const [roles, setRoles] = useState("");
  const [invite, setInvite] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const copy = teamCopy();
  const paid = params.get("status") === "success";

  function applyTeam(next: TeamPayload) {
    setData(next);
    setName(next.team?.name ?? "");
    setIcp(next.team?.icp ?? "");
    setCompanies((next.team?.targetCompanies ?? []).join("\n"));
    setRoles(next.team?.targetRoles ?? "");
  }

  function load() {
    if (!user) return;
    setError("");
    void Promise.all([
      getJson<TeamPayload>("/api/team"),
      getJson<Metrics>("/api/team/metrics").catch(() => null),
    ])
      .then(([next, nextMetrics]) => {
        applyTeam(next);
        setMetrics(next.admin ? nextMetrics : null);
      })
      .catch((err: unknown) => setError(userMessage(err, "Could not load the team.")))
      .finally(() => setReady(true));
  }

  useEffect(() => {
    load();
  }, [user]);

  async function saveHunt() {
    setPending(true);
    setError("");
    setSaved("");
    try {
      await patchJson("/api/team", {
        name,
        icp,
        targetCompanies: companies,
        targetRoles: roles,
      });
      setSaved("Hunt saved. Scoring uses this on the next capture.");
      load();
    } catch (err) {
      setError(userMessage(err, "Could not save the hunt."));
    } finally {
      setPending(false);
    }
  }

  async function inviteSeat(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await postJson("/api/team/seats", { email: invite });
      setInvite("");
      load();
    } catch (err) {
      setError(userMessage(err, "Could not invite that email."));
    } finally {
      setPending(false);
    }
  }

  async function revoke(seatId: string) {
    setPending(true);
    setError("");
    try {
      await patchJson("/api/team/seats", { seatId, status: "revoked" });
      load();
    } catch (err) {
      setError(userMessage(err, "Could not revoke that seat."));
    } finally {
      setPending(false);
    }
  }

  async function copyInvite() {
    if (!data?.team?.joinCode) return;
    const url = `${window.location.origin}${invitePath(data.team.joinCode, "team")}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  const assigned = data?.seats.filter((seat) => seat.status === "active" || seat.status === "invited").length ?? 0;

  return (
    <PageWrap>
      <PageHeader kicker={copy.kicker} title={copy.overviewTitle} body={copy.overviewBody} />
      {paid ? <p className="text-sm text-accent">Seats are on the way. Invite emails as soon as the limit appears.</p> : null}
      {error ? <ErrorNote retry={load}>{error}</ErrorNote> : null}
      {saved ? <p className="text-sm text-accent">{saved}</p> : null}
      {!ready ? <GroupBodySkeleton /> : null}
      {ready && !data?.team ? (
        <Empty
          title="No Team seats yet"
          body={`${usd(TEAM_SEAT_YEARLY_USD)} a seat / year or ${usd(TEAM_SEAT_MONTHLY_USD)} a month. From ${usd(TEAM_YEARLY_FLOOR_USD)} a year at ${TEAM_SEAT_MIN} seats. Group $6 seats are a different product.`}
          href={teamBillingHref()}
          action="Pay for Team seats"
        />
      ) : null}
      {ready && data?.team && !data.admin ? (
        <section className="surface space-y-4 p-6">
          <h2 className="serif text-3xl">{data.team.name}</h2>
          <p className="text-muted">You have a year-round seat. Your book stays yours.</p>
          {data.team.icp ? <p className="text-sm">Hunt: {data.team.icp}</p> : null}
          {data.team.targetCompanies.length > 0 ? (
            <p className="text-sm text-muted">Target companies are set. Scoring uses them with your event goal.</p>
          ) : null}
        </section>
      ) : null}
      {ready && data?.team && data.admin ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <section className="surface space-y-5 p-6">
            <h2 className="serif text-3xl">Company hunt</h2>
            <p className="text-sm text-muted">
              This is injected into scoring next to each rep’s event goal. They still write their own note.
            </p>
            <Field label="Team name" value={name} onChange={(event) => setName(event.target.value)} />
            <Area
              label="Who you are hunting"
              value={icp}
              onChange={(event) => setIcp(event.target.value)}
              placeholder="Mid-market plants that buy OT/IT integration"
            />
            <Area
              label="Target companies"
              value={companies}
              onChange={(event) => setCompanies(event.target.value)}
              placeholder={"One per line"}
            />
            <Field
              label="Roles (optional)"
              value={roles}
              onChange={(event) => setRoles(event.target.value)}
              placeholder="Plant ops, OT managers"
            />
            <Button type="button" busy={pending} onClick={() => void saveHunt()}>
              Save hunt
            </Button>
          </section>
          <section className="surface space-y-5 p-6">
            <div>
              <h2 className="serif text-3xl">Seats</h2>
              <p className="mt-1 text-sm text-muted">
                {data.team.seatLimit > 0
                  ? `${assigned} of ${data.team.seatLimit} seats assigned`
                  : "Payment has not confirmed yet"}
              </p>
            </div>
            {data.team.seatLimit > 0 && data.team.joinCode ? (
              <div className="rounded-2xl bg-[#f7f3ea] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{copy.shareLabel}</p>
                <p className="mt-2 break-all text-sm font-semibold">
                  {`${typeof window !== "undefined" ? window.location.origin : ""}${invitePath(data.team.joinCode, "team")}`}
                </p>
                <p className="mt-1 text-sm text-muted">Code {data.team.joinCode}</p>
                <Button type="button" tone="ghost" className="mt-3" onClick={() => void copyInvite()}>
                  {copied ? "Copied" : "Copy join link"}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted">Join link appears after payment confirms.</p>
            )}
            <form onSubmit={inviteSeat} className="space-y-3">
              <Field
                label="Invite email"
                type="email"
                value={invite}
                onChange={(event) => setInvite(event.target.value)}
                required
              />
              <Button type="submit" busy={pending} disabled={data.team.seatLimit < 1}>
                Invite seat
              </Button>
            </form>
            <Link href={teamBillingHref()} className="inline-flex text-sm font-semibold text-accent">
              Add or remove seats
            </Link>
          </section>
        </div>
      ) : null}
      {ready && data?.admin && data.team ? (
        <section className="surface space-y-5 p-6">
          <SeatRoster
            people={data.people ?? []}
            openSeats={Math.max(0, data.team.seatLimit - assigned)}
            onRevoke={(id) => void revoke(id)}
            revokePending={pending}
          />
        </section>
      ) : null}
      {ready && data?.admin && data.team && data.team.seatLimit > 0 ? (
        <section className="surface space-y-5 p-6">
          <h2 className="serif text-3xl">Coverage</h2>
          <p className="text-sm text-muted">
            Team-wide counts. The roster above is who has a seat. It is never who they met, their notes, or drafts.
          </p>
          {metrics ? (
            <>
              <p className="rounded-2xl bg-[#fff8e8] px-4 py-3 text-sm">
                {metrics.companiesInPlayThisWeek === 0
                  ? "No companies in play this week. The book stays closed — this is a count only."
                  : `${metrics.companiesInPlayThisWeek} ${metrics.companiesInPlayThisWeek === 1 ? "company" : "companies"} in play this week. Names stay in each rep’s book.`}
              </p>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Stat label="Companies in play this week" value={metrics.companiesInPlayThisWeek} />
                <Stat label="Seats used" value={metrics.seatsActive} />
                <Stat label="People who captured" value={metrics.peopleWhoCaptured} />
                <Stat label="High-fit matches" value={metrics.high} />
                <Stat label="Capture rate" value={`${Math.round(metrics.captureRate * 100)}%`} />
                <Stat label="Follow-through" value={`${Math.round(metrics.followThrough * 100)}%`} />
                <Stat label="Median days to follow-up" value={metrics.medianDaysToFollowUp} />
              </dl>
              {metrics.events.length > 0 ? (
                <ul className="space-y-2">
                  {metrics.events.map((event, index) => (
                    <li key={`${event.name}-${event.date}-${index}`} className="flex justify-between gap-3 text-sm">
                      <span>
                        {event.name}
                        {event.date ? ` · ${event.date}` : ""}
                      </span>
                      <span className="text-muted">
                        {event.captures} saved · {event.high} high
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-busy="true">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="rounded-2xl bg-[#f7f3ea] px-3 py-3">
                  <Pulse className="h-3 w-16" />
                  <Pulse className="mt-2 h-8 w-10" />
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </PageWrap>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-[#f7f3ea] px-3 py-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="serif mt-1 text-3xl">{value}</dd>
    </div>
  );
}

export default function TeamPage() {
  return (
    <Suspense fallback={<GroupSkeleton />}>
      <TeamOverview />
    </Suspense>
  );
}
