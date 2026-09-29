"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { PeopleListSkeleton } from "@/components/loading";
import { Empty, PageHeader, PageWrap, PersonLink } from "@/components/ui";
import { listContacts } from "@/lib/data";
import type { ContactRecord, RelevanceLevel } from "@/lib/types";

const filters: Array<RelevanceLevel | "all"> = ["all", "high", "medium", "low", "unknown"];
const filterLabel: Record<RelevanceLevel | "all", string> = {
  all: "All",
  high: "High",
  medium: "Medium",
  low: "Low",
  unknown: "Not enough",
};

export default function PeoplePage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [filter, setFilter] = useState<RelevanceLevel | "all">("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  function load() {
    if (!user) return;
    setError("");
    listContacts(user.uid)
      .then(setContacts)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load people."))
      .finally(() => setReady(true));
  }

  useEffect(() => {
    load();
  }, [user]);

  const needle = query.trim().toLowerCase();
  const visible = contacts.filter((contact) => {
    if (filter !== "all" && contact.relevance?.level !== filter) return false;
    if (!needle) return true;
    const hay = [
      contact.name,
      contact.company,
      contact.title,
      contact.location,
      contact.otherContact,
      contact.rawNote,
      contact.relevance?.opportunityType,
      contact.enrichment?.industry,
      contact.enrichment?.roleSummary,
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
        body="Search a name or a company. Filter by how well they fit why you went."
        action={
          <Link href="/capture" className="inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink md:hidden">
            Add someone
          </Link>
        }
      />
      {error ? (
        <p className="text-sm text-high">
          {error}{" "}
          <button type="button" className="font-semibold text-accent" onClick={load}>
            Retry
          </button>
        </p>
      ) : null}
      {!ready ? (
        <PeopleListSkeleton />
      ) : (
        <>
          <div className="surface flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:p-4">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="The Ford person, or a promise you made"
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
