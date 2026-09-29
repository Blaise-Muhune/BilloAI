"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { PeopleListSkeleton } from "@/components/loading";
import { Empty, ErrorNote, PageHeader, PageWrap, PersonLink } from "@/components/ui";
import { recommendedLabel } from "@/lib/channels";
import { listContacts, listEvents } from "@/lib/data";
import { userMessage } from "@/lib/errors";
import type { ContactRecord, EventRecord, RelevanceLevel } from "@/lib/types";

const filters: Array<RelevanceLevel | "all"> = ["all", "high", "medium", "low", "unknown"];
const filterLabel: Record<RelevanceLevel | "all", string> = {
  all: "All",
  high: "High",
  medium: "Medium",
  low: "Low",
  unknown: "Not enough to say",
};

export default function PeoplePage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [filter, setFilter] = useState<RelevanceLevel | "all">("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  function load() {
    if (!user) return;
    setError("");
    void Promise.all([listContacts(user.uid), listEvents(user.uid)])
      .then(([nextContacts, nextEvents]) => {
        setContacts(nextContacts);
        setEvents(nextEvents);
      })
      .catch((err: unknown) => setError(userMessage(err, "Could not load people.")))
      .finally(() => setReady(true));
  }

  useEffect(() => {
    load();
  }, [user]);

  const needle = query.trim().toLowerCase();
  const visible = contacts.filter((contact) => {
    if (filter !== "all" && contact.relevance?.level !== filter) return false;
    if (!needle) return true;
    const night = events.find((item) => item.id === contact.eventId);
    const hay = [
      contact.name,
      contact.company,
      contact.title,
      contact.location,
      contact.otherContact,
      contact.rawNote,
      contact.structuredNote?.painPoint,
      contact.structuredNote?.interest,
      contact.structuredNote?.opportunity,
      contact.structuredNote?.personalDetail,
      contact.structuredNote?.followUpPromise,
      contact.relevance?.opportunityType,
      contact.relevance?.recommendedChannel,
      contact.relevance?.suggestedAction,
      ...(contact.relevance?.reasons ?? []),
      contact.enrichment?.industry,
      contact.enrichment?.roleSummary,
      night?.name,
      night?.goalDetail,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(needle);
  });

  return (
    <PageWrap>
      <PageHeader
        kicker="People"
        title="People from the rooms you were in"
        body="Search a name, a company, or a promise — Ford plant, pricing, the late shift. Filter by how well they fit why you went."
        action={
          <Link href="/capture" className="inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink md:hidden">
            Add someone
          </Link>
        }
      />
      {error ? <ErrorNote retry={load}>{error}</ErrorNote> : null}
      {!ready ? (
        <PeopleListSkeleton />
      ) : (
        <>
          <div className="surface flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:p-4">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ford plant, promised pricing, a first name"
              className="field-control lg:flex-1"
            />
            <div className="flex flex-wrap gap-2">
              {filters.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`rounded-full px-3 py-2 text-sm font-semibold ${filter === item ? "bg-accent text-accent-ink" : "bg-[#f7f3ea] text-muted"}`}
                >
                  {filterLabel[item]}
                </button>
              ))}
            </div>
          </div>
          {visible.length === 0 ? (
            contacts.length > 0 && needle ? (
              <Empty title="No one matches that" body="Try a company, a first name, or a word from the note." />
            ) : (
              <Empty title="No one from an event yet" body="Add someone you met. They’ll show up here with how well they match your goal." href="/capture" action="Add someone you met" />
            )
          ) : (
            <div className="surface list-stack">
              <div className="desk-head">
                <span>Person</span>
                <span>Role</span>
                <span>Fit</span>
              </div>
              {visible.map((contact) => (
                <PersonLink
                  key={contact.id}
                  href={`/people/${contact.id}`}
                  name={contact.name || "Unnamed"}
                  detail={[contact.title, contact.company].filter(Boolean).join(" · ")}
                  action={recommendedLabel(contact.relevance)}
                  level={contact.relevance?.level ?? null}
                  layout="columns"
                />
              ))}
            </div>
          )}
        </>
      )}
    </PageWrap>
  );
}
