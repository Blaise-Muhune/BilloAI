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

  const visible = contacts.filter((contact) => filter === "all" || contact.relevance?.level === filter);

  return (
    <div className="space-y-5">
      <h1 className="serif text-4xl">People</h1>
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
        <Empty title="Your network is empty" body="Contacts you capture at an event will live here." href="/capture" action="Capture someone" />
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
