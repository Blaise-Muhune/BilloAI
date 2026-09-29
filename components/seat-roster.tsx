"use client";

import { useMemo, useState } from "react";
import { Avatar, Button } from "@/components/ui";
import { formatWhen } from "@/lib/dates";
import type { SeatPerson, SeatPersonStatus } from "@/lib/types";

type RosterFilter = "all" | "pending" | SeatPersonStatus;

const FILTERS: { id: RosterFilter; label: string }[] = [
  { id: "pending", label: "Not yet captured" },
  { id: "all", label: "Everyone" },
  { id: "invited", label: "Invited" },
  { id: "joined", label: "Joined, nothing saved" },
  { id: "captured", label: "Captured someone" },
];

const STATUS: Record<SeatPersonStatus, { label: string; className: string }> = {
  invited: { label: "Invited", className: "bg-white text-muted" },
  joined: { label: "No captures yet", className: "bg-[#fff8e8] text-[#7c4a12]" },
  captured: { label: "Using the seat", className: "bg-[#e5f4ee] text-accent" },
};

export function SeatRoster({
  people,
  openSeats,
  onRevoke,
  revokePending,
}: {
  people: SeatPerson[];
  openSeats?: number;
  onRevoke?: (id: string) => void;
  revokePending?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RosterFilter>("pending");
  const [copied, setCopied] = useState("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return people.filter((person) => {
      if (filter === "pending") {
        if (person.status === "captured") return false;
      } else if (filter !== "all" && person.status !== filter) return false;
      if (!needle) return true;
      return `${person.name} ${person.email}`.toLowerCase().includes(needle);
    });
  }, [people, query, filter]);

  const quiet = people.filter((person) => person.status === "invited" || person.status === "joined");
  const counts = {
    invited: people.filter((person) => person.status === "invited").length,
    joined: people.filter((person) => person.status === "joined").length,
    captured: people.filter((person) => person.status === "captured").length,
  };

  async function copyEmails(list: SeatPerson[], label: string) {
    const emails = list.map((person) => person.email).filter(Boolean);
    if (!emails.length) return;
    await navigator.clipboard.writeText(emails.join(", "));
    setCopied(label);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="serif text-2xl">Who used a seat</h3>
          <p className="mt-1 text-sm text-muted">
            Names of people you paid for. Who captured someone, and who still needs a nudge.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" tone="ghost" disabled={!quiet.length} onClick={() => void copyEmails(quiet, "quiet")}>
            {copied === "quiet" ? "Copied quiet emails" : "Copy emails who need a nudge"}
          </Button>
          <Button type="button" tone="ghost" disabled={!people.length} onClick={() => void copyEmails(people, "all")}>
            {copied === "all" ? "Copied" : "Copy every email"}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Mini label="Invited, not in yet" value={counts.invited} />
        <Mini label="In, nothing saved" value={counts.joined} />
        <Mini label="Captured someone" value={counts.captured} />
      </div>

      {typeof openSeats === "number" && openSeats > 0 ? (
        <p className="rounded-2xl bg-[#fff8e8] px-4 py-3 text-sm">
          {openSeats} {openSeats === 1 ? "seat is" : "seats are"} still unused. The join link stays open until they
          claim it.
        </p>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search a name or email"
          className="field-control lg:max-w-sm"
        />
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                filter === item.id ? "bg-foreground text-card" : "border border-line bg-card"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl bg-[#f7f3ea] px-4 py-6 text-sm text-muted">
          {people.length === 0
            ? "Nobody has used a seat yet. Share the join link, or invite an email."
            : filter === "pending"
              ? "Everyone on a seat has captured someone."
              : "Nobody matches that search."}
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[1.4rem] border border-line bg-card">
          {visible.map((person) => {
            const chip = STATUS[person.status];
            const label = person.name || person.email || "Someone";
            return (
              <li key={person.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={label} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{label}</p>
                    <p className="truncate text-sm text-muted">{person.email}</p>
                    <p className="mt-1 text-xs text-muted">
                      {person.status === "invited"
                        ? person.joinedAt
                          ? `Invited ${formatWhen(person.joinedAt)}`
                          : "Invite sent"
                        : person.joinedAt
                          ? `Joined ${formatWhen(person.joinedAt)}`
                          : "Joined"}
                      {person.lastCaptureAt ? ` · last save ${formatWhen(person.lastCaptureAt)}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${chip.className}`}>{chip.label}</span>
                  {person.status !== "invited" ? (
                    <dl className="flex gap-3 text-center text-xs">
                      <span>
                        <dt className="text-muted">Saved</dt>
                        <dd className="font-semibold">{person.captures}</dd>
                      </span>
                      <span>
                        <dt className="text-muted">High</dt>
                        <dd className="font-semibold">{person.high}</dd>
                      </span>
                      <span>
                        <dt className="text-muted">Followed through</dt>
                        <dd className="font-semibold">
                          {person.followUpsDone}/{person.followUps}
                        </dd>
                      </span>
                    </dl>
                  ) : null}
                  {onRevoke && person.status !== "captured" ? (
                    <Button type="button" tone="ghost" busy={revokePending} onClick={() => onRevoke(person.id)}>
                      Revoke
                    </Button>
                  ) : onRevoke ? (
                    <Button type="button" tone="ghost" busy={revokePending} onClick={() => onRevoke(person.id)}>
                      Revoke seat
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-[#f7f3ea] px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="serif mt-1 text-3xl">{value}</p>
    </div>
  );
}
