"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { BusyBar, CaptureBodySkeleton, OverlayStatus, ScreenStatus } from "@/components/loading";
import { HuntWhy, type HuntSummary } from "@/components/hunt-why";
import { PaywallNotice } from "@/components/paywall";
import { IconMic } from "@/components/icons";
import { Area, Button, ErrorNote, Field, PageHeader, PageWrap, SelectField } from "@/components/ui";
import { ApiError, getJson, isPaywalled, postForm, postJson } from "@/lib/api";
import { userMessage } from "@/lib/errors";
import { addDays, todayISO } from "@/lib/dates";
import { createContact, createEvent, createTask, getEvent, getPublicProfile, listEvents, updateEvent } from "@/lib/data";
import { asHref, looksLikeLink } from "@/lib/links";
import { skipFollowUp } from "@/lib/relevance";
import { compressImage } from "@/lib/images";
import { GOAL_LABELS, NETWORKING_GOALS, type ContactFields, type ContactSource, type EventRecord, type NetworkingGoal, type UnderstandResult } from "@/lib/types";

const tags = [
  "Potential customer",
  "Investor",
  "Partner",
  "Supplier",
  "Pain point",
  "Asked me to send something",
];

const emptyFields: ContactFields = {
  name: "",
  company: "",
  title: "",
  email: "",
  phone: "",
  website: "",
  linkedin: "",
  location: "",
  otherContact: "",
};

type Queued = { fields: ContactFields; preview: string };

function mergeFields(base: ContactFields, extra: ContactFields): ContactFields {
  return {
    name: base.name || extra.name,
    company: base.company || extra.company,
    title: base.title || extra.title,
    email: base.email || extra.email,
    phone: base.phone || extra.phone,
    website: base.website || extra.website,
    linkedin: base.linkedin || extra.linkedin,
    location: base.location || extra.location,
    otherContact: base.otherContact || extra.otherContact,
  };
}

