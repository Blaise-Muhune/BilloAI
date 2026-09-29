"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { StatRowSkeleton } from "@/components/loading";
import { ErrorNote, PageHeader, PageWrap } from "@/components/ui";
import { getJson } from "@/lib/api";
import { userMessage } from "@/lib/errors";
import type { OpsOverview } from "@/lib/ops-types";
import { planLabel, statusLabel, usd } from "@/lib/pricing";
import { supportEmail } from "@/lib/support";

function stamp(iso: string) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl bg-[#f7f3ea] px-3 py-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="serif mt-1 text-3xl">{value}</dd>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const [data, setData] = useState<OpsOverview | null>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  function load() {
    if (!user) return;
    setError("");
    void getJson<OpsOverview>("/api/admin/overview")
      .then(setData)
      .catch((err: unknown) => setError(userMessage(err, "Could not load ops.")))
      .finally(() => setReady(true));
  }

  useEffect(() => {
    load();
  }, [user]);

  const forbidden = error === "This page is for the operator.";

  return (
    <PageWrap>
      <PageHeader
        kicker="Ops"
        title="What is live"
        body="Accounts, money, whether people captured, and who wrote you. Not their books — names they met stay off this page."
      />
      {error ? <ErrorNote retry={forbidden ? undefined : load}>{error}</ErrorNote> : null}
      {!ready ? (
        <>
          <StatRowSkeleton count={4} />
          <StatRowSkeleton count={4} />
        </>
      ) : null}
      {ready && forbidden ? (
        <p className="surface p-6 text-muted">Sign in as {supportEmail} to see this.</p>
      ) : null}
      {ready && data ? (
        <div className="space-y-8">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Accounts" value={data.accounts.total} hint={`${data.accounts.week} new this week`} />
            <Stat label="Seen in 7 days" value={data.accounts.seenWeek} hint={`${data.accounts.day} joined today`} />
            <Stat label="Onboarded" value={data.accounts.onboarded} hint={`${data.accounts.capturedPeople} have captured`} />
            <Stat label="Inbox" value={data.inbox.total} hint={data.inbox.unmailed ? `${data.inbox.unmailed} not mailed` : "All mailed"} />
          </dl>
          <p className="text-sm text-muted">
            Free {data.accounts.byPlan.free} · Individual {data.accounts.byPlan.individual} · Group {data.accounts.byPlan.organizer} · Team{" "}
            {data.accounts.byPlan.team}. {data.money.teamAdminsActive} Team admins billed.
          </p>

          <section className="surface space-y-4 p-6">
            <h2 className="serif text-3xl">Money</h2>
            <p className="text-sm text-muted">
              Listed prices from the account record, not a live Stripe pull. Individual is counted as monthly.
            </p>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Individual active" value={data.money.individualActive} hint={usd(data.money.listedIndividualMonthly) + " / mo listed"} />
              <Stat label="Team seats sold" value={data.money.teamSeatsSold} hint={usd(data.money.listedTeamYearly) + " / yr listed"} />
              <Stat label="Group seats bought" value={data.money.groupSeatsSold} hint={`${data.money.groupSeatsUsed} used · ${usd(data.money.listedGroupOnce)} once`} />
              <Stat label="Past due" value={data.money.pastDue} />
            </dl>
            {data.atRisk.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {data.atRisk.map((item) => (
                  <li key={item.email}>
                    <span className="font-semibold">{item.name || item.email}</span>
                    <span className="text-muted"> · {item.email} · {planLabel(item.plan)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="surface space-y-4 p-6">
            <h2 className="serif text-3xl">Product</h2>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="People saved" value={data.usage.contacts} hint={`${data.usage.contactsWeek} this week`} />
              <Stat label="High fit" value={data.usage.high} hint={`${data.usage.medium} medium · ${data.usage.unknown} not enough`} />
              <Stat label="Events" value={data.usage.events} hint={`${data.usage.eventsWeek} this week`} />
              <Stat label="Follow-ups open" value={data.usage.tasksOpen} hint={`${data.usage.tasksDone} finished · ${data.usage.tasksWeek} started this week`} />
            </dl>
            <p className="text-sm text-muted">
              {data.accounts.stillOnIncluded} still on the included first event. {data.accounts.unsubscribed} unsubscribed
              from email. {data.usage.inPlayWeek} companies marked in play this week. {data.usage.seatEvents} events exist
              only as a group seat container.
            </p>
          </section>

          <section className="surface space-y-4 p-6">
            <h2 className="serif text-3xl">Who wrote you</h2>
            {data.inbox.messages.length === 0 ? (
              <p className="text-sm text-muted">No contact messages yet.</p>
            ) : (
              <ul className="space-y-4">
                {data.inbox.messages.map((item) => (
                  <li key={item.id} className="rounded-2xl bg-[#f7f3ea] p-4">
                    <p className="font-semibold">
                      {item.name}{" "}
                      <a className="font-semibold text-accent" href={`mailto:${item.email}`}>
                        {item.email}
                      </a>
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {stamp(item.createdAt)}
                      {item.mailedAt ? "" : " · not mailed"}
                    </p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{item.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="surface space-y-4 p-6">
            <h2 className="serif text-3xl">New accounts</h2>
            {data.recent.length === 0 ? (
              <p className="text-sm text-muted">No accounts yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[36rem] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="py-2 pr-3 font-semibold">Person</th>
                      <th className="py-2 pr-3 font-semibold">Plan</th>
                      <th className="py-2 pr-3 font-semibold">Joined</th>
                      <th className="py-2 pr-3 font-semibold">Seen</th>
                      <th className="py-2 font-semibold">Saved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((item) => (
                      <tr key={item.email + item.createdAt} className="border-t border-line">
                        <td className="py-2.5 pr-3">
                          <span className="block font-semibold">{item.name || "—"}</span>
                          <span className="block text-muted">{item.email}</span>
                        </td>
                        <td className="py-2.5 pr-3">
                          {planLabel(item.plan)}
                          {item.status !== "none" ? ` · ${statusLabel(item.status)}` : ""}
                          {item.onboarded ? "" : " · not onboarded"}
                        </td>
                        <td className="py-2.5 pr-3 text-muted">{stamp(item.createdAt)}</td>
                        <td className="py-2.5 pr-3 text-muted">{stamp(item.lastSeenAt)}</td>
                        <td className="py-2.5">
                          {item.captures}
                          {item.high ? ` · ${item.high} high` : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {data.teams.length > 0 ? (
            <section className="surface space-y-4 p-6">
              <h2 className="serif text-3xl">Teams</h2>
              <ul className="space-y-3 text-sm">
                {data.teams.map((team) => (
                  <li key={team.id}>
                    <span className="font-semibold">{team.name}</span>
                    <span className="text-muted">
                      {" "}
                      · {team.email} · {team.active}/{team.assigned} active of {team.seatLimit} sold · {team.captures} saved
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {data.groups.length > 0 ? (
            <section className="surface space-y-4 p-6">
              <h2 className="serif text-3xl">Group events</h2>
              <ul className="space-y-3 text-sm">
                {data.groups.map((event) => (
                  <li key={event.id}>
                    <span className="font-semibold">{event.name}</span>
                    <span className="text-muted">
                      {" "}
                      · {event.email} · {event.seatsUsed} of {event.seatLimit || "—"} seats
                      {event.date ? ` · ${event.date}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </PageWrap>
  );
}
