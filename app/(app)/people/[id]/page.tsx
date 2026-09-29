"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { BusyBar, DetailSkeleton, OverlayStatus } from "@/components/loading";
import { HuntWhy, type HuntSummary } from "@/components/hunt-why";
import { PaywallNotice } from "@/components/paywall";
import { Area, Avatar, Button, ErrorNote, Field, Fold, InPlayBadge, PageWrap, PriorityBadge } from "@/components/ui";
import { ApiError, getJson, isPaywalled, postJson } from "@/lib/api";
import { createTask, deleteContact, getContact, getEvent, openTaskForContact, updateContact, updateTask } from "@/lib/data";
import { addDays, todayISO } from "@/lib/dates";
import { CHANNEL_LABELS, recommendedLabel, showRecommendedAction } from "@/lib/channels";
import { userMessage } from "@/lib/errors";
import { evidenceLine, skipFollowUp } from "@/lib/relevance";
import type { ContactFields, ContactRecord, EventRecord, FollowUpDraft, TaskChannel, TaskRecord, UnderstandResult } from "@/lib/types";
import { TASK_CHANNELS } from "@/lib/types";

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
  const [markingSent, setMarkingSent] = useState(false);
  const [paywallEvent, setPaywallEvent] = useState("");
  const [paywallReason, setPaywallReason] = useState("");
  const [hunt, setHunt] = useState<HuntSummary | null>(null);
  const [allowPublicLookup, setAllowPublicLookup] = useState(true);
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
      void getJson<{ team: HuntSummary | null }>("/api/team")
        .then((payload) => {
          if (payload.team?.icp || payload.team?.targetCompanies?.length || payload.team?.targetRoles) {
            setHunt({
              icp: payload.team.icp,
              targetCompanies: payload.team.targetCompanies ?? [],
              targetRoles: payload.team.targetRoles ?? "",
            });
          }
        })
        .catch(() => undefined);
    })();
  }, [user, id]);

  async function persistDraft(nextDraft = draftRef.current, nextChannel = channel) {
    if (!user || !contact) return;
    const open = taskRef.current;
    if (open) {
      const next = { ...open, draft: nextDraft, channel: nextChannel, contactName: contact.name };
      await updateTask(user.uid, open.id, { draft: nextDraft, channel: nextChannel, contactName: contact.name });
      taskRef.current = next;
      setTask(next);
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
      const next = {
        id: created,
        ownerId: user.uid,
        contactId: contact.id,
        eventId: contact.eventId,
        contactName: contact.name,
        channel: nextChannel,
        title: "Stay connected",
        draft: nextDraft,
        dueDate: addDays(todayISO(), 1),
        status: "open" as const,
        createdAt: new Date().toISOString(),
      };
      taskRef.current = next;
      setTask(next);
    }
    dirtyDraft.current = false;
    setDraftSaved(true);
    window.setTimeout(() => setDraftSaved(false), 1600);
  }

  useEffect(() => {
    if (!dirtyDraft.current) return;
    const timer = window.setTimeout(() => {
      void persistDraft().catch((err: unknown) => {
        setError(userMessage(err, "Could not save that note."));
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [draft, channel]);

  async function rescore() {
    if (!user || !contact || !event) return;
    setError("");
    setPaywalled(false);
    setPaywallEvent("");
    setPaywallReason("");
    setScoring(true);
    try {
      const result = await postJson<UnderstandResult>("/api/ai/understand", {
        event,
        contact: fieldsFrom(contact),
        rawNote: contact.rawNote,
        allowPublicLookup,
      });
      await updateContact(user.uid, contact.id, {
        structuredNote: result.structuredNote,
        enrichment: result.enrichment,
        relevance: result.relevance,
        alreadyInPlay: result.alreadyInPlay,
      });
      setContact({ ...contact, ...result, alreadyInPlay: result.alreadyInPlay });
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
      if (isPaywalled(err)) {
        setPaywalled(true);
        if (err instanceof ApiError) {
          setPaywallEvent(err.eventName ?? "");
          setPaywallReason(err.reason ?? "");
        }
      } else setError(userMessage(err, "Could not score this contact."));
    } finally {
      setScoring(false);
    }
  }

  async function markSent() {
    if (!user || !contact) return;
    setMarkingSent(true);
    setError("");
    try {
      if (dirtyDraft.current) await persistDraft();
      let open = taskRef.current;
      if (!open && draftRef.current.trim()) {
        await persistDraft();
        open = taskRef.current;
      }
      if (!open) return;
      await updateTask(user.uid, open.id, { status: "done" });
      const next = { ...open, status: "done" as const };
      taskRef.current = next;
      setTask(next);
    } catch (err) {
      setError(userMessage(err, "Could not mark that sent."));
    } finally {
      setMarkingSent(false);
    }
  }

  async function reopenSent() {
    if (!user || !task) return;
    await updateTask(user.uid, task.id, { status: "open" });
    const next = { ...task, status: "open" as const };
    taskRef.current = next;
    setTask(next);
  }

  async function writeChannel(next: TaskChannel) {
    if (!user || !contact || !event) return;
    if (dirtyDraft.current) await persistDraft();
    setChannel(next);
    setCopied(false);
    setPaywalled(false);
    setPaywallEvent("");
    setPaywallReason("");
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
      if (isPaywalled(err)) {
        setPaywalled(true);
        if (err instanceof ApiError) {
          setPaywallEvent(err.eventName ?? "");
          setPaywallReason(err.reason ?? "");
        }
      } else setError(userMessage(err, "Could not write that note."));
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
      setError(userMessage(err, "Could not save those details."));
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
      setError(userMessage(err, "Could not remove this person."));
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
  const recommended = showRecommendedAction(contact.relevance, task?.channel);
  const nextStep = recommendedLabel(contact.relevance, task?.channel);
  const facts = [
    ["Pain point", note?.painPoint],
    ["Interest", note?.interest],
    ["Opportunity", note?.opportunity],
    ["Personal detail", note?.personalDetail],
    ["Follow-up promise", note?.followUpPromise],
  ].filter(([, value]) => value);
  const skipped = skipFollowUp(contact.relevance);
  const topReasons = contact.relevance?.reasons.slice(0, 2) ?? [];
  const otherChannels = TASK_CHANNELS.filter((item) => item !== recommended);

  const draftBox = (
    <>
      <div className="flex flex-wrap gap-2">
        {TASK_CHANNELS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => void writeChannel(item)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${channel === item ? "bg-accent text-accent-ink" : "bg-[#f7f3ea] text-muted"}`}
            disabled={drafting}
          >
            {recommended === item ? `Recommended · ${CHANNEL_LABELS[item]}` : CHANNEL_LABELS[item]}
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
        className="field-control min-h-40"
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
      <div className="grid gap-2 sm:grid-cols-2">
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
        {task?.status === "done" ? (
          <Button type="button" tone="ghost" className="w-full" onClick={() => void reopenSent()}>
            Sent. Still need to send?
          </Button>
        ) : (
          <Button
            type="button"
            tone="ghost"
            className="w-full"
            busy={markingSent}
            disabled={!task && !draft.trim()}
            onClick={() => void markSent()}
          >
            {markingSent ? "Saving…" : "I sent it"}
          </Button>
        )}
      </div>
    </>
  );

  return (
    <PageWrap>
      {scoring ? <OverlayStatus label="Seeing if they fit why you went" /> : null}
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,26rem)] xl:items-start">
        <div className="min-w-0 space-y-4">
          <div className="surface flex min-w-0 items-start gap-4 overflow-hidden p-5 lg:p-6">
            <Avatar name={contact.name || "?"} size="lg" />
            <div className="min-w-0">
              <PriorityBadge level={contact.relevance?.level ?? null} size="md" explain />
              <h1 className="serif mt-3 text-3xl leading-tight">{contact.name || "Unnamed contact"}</h1>
              <p className="mt-1 text-muted">{[contact.title, contact.company].filter(Boolean).join(" · ")}</p>
              {contact.relevance?.opportunityType && contact.relevance.level !== "unknown" ? (
                <p className="mt-2 font-semibold">{contact.relevance.opportunityType}</p>
              ) : null}
              {nextStep ? <p className="mt-1 text-sm font-semibold text-accent">Next: {nextStep}</p> : null}
              <div className="mt-3">
                <InPlayBadge show={contact.alreadyInPlay} />
              </div>
              {event ? (
                <Link href={`/events/${event.id}`} className="mt-2 inline-block text-sm font-semibold text-accent">
                  {event.name}
                </Link>
              ) : null}
            </div>
          </div>

          {paywalled ? (
            <PaywallNotice
              eventName={paywallEvent}
              reason={paywallReason}
              body="Scoring and drafts after your first event need Individual, a Team seat, or a seat paid for that event. This person stays on your account."
            />
          ) : null}

          {contact.relevance ? (
            <section className="surface space-y-3 p-5">
              <h2 className="kicker">{contact.relevance.level === "unknown" ? "Why this is not a score" : "Why this matters"}</h2>
              {cardOnly ? <p className="rounded-2xl bg-[#fff8e8] px-4 py-3 text-sm">{cardOnly}</p> : null}
              <HuntWhy eventGoal={event?.goalDetail} hunt={hunt} />
              <ul className="list-disc space-y-1 pl-5">
                {topReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              <p className="font-semibold">{contact.relevance.suggestedAction}</p>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={allowPublicLookup}
                  onChange={(event) => setAllowPublicLookup(event.target.checked)}
                />
                Look them up on the public web when scoring.
              </label>
              <button type="button" className="text-sm font-semibold text-accent" onClick={() => void rescore()}>
                Score again
              </button>
            </section>
          ) : (
            <div className="space-y-3">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={allowPublicLookup}
                  onChange={(event) => setAllowPublicLookup(event.target.checked)}
                />
                Look them up on the public web when scoring.
              </label>
              <Button type="button" busy={scoring} onClick={() => void rescore()}>
                {scoring ? "Seeing if they fit" : "See if they fit"}
              </Button>
            </div>
          )}
          {error ? <ErrorNote>{error}</ErrorNote> : null}

          {editing ? (
            <form onSubmit={(form) => void savePerson(form)} className="surface space-y-5 p-5">
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

          <Fold title="Contact details">
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
              {contact.email ? (
                <a className="text-accent" href={`mailto:${contact.email}`}>
                  {contact.email}
                </a>
              ) : null}
              {contact.phone ? <span>{contact.phone}</span> : null}
              {contact.otherContact ? <span>{contact.otherContact}</span> : null}
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
              {!contact.email && !contact.phone && !contact.otherContact && !contact.linkedin && !contact.website && !contact.location ? (
                <p className="text-muted">No email, phone, or link saved.</p>
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
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
          </Fold>

          {contact.rawNote && !editing ? (
            <Fold title="Your note">
              <p className="whitespace-pre-wrap">{contact.rawNote}</p>
            </Fold>
          ) : null}

          {facts.length ? (
            <Fold title="Conversation">
              <dl className="divide-y divide-line">
                {facts.map(([label, value]) => (
                  <div key={label} className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[10rem_minmax(0,1fr)]">
                    <dt className="text-sm text-muted">{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </Fold>
          ) : null}

          {contact.relevance && contact.relevance.reasons.length > 2 ? (
            <Fold title="All reasons">
              <ul className="list-disc space-y-1 pl-5">
                {contact.relevance.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </Fold>
          ) : null}

          {enrichment && !enrichment.unavailable ? (
            <Fold title="Who they are, in public">
              <div className="space-y-3">
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
                  <a key={item.url} href={item.url} className="break-long block text-sm text-accent" target="_blank" rel="noreferrer">
                    {item.title}
                  </a>
                ))}
                {enrichment.sources.map((source) => (
                  <a key={source} href={source} className="break-long block min-w-0 text-sm text-accent" target="_blank" rel="noreferrer">
                    {source}
                  </a>
                ))}
              </div>
            </Fold>
          ) : enrichment?.unavailable ? (
            <Fold title="Public lookup">
              <p className="text-sm text-muted">No public professional page turned up. The score used the card and your note only.</p>
            </Fold>
          ) : null}
        </div>

        <section className="surface min-w-0 space-y-4 overflow-hidden p-5 lg:sticky lg:top-8">
          <h2 className="kicker">Stay connected</h2>
          {skipped ? (
            <Fold title="No follow-up suggested — write one anyway" flush>
              <p className="mb-4 text-sm text-muted">Nothing goes out on its own.</p>
              <div className="space-y-4">{draftBox}</div>
            </Fold>
          ) : (
            <>
              <p className="text-sm text-muted">
                {nextStep ? `Recommended: ${nextStep}. You can pick another.` : "A note you can send."} Nothing goes out on its own.
              </p>
              {recommended && otherChannels.length ? (
                <>
                  <button
                    type="button"
                    onClick={() => void writeChannel(recommended)}
                    disabled={drafting}
                    className="rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink"
                  >
                    {CHANNEL_LABELS[recommended]}
                  </button>
                  <Fold title="Other ways to send" flush>
                    <div className="flex flex-wrap gap-2">
                      {otherChannels.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => void writeChannel(item)}
                          className={`rounded-full px-3 py-1.5 text-sm font-semibold ${channel === item ? "bg-accent text-accent-ink" : "bg-[#f7f3ea] text-muted"}`}
                          disabled={drafting}
                        >
                          {CHANNEL_LABELS[item]}
                        </button>
                      ))}
                    </div>
                  </Fold>
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
                    className="field-control min-h-40"
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
                  <div className="grid gap-2 sm:grid-cols-2">
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
                    {task?.status === "done" ? (
                      <Button type="button" tone="ghost" className="w-full" onClick={() => void reopenSent()}>
                        Sent. Still need to send?
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        tone="ghost"
                        className="w-full"
                        busy={markingSent}
                        disabled={!task && !draft.trim()}
                        onClick={() => void markSent()}
                      >
                        {markingSent ? "Saving…" : "I sent it"}
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-4">{draftBox}</div>
              )}
            </>
          )}
        </section>
      </div>
    </PageWrap>
  );
}
