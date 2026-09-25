"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Empty, PersonLink } from "@/components/ui";
import { listContacts } from "@/lib/data";
import type { ContactRecord, RelevanceLevel } from "@/lib/types";

const filters: Array<RelevanceLevel | "all"> = ["all", "high", "medium", "low"];

export default function PeoplePage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [filter, setFilter] = useState<RelevanceLevel | "all">("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  function load() {
    if (!user) return;
    setError("");
    listContacts(user.uid)
      .then(setContacts)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load people."));
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
    <div className="space-y-5">
      <h1 className="serif text-4xl">People</h1>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="The Ford person, or a promise you made"
        className="w-full rounded-2xl border border-line bg-white px-3 py-3"
      />
      {error ? (
        <p className="text-sm text-high">
          {error}{" "}
          <button type="button" className="font-semibold text-accent" onClick={load}>
            Retry
          </button>
        </p>
      ) : null}
      <div className="flex gap-2">
        {filters.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={`rounded-full px-3 py-1 text-sm ${filter === item ? "bg-accent text-accent-ink" : "bg-card text-muted"}`}
          >
            {item}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        contacts.length > 0 && needle ? (
          <Empty title="No one matches that" body="Try a company, a first name, or a word from the note." />
        ) : (
          <Empty title="Your network is empty" body="Contacts you capture at an event will live here." href="/capture" action="Capture someone" />
        )
      ) : (
        visible.map((contact) => (
          <PersonLink
            key={contact.id}
            href={`/people/${contact.id}`}
            name={contact.name || "Unnamed"}
            detail={[contact.title, contact.company].filter(Boolean).join(", ")}
            level={contact.relevance?.level ?? null}
          />
        ))
      )}
    </div>
  );
}
