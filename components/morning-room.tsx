"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar, Button } from "@/components/ui";
import { CAPTURE_QUEUE_EVENT } from "@/lib/capture-events";
import { listQueuedCaptures, type CaptureQueueItem } from "@/lib/capture-queue";
import { cardFaceSrc } from "@/lib/profile-links";
import { contactNeedsGlance, contactNeedsScore, contactStillReading } from "@/lib/score-contact";
import { downloadText, highHandoffCsv, highHandoffText, highHandoffs } from "@/lib/high-handoff";
import type { ContactRecord, EventRecord, TaskRecord } from "@/lib/types";

function glanceLine(contact: ContactRecord) {
  if (contact.scoreStatus === "failed") return "Could not rank. Open them to try.";
  if (contact.alreadyInPlay) {
    return contactNeedsScore(contact)
      ? "Someone on your team is already in play here. Ranking in the background."
      : "Someone on your team is already in play here.";
  }
  if (!contact.name.trim()) return "Name still coming, or needs a look.";
  return "Needs a look.";
}

function queueLine(item: CaptureQueueItem) {
  if (!item.contactId) return "Saved on this phone. Ranking when you’re back online.";
  if (item.photo) return "Still reading the card on this phone.";
  if (item.audio) return "Still hearing the note on this phone.";
  return "Still reading.";
}

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
  const [queued, setQueued] = useState<CaptureQueueItem[]>([]);
  const roomContacts = contacts.filter((contact) => contact.eventId === event.id);
  const roomTasks = tasks.filter((task) => task.eventId === event.id);
  const roomHighs = highHandoffs(roomContacts, roomTasks, 3);
  const highIds = new Set(roomHighs.map((row) => row.id));
  const roomGlance = roomContacts.filter((contact) => contactNeedsGlance(contact) && !highIds.has(contact.id));
  const glanceIds = new Set(roomGlance.map((contact) => contact.id));
  const roomReading = roomContacts.filter(
    (contact) => contactStillReading(contact) && !highIds.has(contact.id) && !glanceIds.has(contact.id),
  );
  const roomQueued = queued.filter((item) => {
    if (item.eventId !== event.id) return false;
    if (item.contactId && roomContacts.some((contact) => contact.id === item.contactId)) return false;
    return !item.contactId || Boolean(item.photo || item.audio);
  });
  const hasPile = roomHighs.length > 0 || roomReading.length > 0 || roomGlance.length > 0 || roomQueued.length > 0;

  useEffect(() => {
    let ignore = false;
    async function loadQueue() {
      const items = await listQueuedCaptures();
      if (!ignore) setQueued(items);
    }
    void loadQueue();
    window.addEventListener(CAPTURE_QUEUE_EVENT, loadQueue);
    return () => {
      ignore = true;
      window.removeEventListener(CAPTURE_QUEUE_EVENT, loadQueue);
    };
  }, [event.id]);

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
    <section className="space-y-6">
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

      {!hasPile ? (
        <p className="text-muted">No High matches yet from this room. People you saved still live under All people.</p>
      ) : null}

      {roomHighs.length ? (
        <div className="space-y-3">
          <h3 className="kicker">High</h3>
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

      {roomQueued.length || roomReading.length ? (
        <div className="space-y-2">
          <h3 className="kicker">Still reading</h3>
          {roomQueued.map((item) => (
            <div key={item.id} className="surface px-5 py-4">
              <p className="font-semibold">{item.fields.name || item.fields.company || "Someone you just saved"}</p>
              <p className="mt-1 text-sm text-muted">{queueLine(item)}</p>
            </div>
          ))}
          {roomReading.map((contact) => (
            <Link key={contact.id} href={`/people/${contact.id}`} className="surface block px-5 py-4 transition hover:bg-[#f7f3ea]">
              <p className="font-semibold">{contact.name}</p>
              <p className="mt-1 text-sm text-muted">Ranking in the background. Open them if you want it now.</p>
            </Link>
          ))}
        </div>
      ) : null}

      {roomGlance.length ? (
        <div className="space-y-2">
          <h3 className="kicker">Needs a glance</h3>
          {roomGlance.map((contact) => (
            <Link key={contact.id} href={`/people/${contact.id}`} className="surface block px-5 py-4 transition hover:bg-[#f7f3ea]">
              <p className="font-semibold">{contact.name || contact.company || "Unnamed contact"}</p>
              <p className="mt-1 text-sm text-muted">{glanceLine(contact)}</p>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
