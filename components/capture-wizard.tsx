"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Area, Button, Field } from "@/components/ui";
import { postForm, postJson } from "@/lib/api";
import { addDays, todayISO } from "@/lib/dates";
import { createContact, createEvent, createTask, getEvent, getPublicProfile, listEvents } from "@/lib/data";
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
  const [step, setStep] = useState<"event" | "method" | "confirm" | "working">(preset ? "method" : "event");
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
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    if (!user) return;
    void listEvents(user.uid).then((next) => {
      setEvents(next);
      if (!preset && next.length === 1) {
        setEventId(next[0]!.id);
        setStep("method");
      }
    });
  }, [user, preset]);

  useEffect(() => {
    return () => {
      void scannerRef.current?.stop().catch(() => undefined);
    };
  }, []);

  function setField<K extends keyof ContactFields>(key: K, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
  }

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
        } catch {
          failed += 1;
        }
      }
      if (mergeIntoCurrent) return;
      if (!people.length) {
        setError("Could not read those photos.");
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
      setError(err instanceof Error ? err.message : "Camera access is required to scan a QR code.");
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

  async function continueTyped() {
    const value = link.trim();
    if (!value) {
      setSource("manual");
      openConfirm(emptyFields);
      return;
    }
    if (value.startsWith("billoai:")) {
      setSource("billo_qr");
      await handleQr("billo_qr", value);
      return;
    }
    if (value.toLowerCase().includes("linkedin.com")) {
      const href = value.startsWith("http") ? value : `https://${value}`;
      setSource("linkedin_qr");
      openConfirm({ ...emptyFields, linkedin: href });
      return;
    }
    const href = value.startsWith("http") ? value : `https://${value}`;
    setSource("manual");
    openConfirm({ ...emptyFields, website: href });
  }

  async function handleQr(kind: "linkedin_qr" | "billo_qr", text: string) {
    if (kind === "linkedin_qr") {
      if (!text.includes("linkedin.com")) {
        setError("That QR is not a LinkedIn profile.");
        return;
      }
      openConfirm({ ...emptyFields, linkedin: text });
      return;
    }
    const uid = text.startsWith("billoai:") ? text.slice("billoai:".length) : "";
    if (!uid) {
      setError("That QR is not a BilloAI card.");
      return;
    }
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
  }

  async function toggleRecording() {
    if (recording && recorderRef.current) {
      recorderRef.current.stop();
      setRecording(false);
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      const body = new FormData();
      body.append("audio", new Blob(chunks, { type: recorder.mimeType || "audio/webm" }), "note.webm");
      if (eventId) body.append("eventId", eventId);
      try {
        const result = await postForm<{ text: string }>("/api/ai/transcribe", body);
        setNote((current) => [current, result.text].filter(Boolean).join(" "));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not transcribe that note.");
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
      setError(err instanceof Error ? err.message : "Could not create the event.");
    } finally {
      setSavingEvent(false);
    }
  }

  async function finish() {
    if (!user || !eventId) return;
    if (!fields.name.trim()) {
      setError("A first name is enough if that is all you have.");
      return;
    }
    setStep("working");
    setError("");
    const rawNote = [note, ...chosenTags].filter(Boolean).join("\n");
    const event = events.find((item) => item.id === eventId) ?? (await getEvent(user.uid, eventId));
    let understood: UnderstandResult | null = null;
    if (event) {
      try {
        understood = await postJson<UnderstandResult>("/api/ai/understand", {
          event,
          contact: fields,
          rawNote,
          allowPublicLookup,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Scoring is unavailable. The contact was still saved.");
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
    });
    if (understood) {
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
    if (nextIndex < queue.length) {
      setQueueIndex(nextIndex);
      beginPerson(queue[nextIndex]!);
      return;
    }
    router.push(queue.length > 1 ? "/people" : `/people/${contactId}`);
  }

  return (
    <div className="space-y-5">
      {step !== "confirm" ? <h1 className="serif text-4xl">Capture</h1> : null}
      {error ? <p className="text-sm text-high">{error}</p> : null}

      {step === "event" ? (
        <div className="mx-auto max-w-xl space-y-4">
          <p className="text-muted">If the night already happened, name it now and say why you went. That is how a contact gets marked high or low.</p>
          {events.map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => {
                setEventId(event.id);
                setStep("method");
              }}
              className="surface block w-full p-4 text-left"
            >
              <span className="font-semibold">{event.name}</span>
            </button>
          ))}
          <form onSubmit={(event) => void makeEvent(event)} className="space-y-3">
            <Field label="Event name" value={eventName} onChange={(event) => setEventName(event.target.value)} placeholder="Chamber mixer, last night" />
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-muted">Why were you there?</span>
              <select value={goal} onChange={(event) => setGoal(event.target.value as NetworkingGoal)} className="w-full rounded-2xl border border-line bg-white px-3 py-3">
                {NETWORKING_GOALS.map((item) => (
                  <option key={item} value={item}>
                    {GOAL_LABELS[item]}
                  </option>
                ))}
              </select>
            </label>
            <Field label="In your own words" value={goalDetail} onChange={(event) => setGoalDetail(event.target.value)} placeholder="Find operators who need automation" />
            <Button type="submit" disabled={savingEvent} className="w-full">
              {savingEvent ? "Saving…" : "Use this event"}
            </Button>
          </form>
        </div>
      ) : null}

      {step === "method" ? (
        <div className="mx-auto max-w-xl space-y-8">
          <section className="space-y-3">
            <h2 className="serif text-3xl">Add photos</h2>
            <p className="text-muted">Each photo starts as a different person. If two shots are the same card, add the other side on the next screen.</p>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-4 shadow-sm">
              <span>
                <span className="block font-semibold">{reading || "Choose photos"}</span>
                <span className="text-sm text-muted">Up to 12 cards or screenshots</span>
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
          <section className="space-y-3">
            <h2 className="serif text-3xl">Or type who they are</h2>
            <p className="text-muted">Paste a LinkedIn or website, or type a first name. WhatsApp belongs on the next screen.</p>
            <Field label="Link or name from your notes" value={link} placeholder="linkedin.com/in/… or a URL" onChange={(event) => setLink(event.target.value)} />
            <Button type="button" className="w-full" onClick={() => void continueTyped()}>
              {link.trim() ? "Use this" : "Type their details"}
            </Button>
            <button type="button" className="text-sm font-semibold text-accent" onClick={() => void startScanner()}>
              Scan a QR code instead
            </button>
            <div id="qr-reader" className="overflow-hidden rounded-2xl" />
          </section>
        </div>
      ) : null}

      {step === "confirm" ? (
        <div className="mx-auto max-w-xl space-y-4">
          {queue.length > 1 ? <p className="kicker">Person {queueIndex + 1} of {queue.length}</p> : null}
          <h1 className="serif text-4xl">{fields.name || "Who is this?"}</h1>
          {preview ? <img src={preview} alt="This card, only while you confirm" className="max-h-48 w-full rounded-2xl object-contain bg-white" /> : null}
          <p className="text-sm text-muted">The photo stays on this screen only. We look up public professional context unless you turn that off.</p>
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-dashed border-line px-4 py-3">
            <span className="text-sm font-semibold">{reading || "Add the other side of this card"}</span>
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
          <Field label="Name" value={fields.name} onChange={(event) => setField("name", event.target.value)} />
          <Field label="Company" value={fields.company} onChange={(event) => setField("company", event.target.value)} />
          <Field label="Title" value={fields.title} onChange={(event) => setField("title", event.target.value)} />
          <Field label="Email" value={fields.email} onChange={(event) => setField("email", event.target.value)} />
          <Field label="Phone" value={fields.phone} onChange={(event) => setField("phone", event.target.value)} />
          <Field label="WhatsApp or other" value={fields.otherContact} onChange={(event) => setField("otherContact", event.target.value)} />
          <Field label="LinkedIn" value={fields.linkedin} onChange={(event) => setField("linkedin", event.target.value)} />
          <Field label="Website" value={fields.website} onChange={(event) => setField("website", event.target.value)} />
          <Field label="City or event location" value={fields.location} onChange={(event) => setField("location", event.target.value)} />
          <Area label="One line about what you talked about" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Promised the pricing note. Works nights at the plant." />
          <Button type="button" tone="ghost" onClick={() => void toggleRecording()}>
            {recording ? "Stop voice note" : "Speak it if that is faster"}
          </Button>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const on = chosenTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setChosenTags((current) => (on ? current.filter((item) => item !== tag) : [...current, tag]))}
                  className={`rounded-full px-3 py-2 text-sm ${on ? "bg-accent text-accent-ink" : "bg-card text-muted"}`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={allowPublicLookup} onChange={(event) => setAllowPublicLookup(event.target.checked)} />
            Look up this person and their company on the public web so the match uses more than the card.
          </label>
          <Button type="button" className="w-full" onClick={() => void finish()}>
            {queueIndex + 1 < queue.length ? "Save and next person" : "Find out if they match"}
          </Button>
        </div>
      ) : null}

      {step === "working" ? (
        <p className="text-muted">Checking who they are in public, then scoring them against why you went…</p>
      ) : null}
    </div>
  );
}
