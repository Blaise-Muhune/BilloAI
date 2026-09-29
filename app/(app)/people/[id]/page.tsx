"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { BusyBar, DetailSkeleton, OverlayStatus } from "@/components/loading";
import { PaywallNotice } from "@/components/paywall";
import { Area, Avatar, Button, Field, PageWrap, PriorityBadge } from "@/components/ui";
import { isPaywalled, postJson } from "@/lib/api";
import { createTask, deleteContact, getContact, getEvent, openTaskForContact, updateContact, updateTask } from "@/lib/data";
import { addDays, todayISO } from "@/lib/dates";
import { evidenceLine, skipFollowUp } from "@/lib/relevance";
import type { ContactFields, ContactRecord, EventRecord, FollowUpDraft, TaskChannel, TaskRecord, UnderstandResult } from "@/lib/types";
import { TASK_CHANNELS } from "@/lib/types";

const channelLabel: Record<TaskChannel, string> = {
  email: "Email",
  linkedin: "LinkedIn",
  text: "Text",
  call: "Call reminder",
  intro: "Ask for introduction",
};

function fieldsFrom(contact: ContactRecord): ContactFields {
  return {
    name: contact.name,
    company: contact.company,
    title: contact.title,
    email: contact.email,
    phone: contact.phone,
    website: contact.website,
    linkedin: contact.linkedin,
    location: contact.location,
    otherContact: contact.otherContact,
  };
}

