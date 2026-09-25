"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Avatar, Button, PriorityBadge } from "@/components/ui";
import { postJson } from "@/lib/api";
import { getContact, getEvent, openTaskForContact, updateContact, updateTask, createTask } from "@/lib/data";
import { addDays, todayISO } from "@/lib/dates";
import type { ContactRecord, EventRecord, FollowUpDraft, TaskChannel, TaskRecord, UnderstandResult } from "@/lib/types";
import { TASK_CHANNELS } from "@/lib/types";

const channelLabel: Record<TaskChannel, string> = {
  email: "Email",
  linkedin: "LinkedIn",
  text: "Text",
  call: "Call reminder",
  intro: "Ask for introduction",
};

export default function PersonPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [contact, setContact] = useState<ContactRecord | null>(null);
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [task, setTask] = useState<TaskRecord | null>(null);
  const [channel, setChannel] = useState<TaskChannel>("email");
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    void (async () => {
      const next = await getContact(user.uid, id);
      if (!next) {
        setMissing(true);
        return;
      }
      setContact(next);
      const [nextEvent, nextTask] = await Promise.all([
        getEvent(user.uid, next.eventId),
        openTaskForContact(user.uid, next.id),
      ]);
      setEvent(nextEvent);
      setTask(nextTask);
      if (nextTask) {
        setChannel(nextTask.channel);
        setDraft(nextTask.draft);
      }
    })();
  }, [user, id]);

  async function rescore() {
    if (!user || !contact || !event) return;
    setError("");
    try {
      const result = await postJson<UnderstandResult>("/api/ai/understand", {
        event,
        contact,
        rawNote: contact.rawNote,
      });
      await updateContact(user.uid, contact.id, {
        structuredNote: result.structuredNote,
        enrichment: result.enrichment,
        relevance: result.relevance,
      });
      setContact({ ...contact, ...result });
      if (task) {
        await updateTask(user.uid, task.id, {
          channel: result.draft.channel,
          title: result.structuredNote.followUpPromise || result.draft.title,
          draft: result.draft.body,
          dueDate: result.draft.dueDate,
        });
        setTask({ ...task, channel: result.draft.channel, draft: result.draft.body, title: result.draft.title });
      } else {
        await createTask(user.uid, {
          contactId: contact.id,
          eventId: contact.eventId,
          contactName: contact.name,
          channel: result.draft.channel,
          title: result.structuredNote.followUpPromise || result.draft.title,
          draft: result.draft.body,
          dueDate: result.draft.dueDate || addDays(todayISO(), 1),
        });
      }
      setChannel(result.draft.channel);
      setDraft(result.draft.body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not score this contact.");
    }
  }

  async function writeChannel(next: TaskChannel) {
    if (!user || !contact || !event) return;
    setChannel(next);
    setCopied(false);
    const result = await postJson<FollowUpDraft>("/api/ai/draft", {
      event,
      contact,
      channel: next,
    });
    setDraft(result.body);
    if (task) {
      await updateTask(user.uid, task.id, { channel: next, draft: result.body, title: result.title });
    }
  }

  if (missing) {
    return (
      <div className="space-y-3">
        <h1 className="serif text-4xl">That person is not here.</h1>
        <p className="text-muted">They may have been deleted.</p>
        <Link href="/people" className="font-semibold text-accent">Back to people</Link>
      </div>
    );
  }
  if (!contact) return <p className="text-muted">Loading…</p>;

  const note = contact.structuredNote;
  const enrichment = contact.enrichment;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Avatar name={contact.name || "?"} />
        <div>
        <PriorityBadge level={contact.relevance?.level ?? null} />
        <h1 className="serif mt-2 text-4xl">{contact.name || "Unnamed contact"}</h1>
        <p className="text-muted">{[contact.title, contact.company].filter(Boolean).join(", ")}</p>
        {contact.relevance?.opportunityType ? <p className="mt-2">{contact.relevance.opportunityType}</p> : null}
        </div>
      </div>

      {contact.relevance ? (
        <section className="surface space-y-2 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Why</h2>
          <ul className="list-disc space-y-1 pl-5">
            {contact.relevance.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <p className="font-semibold">{contact.relevance.suggestedAction}</p>
        </section>
      ) : (
        <Button type="button" onClick={() => void rescore()}>
          Score this contact
        </Button>
      )}
      {error ? <p className="text-sm text-high">{error}</p> : null}

      {note ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Conversation</h2>
          {[
            ["Pain point", note.painPoint],
            ["Interest", note.interest],
            ["Opportunity", note.opportunity],
            ["Personal detail", note.personalDetail],
            ["Follow-up promise", note.followUpPromise],
          ]
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <p key={label}>
                <span className="text-muted">{label}. </span>
                {value}
              </p>
            ))}
        </section>
      ) : null}

      {enrichment && !enrichment.unavailable ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Public context</h2>
          <p>{enrichment.companyDescription}</p>
          <p className="text-sm text-muted">
            {[enrichment.industry, enrichment.companySize, enrichment.roleSummary].filter(Boolean).join(" · ")}
          </p>
          {enrichment.sources.map((source) => (
            <a key={source} href={source} className="block text-sm text-accent" target="_blank" rel="noreferrer">
              {source}
            </a>
          ))}
        </section>
      ) : null}

      <section className="surface space-y-3 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Follow-up</h2>
        <p className="text-sm text-muted">This draft is not sent. Copy it and send it yourself.</p>
        <div className="flex flex-wrap gap-2">
          {TASK_CHANNELS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => void writeChannel(item)}
              className={`rounded-full px-3 py-1 text-sm ${channel === item ? "bg-accent text-accent-ink" : "bg-card"}`}
            >
              {channelLabel[item]}
            </button>
          ))}
        </div>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="min-h-40 w-full rounded-2xl border border-line bg-white p-3"
        />
        <Button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(draft);
            setCopied(true);
          }}
          disabled={!draft}
        >
          {copied ? "Copied" : "Copy draft"}
        </Button>
      </section>
    </div>
  );
}
