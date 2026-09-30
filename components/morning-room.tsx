"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar, Button } from "@/components/ui";
import { cardFaceSrc } from "@/lib/profile-links";
import { contactNeedsScore } from "@/lib/score-contact";
import { downloadText, highHandoffCsv, highHandoffText, highHandoffs } from "@/lib/high-handoff";
import type { ContactRecord, EventRecord, TaskRecord } from "@/lib/types";

export function MorningRoom({
  event,
  contacts,
  tasks,
}: {
  event: EventRecord;
  contacts: ContactRecord[];
  tasks: TaskRecord[];
}) {
  const [copied, setCopied] = useState(false);
  const roomContacts = contacts.filter((contact) => contact.eventId === event.id);
  const roomTasks = tasks.filter((task) => task.eventId === event.id);
  const roomHighs = highHandoffs(roomContacts, roomTasks, 3);
  const roomPending = roomContacts.filter(contactNeedsScore).slice(0, 3);

  async function copyHigh() {
    const text = highHandoffText(roomHighs);
    if (!text.trim()) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function exportHigh() {
    const slug = event.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "event";
    downloadText(`billoai-${slug}-high.csv`, highHandoffCsv(roomHighs), "text/csv");
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="kicker">This room</p>
          <h2 className="serif mt-1 text-3xl">{event.name}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {roomHighs.length ? (
            <>
              <Button type="button" tone="ghost" onClick={() => void copyHigh()}>
                {copied ? "Copied" : "Copy the High matches"}
              </Button>
              <Button type="button" tone="ghost" onClick={exportHigh}>
                Export
              </Button>
            </>
          ) : null}
          <Link href={`/capture?event=${event.id}`} className="inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink">
            Add someone
          </Link>
        </div>
      </div>

      {roomHighs.length === 0 && roomPending.length === 0 ? (
        <p className="text-muted">No High matches yet from this room. People you saved still live under All people.</p>
      ) : null}

      {roomHighs.length ? (
        <div className="space-y-3">
          {roomHighs.map((row) => {
            const contact = roomContacts.find((item) => item.id === row.id);
            return (
              <Link key={row.id} href={`/people/${row.id}`} className="surface block space-y-3 p-5 transition hover:bg-[#f7f3ea]">
                <div className="flex items-start gap-3">
                  <Avatar name={row.name} photoSrc={cardFaceSrc(contact?.cardUid)} />
                  <div className="min-w-0">
                    <p className="font-semibold">{row.name}</p>
                    <p className="text-sm text-muted">{[row.title, row.company].filter(Boolean).join(" · ")}</p>
                  </div>
                </div>
                {row.rawNote ? (
                  <p>
                    <span className="text-sm text-muted">The line they said. </span>
                    {row.rawNote}
                  </p>
                ) : (
                  <p className="text-sm text-muted">No spoken line saved.</p>
                )}
                {row.draft ? (
                  <p className="whitespace-pre-wrap rounded-2xl bg-[#f7f3ea] px-4 py-3 text-sm">{row.draft}</p>
                ) : (
                  <p className="text-sm text-muted">Draft still coming.</p>
                )}
              </Link>
            );
          })}
        </div>
      ) : null}

      {roomPending.length ? (
        <div className="space-y-2">
          {roomPending.map((contact) => (
            <Link key={contact.id} href={`/people/${contact.id}`} className="surface block px-5 py-4 transition hover:bg-[#f7f3ea]">
              <p className="font-semibold">{contact.name || "Unnamed contact"}</p>
              <p className="mt-1 text-sm text-muted">Ranking when you’re back online.</p>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