export default function PersonPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [contact, setContact] = useState<ContactRecord | null>(null);
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [task, setTask] = useState<TaskRecord | null>(null);
  const [channel, setChannel] = useState<TaskChannel>("email");
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [missing, setMissing] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [paywalled, setPaywalled] = useState(false);
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState<ContactFields | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingPerson, setSavingPerson] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const dirtyDraft = useRef(false);
  const draftRef = useRef(draft);
  const taskRef = useRef(task);
  draftRef.current = draft;
  taskRef.current = task;

  useEffect(() => {
    if (!user || !id) return;
    void (async () => {
      const next = await getContact(user.uid, id);
      if (!next) {
        setMissing(true);
        return;
      }
      setContact(next);
      setFields(fieldsFrom(next));
      setNoteDraft(next.rawNote);
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

  async function persistDraft(nextDraft = draftRef.current, nextChannel = channel) {
    if (!user || !contact) return;
    const open = taskRef.current;
    if (open) {
      await updateTask(user.uid, open.id, { draft: nextDraft, channel: nextChannel, contactName: contact.name });
      setTask({ ...open, draft: nextDraft, channel: nextChannel, contactName: contact.name });
    } else if (nextDraft.trim()) {
      const created = await createTask(user.uid, {
        contactId: contact.id,
        eventId: contact.eventId,
        contactName: contact.name,
        channel: nextChannel,
        title: "Stay connected",
        draft: nextDraft,
        dueDate: addDays(todayISO(), 1),
      });
      setTask({
        id: created,
        ownerId: user.uid,
        contactId: contact.id,
        eventId: contact.eventId,
        contactName: contact.name,
        channel: nextChannel,
        title: "Stay connected",
        draft: nextDraft,
        dueDate: addDays(todayISO(), 1),
        status: "open",
        createdAt: new Date().toISOString(),
      });
    }
    dirtyDraft.current = false;
    setDraftSaved(true);
    window.setTimeout(() => setDraftSaved(false), 1600);
  }

  useEffect(() => {
    if (!dirtyDraft.current) return;
    const timer = window.setTimeout(() => {
      void persistDraft().catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not save that note.");
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [draft, channel]);

  async function rescore() {
    if (!user || !contact || !event) return;
    setError("");
    setPaywalled(false);
    setScoring(true);
    try {
      const result = await postJson<UnderstandResult>("/api/ai/understand", {
        event,
        contact,
        rawNote: contact.rawNote,
        allowPublicLookup: true,
      });
      await updateContact(user.uid, contact.id, {
        structuredNote: result.structuredNote,
        enrichment: result.enrichment,
        relevance: result.relevance,
      });
      setContact({ ...contact, ...result });
      if (skipFollowUp(result.relevance)) {
        if (task) {
          await updateTask(user.uid, task.id, {
            channel: result.draft.channel,
            title: result.relevance.suggestedAction,
            draft: "",
            dueDate: result.draft.dueDate,
          });
          setTask({ ...task, channel: result.draft.channel, draft: "", title: result.relevance.suggestedAction });
        }
      } else if (task) {
        await updateTask(user.uid, task.id, {
          channel: result.draft.channel,
          title: result.structuredNote.followUpPromise || result.draft.title,
          draft: result.draft.body,
          dueDate: result.draft.dueDate,
        });
        setTask({ ...task, channel: result.draft.channel, draft: result.draft.body, title: result.draft.title });
      } else if (result.draft.body.trim()) {
        const created = await createTask(user.uid, {
          contactId: contact.id,
          eventId: contact.eventId,
          contactName: contact.name,
          channel: result.draft.channel,
          title: result.structuredNote.followUpPromise || result.draft.title,
          draft: result.draft.body,
          dueDate: result.draft.dueDate || addDays(todayISO(), 1),
        });
        setTask({
          id: created,
          ownerId: user.uid,
          contactId: contact.id,
          eventId: contact.eventId,
          contactName: contact.name,
          channel: result.draft.channel,
          title: result.structuredNote.followUpPromise || result.draft.title,
          draft: result.draft.body,
          dueDate: result.draft.dueDate || addDays(todayISO(), 1),
          status: "open",
          createdAt: new Date().toISOString(),
        });
      }
      dirtyDraft.current = false;
      setChannel(result.draft.channel);
      setDraft(result.draft.body);
    } catch (err) {
      if (isPaywalled(err)) setPaywalled(true);
      else setError(err instanceof Error ? err.message : "Could not score this contact.");
    } finally {
      setScoring(false);
    }
  }

  async function writeChannel(next: TaskChannel) {
    if (!user || !contact || !event) return;
    if (dirtyDraft.current) await persistDraft();
    setChannel(next);
    setCopied(false);
    setPaywalled(false);
    setDrafting(true);
    try {
      const result = await postJson<FollowUpDraft>("/api/ai/draft", {
        event,
        contact,
        channel: next,
      });
      dirtyDraft.current = false;
      setDraft(result.body);
      if (task) {
        await updateTask(user.uid, task.id, { channel: next, draft: result.body, title: result.title });
        setTask({ ...task, channel: next, draft: result.body, title: result.title });
      }
    } catch (err) {
      if (isPaywalled(err)) setPaywalled(true);
      else setError(err instanceof Error ? err.message : "Could not write that note.");
    } finally {
      setDrafting(false);
    }
  }

  async function savePerson(form: React.FormEvent) {
    form.preventDefault();
    if (!user || !contact || !fields) return;
    if (!fields.name.trim()) {
      setError("A first name is enough if that is all you have.");
      return;
    }
    setSavingPerson(true);
    setError("");
    try {
      await updateContact(user.uid, contact.id, { ...fields, rawNote: noteDraft });
      setContact({ ...contact, ...fields, rawNote: noteDraft });
      if (task) {
        await updateTask(user.uid, task.id, { contactName: fields.name });
        setTask({ ...task, contactName: fields.name });
      }
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save those details.");
    } finally {
      setSavingPerson(false);
    }
  }

  async function removePerson() {
    if (!user || !contact) return;
    if (!window.confirm("Remove this person and their follow-up notes?")) return;
    setRemoving(true);
    setError("");
    try {
      await deleteContact(user.uid, contact.id);
      router.push("/people");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove this person.");
      setRemoving(false);
    }
  }

  if (missing) {
    return (
      <PageWrap>
        <h1 className="serif text-4xl">That person is not here.</h1>
        <p className="text-muted">They may have been deleted.</p>
        <Link href="/people" className="font-semibold text-accent">
          Back to people
        </Link>
      </PageWrap>
    );
  }
  if (!contact || !fields) return <DetailSkeleton />;

  const note = contact.structuredNote;
  const enrichment = contact.enrichment;
  const cardOnly = evidenceLine(contact.rawNote, contact.structuredNote, contact.enrichment);
  const facts = [
    ["Pain point", note?.painPoint],
    ["Interest", note?.interest],
    ["Opportunity", note?.opportunity],
    ["Personal detail", note?.personalDetail],
    ["Follow-up promise", note?.followUpPromise],
  ].filter(([, value]) => value);

  return (
    <PageWrap>
      {scoring ? <OverlayStatus label="Seeing if they fit why you went" /> : null}
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)] xl:items-start">
        <div className="space-y-6">
          <div className="surface flex items-start gap-5 p-6 lg:p-8">
            <Avatar name={contact.name || "?"} size="lg" />
            <div className="min-w-0">
              <PriorityBadge level={contact.relevance?.level ?? null} />
              <h1 className="serif mt-3 text-4xl leading-tight xl:text-5xl">{contact.name || "Unnamed contact"}</h1>
              <p className="mt-2 text-muted">{[contact.title, contact.company].filter(Boolean).join(" · ")}</p>
              {contact.relevance?.opportunityType ? <p className="mt-2 font-semibold">{contact.relevance.opportunityType}</p> : null}
              {event ? (
                <Link href={`/events/${event.id}`} className="mt-3 inline-block text-sm font-semibold text-accent">
                  {event.name}
                </Link>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                {contact.email ? (
                  <a className="text-accent" href={`mailto:${contact.email}`}>
                    {contact.email}
                  </a>
                ) : null}
                {contact.phone ? <span className="text-muted">{contact.phone}</span> : null}
                {contact.otherContact ? <span className="text-muted">{contact.otherContact}</span> : null}
                {contact.linkedin ? (
                  <a className="text-accent" href={contact.linkedin} target="_blank" rel="noreferrer">
                    LinkedIn
                  </a>
                ) : null}
                {contact.website ? (
                  <a className="text-accent" href={contact.website} target="_blank" rel="noreferrer">
                    Website
                  </a>
                ) : null}
                {contact.location ? <span className="text-muted">{contact.location}</span> : null}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  type="button"
                  tone="ghost"
                  onClick={() => {
                    setFields(fieldsFrom(contact));
                    setNoteDraft(contact.rawNote);
                    setEditing((current) => !current);
                  }}
                >
                  {editing ? "Cancel" : "Fix details"}
                </Button>
                <Button type="button" tone="ghost" busy={removing} onClick={() => void removePerson()}>
                  Remove
                </Button>
              </div>
            </div>
          </div>

          {editing ? (
            <form onSubmit={(form) => void savePerson(form)} className="surface space-y-5 p-6">
              <h2 className="kicker">Fix what the card got wrong</h2>
              <div className="form-grid">
                <Field label="Name" value={fields.name} onChange={(item) => setFields({ ...fields, name: item.target.value })} />
                <Field label="Company" value={fields.company} onChange={(item) => setFields({ ...fields, company: item.target.value })} />
                <Field label="Title" value={fields.title} onChange={(item) => setFields({ ...fields, title: item.target.value })} />
                <Field label="Email" value={fields.email} onChange={(item) => setFields({ ...fields, email: item.target.value })} />
                <Field label="Phone" value={fields.phone} onChange={(item) => setFields({ ...fields, phone: item.target.value })} />
                <Field label="WhatsApp or other" value={fields.otherContact} onChange={(item) => setFields({ ...fields, otherContact: item.target.value })} />
                <Field label="LinkedIn" value={fields.linkedin} onChange={(item) => setFields({ ...fields, linkedin: item.target.value })} />
                <Field label="Website" value={fields.website} onChange={(item) => setFields({ ...fields, website: item.target.value })} />
                <Field label="City or event location" value={fields.location} onChange={(item) => setFields({ ...fields, location: item.target.value })} className="lg:col-span-2" />
              </div>
              <Area label="Your original note" value={noteDraft} onChange={(item) => setNoteDraft(item.target.value)} />
              <Button type="submit" busy={savingPerson} className="min-w-40">
                {savingPerson ? "Saving…" : "Save details"}
              </Button>
            </form>
          ) : null}

          {paywalled ? (
            <PaywallNotice body="Scoring and drafts after your first event need Individual, or a seat paid for that event. This person stays on your account." />
          ) : null}

          {contact.relevance ? (
            <section className="surface space-y-3 p-6">
              <h2 className="kicker">{contact.relevance.level === "unknown" ? "Not enough to score" : "Why they matter"}</h2>
              {cardOnly ? <p className="rounded-2xl bg-[#f7f3ea] px-4 py-3 text-sm">{cardOnly}</p> : null}
              <ul className="list-disc space-y-1 pl-5">
                {contact.relevance.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              <p className="font-semibold">{contact.relevance.suggestedAction}</p>
              <button type="button" className="text-sm font-semibold text-accent" onClick={() => void rescore()}>
                Score again
              </button>
            </section>
          ) : (
            <Button type="button" busy={scoring} onClick={() => void rescore()}>
              {scoring ? "Seeing if they fit" : "See if they fit"}
            </Button>
          )}
          {error ? <p className="text-sm text-high">{error}</p> : null}

          {contact.rawNote && !editing ? (
            <section className="surface space-y-2 p-6">
              <h2 className="kicker">Your note</h2>
              <p className="whitespace-pre-wrap">{contact.rawNote}</p>
            </section>
          ) : null}

          {facts.length ? (
            <section className="surface overflow-hidden">
              <h2 className="kicker px-6 pt-5">Conversation</h2>
              <dl className="mt-2 divide-y divide-line">
                {facts.map(([label, value]) => (
                  <div key={label} className="grid gap-1 px-6 py-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
                    <dt className="text-sm text-muted">{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {enrichment && !enrichment.unavailable ? (
            <section className="surface space-y-3 p-6">
              <h2 className="kicker">Who they are, in public</h2>
              {enrichment.roleSummary ? <p className="font-semibold">{enrichment.roleSummary}</p> : null}
              <p>{enrichment.companyDescription}</p>
              <p className="text-sm text-muted">{[enrichment.industry, enrichment.companySize].filter(Boolean).join(" · ")}</p>
              {[
                ["They sell", enrichment.products],
                ["They care about", enrichment.priorities],
                ["Public interests", enrichment.interests],
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <p key={label}>
                    <span className="text-muted">{label}. </span>
                    {value}
                  </p>
                ))}
              {enrichment.news.map((item) => (
                <a key={item.url} href={item.url} className="block text-sm text-accent" target="_blank" rel="noreferrer">
                  {item.title}
                </a>
              ))}
              {enrichment.sources.map((source) => (
                <a key={source} href={source} className="block truncate text-sm text-accent" target="_blank" rel="noreferrer">
                  {source}
                </a>
              ))}
            </section>
          ) : enrichment?.unavailable ? (
            <p className="text-sm text-muted">No public professional page turned up for these details. The score used the card and your note only.</p>
          ) : null}
        </div>

        <section className="surface space-y-4 p-6 lg:sticky lg:top-8">
          <h2 className="kicker">Stay connected</h2>
          <p className="text-sm text-muted">
            {skipFollowUp(contact.relevance)
              ? "No follow-up is suggested from what we have. You can still write one if you want. Nothing goes out on its own."
              : "A note you can send to keep the conversation going. Nothing goes out on its own. Edits save here."}
          </p>
          <div className="flex flex-wrap gap-2">
            {TASK_CHANNELS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => void writeChannel(item)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${channel === item ? "bg-accent text-accent-ink" : "bg-[#f7f3ea] text-muted"}`}
                disabled={drafting}
              >
                {channelLabel[item]}
              </button>
            ))}
          </div>
          <textarea
            value={draft}
            onChange={(item) => {
              dirtyDraft.current = true;
              setDraftSaved(false);
              setDraft(item.target.value);
            }}
            onBlur={() => {
              if (dirtyDraft.current) void persistDraft();
            }}
            className="field-control min-h-52"
            aria-busy={drafting}
          />
          {drafting ? (
            <p className="flex items-center gap-3 text-sm text-muted">
              <BusyBar className="w-24" />
              Writing this note
            </p>
          ) : draftSaved ? (
            <p className="text-sm text-accent">Saved on this account</p>
          ) : null}
          <Button
            type="button"
            className="w-full"
            onClick={async () => {
              if (dirtyDraft.current) await persistDraft();
              await navigator.clipboard.writeText(draft);
              setCopied(true);
            }}
            disabled={!draft}
          >
            {copied ? "Copied" : "Copy the note"}
          </Button>
        </section>
      </div>
    </PageWrap>
  );
}