export function CaptureWizard() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const preset = params.get("event") ?? "";
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [eventId, setEventId] = useState(preset);
  const [source, setSource] = useState<ContactSource>("card");
  const [step, setStep] = useState<"event" | "goal" | "method" | "confirm" | "working">(preset ? "method" : "event");
  const [fields, setFields] = useState<ContactFields>(emptyFields);
  const [preview, setPreview] = useState("");
  const [note, setNote] = useState("");
  const [chosenTags, setChosenTags] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);
  const [allowPublicLookup, setAllowPublicLookup] = useState(true);
  const [link, setLink] = useState("");
  const [reading, setReading] = useState("");
  const [queue, setQueue] = useState<Queued[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [eventName, setEventName] = useState("");
  const [goal, setGoal] = useState<NetworkingGoal>("customers");
  const [goalDetail, setGoalDetail] = useState("");
  const [savingEvent, setSavingEvent] = useState(false);
  const [eventsReady, setEventsReady] = useState(false);
  const [hearing, setHearing] = useState(false);
  const [paywalled, setPaywalled] = useState(false);
  const [paywallEvent, setPaywallEvent] = useState("");
  const [paywallReason, setPaywallReason] = useState("");
  const [inPlay, setInPlay] = useState(false);
  const [hunt, setHunt] = useState<HuntSummary | null>(null);
  const [night, setNight] = useState(false);
  const [moreDetails, setMoreDetails] = useState(false);
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    if (!user) return;
    void listEvents(user.uid)
      .then((next) => {
        setEvents(next);
        const chosen = preset ? next.find((item) => item.id === preset) : next.length === 1 ? next[0] : null;
        if (chosen) {
          setEventId(chosen.id);
          setStep(chosen.goalDetail.trim() ? "method" : "goal");
        } else if (preset) {
          setEventId("");
          setStep("event");
        }
      })
      .catch((err: unknown) => setError(userMessage(err, "Could not load events.")))
      .finally(() => setEventsReady(true));
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
    setNight(window.localStorage.getItem("billo-night-capture") === "1");
  }, [user, preset]);

  useEffect(() => {
    return () => {
      void scannerRef.current?.stop().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    const company = fields.company.trim();
    if (!user || step !== "confirm" || company.length < 2) {
      setInPlay(false);
      return;
    }
    let cancel = false;
    const timer = window.setTimeout(() => {
      void getJson<{ inPlay: boolean }>(`/api/team/in-play?company=${encodeURIComponent(company)}`)
        .then((result) => {
          if (!cancel) setInPlay(result.inPlay);
        })
        .catch(() => {
          if (!cancel) setInPlay(false);
        });
    }, 320);
    return () => {
      cancel = true;
      window.clearTimeout(timer);
    };
  }, [fields.company, step, user]);

  function setField<K extends keyof ContactFields>(key: K, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  function toggleNight() {
    setNight((current) => {
      const next = !current;
      window.localStorage.setItem("billo-night-capture", next ? "1" : "0");
      return next;
    });
  }

  function notePaywall(err: unknown) {
    if (!isPaywalled(err)) return false;
    setPaywalled(true);
    if (err instanceof ApiError) {
      setPaywallEvent(err.eventName ?? "");
      setPaywallReason(err.reason ?? "");
    }
    return true;
  }

  const chosenEvent = events.find((item) => item.id === eventId);
  const seatedNight = Boolean(chosenEvent?.organizedEventId);

  function beginPerson(person: Queued) {
    setFields(person.fields);
    setPreview(person.preview);
    setNote("");
    setChosenTags([]);
    setAllowPublicLookup(true);
    setStep("confirm");
  }

  async function onImage(files: File[], mergeIntoCurrent = false) {
    if (!user) return;
    const chosen = files.slice(0, 12);
    if (!chosen.length) return;
    setError("");
    setSource("photo");
    const people: Queued[] = mergeIntoCurrent ? [] : [];
    let failed = 0;
    let lastError = "";
    let blocked = false;
    try {
      for (let index = 0; index < chosen.length; index += 1) {
        setReading(mergeIntoCurrent ? "Reading the other side…" : `Reading ${index + 1} of ${chosen.length}`);
        try {
          const image = await compressImage(chosen[index]);
          const extracted = await postJson<{ fields: ContactFields }>("/api/ai/extract-card", { image, eventId });
          const next = { fields: { ...emptyFields, ...extracted.fields }, preview: image };
          if (mergeIntoCurrent) {
            const merged = mergeFields(fields, next.fields);
            setFields(merged);
            setPreview(image);
            setQueue((current) => current.map((item, itemIndex) => (itemIndex === queueIndex ? { fields: merged, preview: image } : item)));
          } else {
            people.push(next);
          }
        } catch (err) {
          if (notePaywall(err)) {
            blocked = true;
            break;
          }
          failed += 1;
          lastError = userMessage(err, "Could not read that photo.");
        }
      }
      if (mergeIntoCurrent) {
        if (failed && lastError) setError(lastError);
        return;
      }
      if (blocked) return;
      if (!people.length) {
        setError(lastError || "Could not read those photos.");
        return;
      }
      if (failed) setError(`${failed} photo${failed === 1 ? "" : "s"} could not be read. Confirm the ones that worked.`);
      setQueue(people);
      setQueueIndex(0);
      beginPerson(people[0]!);
    } finally {
      setReading("");
    }
  }

  async function startScanner() {
    setError("");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 8, qrbox: 220 },
        (text) => {
          const kind = text.startsWith("billoai:") ? "billo_qr" : "linkedin_qr";
          setSource(kind);
          void scanner.stop().then(() => handleQr(kind, text));
        },
        () => undefined,
      );
    } catch (err) {
      setError(userMessage(err, "Camera access is required to scan a QR code."));
    }
  }

  function openConfirm(next: ContactFields) {
    setFields(next);
    setPreview("");
    setNote("");
    setChosenTags([]);
    setAllowPublicLookup(true);
    setQueue([]);
    setQueueIndex(0);
    setStep("confirm");
  }

  function startManual(seed: ContactFields = emptyFields) {
    setSource("manual");
    openConfirm(seed);
  }

  async function lookupPage(href: string, kind: ContactSource) {
    const linkedin = href.toLowerCase().includes("linkedin.com");
    setSource(kind);
    setReading("Looking up that page…");
    setError("");
    try {
      const result = await postJson<{ fields: ContactFields }>("/api/ai/lookup-link", { input: href, eventId });
      openConfirm({
        ...emptyFields,
        ...result.fields,
        linkedin: result.fields.linkedin || (linkedin ? href : ""),
        website: result.fields.website || (linkedin ? result.fields.website : href),
      });
    } catch (err) {
      if (!notePaywall(err)) setError(userMessage(err, "Could not read that page. Add what you have."));
      openConfirm({
        ...emptyFields,
        linkedin: linkedin ? href : "",
        website: linkedin ? "" : href,
      });
    } finally {
      setReading("");
    }
  }

  async function continueTyped() {
    const value = link.trim();
    if (!value) {
      startManual();
      return;
    }
    if (value.startsWith("billoai:")) {
      setSource("billo_qr");
      await handleQr("billo_qr", value);
      return;
    }
    if (!looksLikeLink(value)) {
      startManual({ ...emptyFields, name: value });
      return;
    }
    await lookupPage(asHref(value), value.toLowerCase().includes("linkedin.com") ? "linkedin_qr" : "manual");
  }

  async function handleQr(kind: "linkedin_qr" | "billo_qr", text: string) {
    if (kind === "linkedin_qr") {
      if (!text.includes("linkedin.com")) {
        setError("That QR is not a LinkedIn profile.");
        return;
      }
      await lookupPage(text, "linkedin_qr");
      return;
    }
    const uid = text.startsWith("billoai:") ? text.slice("billoai:".length) : "";
    if (!uid) {
      setError("That QR is not a BilloAI card.");
      return;
    }
    setReading("Opening that card…");
    try {
      const profile = await getPublicProfile(uid);
      if (!profile) {
        setError("No BilloAI card was found for that code.");
        return;
      }
      openConfirm({
        ...emptyFields,
        name: profile.name,
        company: profile.company,
        title: profile.title,
        email: profile.email,
        linkedin: profile.linkedin,
        website: profile.website,
      });
    } finally {
      setReading("");
    }
  }

  async function toggleRecording() {
    if (recording && recorderRef.current) {
      recorderRef.current.stop();
      setRecording(false);
      return;
    }
    setError("");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Allow the microphone, then tap Speak the note.");
      return;
    }
    const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
    const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      if (!chunks.length) {
        setError("Nothing was recorded. Hold Speak for a second, then stop.");
        return;
      }
      const type = recorder.mimeType || "audio/webm";
      const body = new FormData();
      body.append("audio", new Blob(chunks, { type }), type.includes("mp4") ? "note.m4a" : "note.webm");
      if (eventId) body.append("eventId", eventId);
      setHearing(true);
      try {
        const result = await postForm<{ text: string }>("/api/ai/transcribe", body);
        setNote((current) => [current, result.text].filter(Boolean).join(" "));
      } catch (err) {
        if (!notePaywall(err)) setError(userMessage(err, "Could not transcribe that note."));
      } finally {
        setHearing(false);
      }
    };
    recorderRef.current = recorder;
    recorder.start();
    setRecording(true);
  }

  async function makeEvent(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    if (!eventName.trim() || !goalDetail.trim()) {
      setError("Add the event name and what you were there for.");
      return;
    }
    setSavingEvent(true);
    setError("");
    try {
      const id = await createEvent(user.uid, {
        name: eventName,
        type: "Event",
        location: "Added after the event",
        date: todayISO(),
        goal,
        goalDetail,
        targetPeople: "",
        targetCompaniesOrRoles: "",
      });
      const next = await listEvents(user.uid);
      setEvents(next);
      setEventId(id);
      setStep("method");
    } catch (err) {
      setError(userMessage(err, "Could not create the event."));
    } finally {
      setSavingEvent(false);
    }
  }

  async function saveGoal(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !eventId) return;
    if (!goalDetail.trim()) {
      setError("Say why you were there. That is how we know who is worth staying connected to.");
      return;
    }
    setSavingEvent(true);
    setError("");
    try {
      await updateEvent(user.uid, eventId, { goal, goalDetail });
      setEvents((current) =>
        current.map((item) => (item.id === eventId ? { ...item, goal, goalDetail } : item)),
      );
      setStep("method");
    } catch (err) {
      setError(userMessage(err, "Could not save why you went."));
    } finally {
      setSavingEvent(false);
    }
  }

  async function finish() {
    if (!user || !eventId) return;
    if (!(chosenEvent?.goalDetail ?? goalDetail).trim()) {
      setError("One line on why you went, then capture.");
      setStep("goal");
      return;
    }
    if (!fields.name.trim() && !fields.company.trim() && !fields.linkedin.trim() && !fields.website.trim()) {
      setError("Add a first name, a company, or a link. Whatever you collected is enough.");
      return;
    }
    setStep("working");
    setError("");
    const rawNote = [note, ...chosenTags].filter(Boolean).join("\n");
    const event = events.find((item) => item.id === eventId) ?? (await getEvent(user.uid, eventId));
    let understood: UnderstandResult | null = null;
    let blocked = paywalled;
    if (event) {
      try {
        understood = await postJson<UnderstandResult>("/api/ai/understand", {
          event,
          contact: fields,
          rawNote,
          allowPublicLookup,
        });
      } catch (err) {
        if (notePaywall(err)) {
          blocked = true;
        } else {
          setError(userMessage(err, "Scoring is unavailable. The contact was still saved."));
        }
      }
    }
    let alreadyInPlay = Boolean(understood?.alreadyInPlay);
    if (!alreadyInPlay && fields.company.trim()) {
      try {
        const flag = await getJson<{ inPlay: boolean }>(`/api/team/in-play?company=${encodeURIComponent(fields.company)}`);
        alreadyInPlay = flag.inPlay;
      } catch {
        alreadyInPlay = false;
      }
    }
    const contactId = await createContact(user.uid, {
      ...fields,
      eventId,
      source,
      imagePath: "",
      rawNote,
      structuredNote: understood?.structuredNote ?? null,
      enrichment: understood?.enrichment ?? null,
      relevance: understood?.relevance ?? null,
      alreadyInPlay,
    });
    if (understood && !skipFollowUp(understood.relevance) && understood.draft.body.trim()) {
      const promise = understood.structuredNote.followUpPromise;
      await createTask(user.uid, {
        contactId,
        eventId,
        contactName: fields.name || "Contact",
        channel: understood.draft.channel,
        title: promise || understood.draft.title || understood.relevance.suggestedAction,
        draft: understood.draft.body,
        dueDate: understood.draft.dueDate || (understood.relevance.level === "high" ? todayISO() : addDays(todayISO(), 7)),
      });
    }
    const nextIndex = queueIndex + 1;
    if (blocked) {
      setStep("confirm");
      setError("We saved them. Matching needs a plan after your first event.");
      return;
    }
    if (nextIndex < queue.length) {
      setQueueIndex(nextIndex);
      beginPerson(queue[nextIndex]!);
      return;
    }
    router.push(queue.length > 1 ? "/people" : `/people/${contactId}`);
  }

  return (
    <PageWrap className={night ? "night-capture" : ""}>
      {reading ? <OverlayStatus label={reading} /> : null}
      {hearing ? <OverlayStatus label="Hearing that note" /> : null}
      {step !== "confirm" ? (
        <PageHeader
          kicker="Add someone"
          title={step === "working" ? "Seeing if this connection is a fit" : night ? "Capture and a note" : "Add someone you met"}
          body={
            step === "working"
              ? "Using the conversation, public context, and why you went."
              : night
                ? "Photo or a name, then what you talked about. Scoring still uses why you went."
                : "We’ll match them to why you went, so you know if this connection is worth keeping."
          }
          action={
            <button type="button" onClick={toggleNight} className="text-sm font-semibold text-accent">
              {night ? "Leave night capture" : "Night — just capture and a note"}
            </button>
          }
        />
      ) : null}
      {error ? <ErrorNote>{error}</ErrorNote> : null}
      {paywalled ? (
        <PaywallNotice
          eventName={paywallEvent}
          reason={paywallReason}
          body="Card reading, scoring, and drafts after your first event need Individual, a Team seat, or a seat paid for that event. Anyone you already saved stays on your account."
        />
      ) : null}

      {!eventsReady ? <CaptureBodySkeleton /> : null}

      {eventsReady && step === "event" ? (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
          <div className="space-y-3">
            <p className="text-muted">If the event already happened, name it now and say why you went. That’s how we know if this person is worth staying connected to.</p>
            {events.length ? (
              <div className="surface list-stack">
                {events.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => {
                      setEventId(event.id);
                      setStep(event.goalDetail.trim() ? "method" : "goal");
                    }}
                    className="block w-full px-5 py-4 text-left hover:bg-[#f7f3ea]"
                  >
                    <span className="block font-semibold">{event.name}</span>
                    <span className="mt-1 block text-sm text-muted">
                      {event.goalDetail.trim() ? GOAL_LABELS[event.goal] : "Set why you went"}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">No events yet. Add one on the right.</p>
            )}
          </div>
          <form onSubmit={(event) => void makeEvent(event)} className="surface space-y-4 p-6 lg:p-8">
            <h2 className="serif text-2xl">New event</h2>
            <Field label="Event name" value={eventName} onChange={(event) => setEventName(event.target.value)} placeholder="Chamber mixer last week" />
            <SelectField label="Why were you there?" value={goal} onChange={(event) => setGoal(event.target.value as NetworkingGoal)}>
              {NETWORKING_GOALS.map((item) => (
                <option key={item} value={item}>
                  {GOAL_LABELS[item]}
                </option>
              ))}
            </SelectField>
            <Field label="In your own words" value={goalDetail} onChange={(event) => setGoalDetail(event.target.value)} placeholder="Find operators who need automation" />
            <Button type="submit" busy={savingEvent} className="w-full">
              {savingEvent ? "Saving…" : "Use this event"}
            </Button>
          </form>
        </div>
      ) : null}

      {eventsReady && step === "goal" ? (
        <form onSubmit={(event) => void saveGoal(event)} className="surface mx-auto max-w-xl space-y-5 p-6 lg:p-8">
          <h2 className="serif text-3xl">{seatedNight ? "One line before you capture on this seat" : "Why are you at this event?"}</h2>
          <p className="text-muted">
            {seatedNight
              ? "The company or host does not set this. Matching stays on your account. You need your own goal before the first save."
              : "The company or host does not set this. Matching who you meet to why you went stays on your account."}
          </p>
          <SelectField label="Goal" value={goal} onChange={(event) => setGoal(event.target.value as NetworkingGoal)}>
            {NETWORKING_GOALS.map((item) => (
              <option key={item} value={item}>
                {GOAL_LABELS[item]}
              </option>
            ))}
          </SelectField>
          <Field
            label="In your own words"
            value={goalDetail}
            onChange={(event) => setGoalDetail(event.target.value)}
            placeholder="Find operators who need automation"
          />
          <Button type="submit" busy={savingEvent} className="min-w-40">
            {savingEvent ? "Saving…" : "Use this goal"}
          </Button>
        </form>
      ) : null}

      {eventsReady && step === "method" ? (
        <>
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="surface space-y-4 p-6 lg:p-8">
            <h2 className="serif text-3xl">Save a card</h2>
            <p className="text-muted">Each photo is a different person. If two shots are the same card, add the other side on the next screen.</p>
            <label
              className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-5 shadow-sm"
              aria-busy={Boolean(reading)}
            >
              <span>
                <span className="block font-semibold">{reading || "Choose photos"}</span>
                <span className="text-sm text-muted">{reading ? "Stay on this screen while we read them." : "Up to 12 cards or screenshots"}</span>
                {reading ? <BusyBar className="mt-3 w-32" /> : null}
              </span>
              <span className="rounded-full bg-accent px-3 py-2 text-sm font-semibold text-accent-ink">Add</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                disabled={Boolean(reading)}
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  if (!files.length) return;
                  void onImage(files);
                  event.target.value = "";
                }}
              />
            </label>
          </section>
          <section className="surface space-y-4 p-6 lg:p-8">
            <h2 className="serif text-3xl">Or paste a link</h2>
            <p className="text-muted">LinkedIn or a site. We look it up and fill what is public. You add anything else you have.</p>
            <Field label="Their link" value={link} placeholder="linkedin.com/in/… or a site" onChange={(event) => setLink(event.target.value)} />
            <Button type="button" className="w-full" busy={reading.startsWith("Looking up")} onClick={() => void continueTyped()} disabled={!link.trim()}>
              {reading.startsWith("Looking up") ? "Looking this up…" : looksLikeLink(link) ? "Look this up" : "Use this name"}
            </Button>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <button type="button" className="text-sm font-semibold text-accent" onClick={() => void startScanner()}>
                Scan a QR code
              </button>
              <button type="button" className="text-sm font-semibold text-accent" onClick={() => startManual()}>
                Type what you have
              </button>
            </div>
            <div id="qr-reader" className="overflow-hidden rounded-2xl" />
          </section>
        </div>
        <p className="text-sm text-muted">On the next screen, type the conversation or tap Speak the note.</p>
        </>
      ) : null}

      {eventsReady && step === "confirm" ? (
        <div className="grid gap-8 lg:grid-cols-[minmax(18rem,0.85fr)_minmax(0,1.15fr)]">
          <div className="space-y-4">
            {queue.length > 1 ? (
              <p className="kicker">
                Person {queueIndex + 1} of {queue.length}
              </p>
            ) : null}
            <h1 className="serif text-4xl xl:text-5xl">{fields.name || "What you have"}</h1>
            {preview ? (
              <img src={preview} alt="This card, only while you confirm" className="max-h-80 w-full rounded-2xl bg-white object-contain" />
            ) : null}
            <p className="text-sm text-muted">
              {preview
                ? "The photo stays on this screen only. Fill in only what you collected. Empty is fine."
                : "Fill in only what you collected. Empty fields are fine."}
            </p>
            {preview ? (
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-dashed border-line px-4 py-3" aria-busy={Boolean(reading)}>
              <span>
                <span className="block text-sm font-semibold">{reading || "Add the other side of this card"}</span>
                {reading ? <BusyBar className="mt-2 w-28" /> : null}
              </span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={Boolean(reading)}
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  if (!files.length) return;
                  void onImage(files, true);
                  event.target.value = "";
                }}
              />
            </label>
            ) : null}
          </div>
          <div className="surface space-y-5 p-5 lg:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">Whatever you have is enough. Skip anything you did not get.</p>
              <button type="button" onClick={toggleNight} className="text-sm font-semibold text-accent">
                {night ? "Leave night capture" : "Night — just capture and a note"}
              </button>
            </div>
            <HuntWhy eventGoal={chosenEvent?.goalDetail || goalDetail} hunt={hunt} inPlay={inPlay} />
            <div className="form-grid">
              <Field label="Name" value={fields.name} onChange={(event) => setField("name", event.target.value)} />
              <Field label="Company" value={fields.company} onChange={(event) => setField("company", event.target.value)} />
              {night && !moreDetails ? null : (
                <>
                  <Field label="Title" value={fields.title} onChange={(event) => setField("title", event.target.value)} />
                  <Field label="Email" value={fields.email} onChange={(event) => setField("email", event.target.value)} />
                  <Field label="Phone" value={fields.phone} onChange={(event) => setField("phone", event.target.value)} />
                  <Field label="Other handle" value={fields.otherContact} onChange={(event) => setField("otherContact", event.target.value)} />
                  <Field label="LinkedIn" value={fields.linkedin} onChange={(event) => setField("linkedin", event.target.value)} />
                  <Field label="Website" value={fields.website} onChange={(event) => setField("website", event.target.value)} />
                  <Field label="City or event location" value={fields.location} onChange={(event) => setField("location", event.target.value)} className="lg:col-span-2" />
                </>
              )}
            </div>
            {night ? (
              <button type="button" className="text-sm font-semibold text-accent" onClick={() => setMoreDetails((current) => !current)}>
                {moreDetails ? "Hide extra fields" : "More than name and company"}
              </button>
            ) : null}
            <Area
              id="capture-note"
              label="One line about what you talked about"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Promised the pricing note. Works the late shift at the plant."
              action={
                <button
                  type="button"
                  onClick={() => void toggleRecording()}
                  disabled={hearing}
                  className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm font-semibold ${recording ? "text-high" : "text-accent"}`}
                  aria-pressed={recording}
                >
                  <IconMic className={recording ? "animate-pulse" : ""} />
                  {recording ? "Stop" : hearing ? "Hearing…" : "Speak the note"}
                </button>
              }
            />
            {hearing ? (
              <p className="flex items-center gap-3 text-sm text-muted">
                <BusyBar className="w-24" />
                Hearing that note
              </p>
            ) : recording ? (
              <p className="text-sm text-muted">Recording. Tap Stop when you are done.</p>
            ) : null}
            {night && !moreDetails ? null : (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const on = chosenTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setChosenTags((current) => (on ? current.filter((item) => item !== tag) : [...current, tag]))}
                      className={`rounded-full px-3 py-2 text-sm ${on ? "bg-accent text-accent-ink" : "bg-[#f7f3ea] text-muted"}`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            )}
            {night && !moreDetails ? null : (
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={allowPublicLookup} onChange={(event) => setAllowPublicLookup(event.target.checked)} />
                Look up this person and their company on the public web so the match uses more than the card.
              </label>
            )}
            <Button type="button" className="w-full" onClick={() => void finish()}>
              {queueIndex + 1 < queue.length ? "Save and add another" : "See if this connection is a fit"}
            </Button>
          </div>
        </div>
      ) : null}

      {eventsReady && step === "working" ? (
        <div className="surface grid min-h-[22rem] place-items-center p-10 text-center" aria-busy="true">
          <div className="mx-auto max-w-md">
            <BusyBar className="mx-auto mb-6 w-40" />
            <p className="serif text-3xl">Seeing if this connection is a fit.</p>
            <p className="mt-3 text-muted">This uses the conversation, public context, and why you went.</p>
            <ScreenStatus label="Matching this person to why you went" />
          </div>
        </div>
      ) : null}
    </PageWrap>
  );
}
