"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Area, Button, Field, Steps } from "@/components/ui";
import { postForm, postJson } from "@/lib/api";
import { addDays, todayISO } from "@/lib/dates";
import { createContact, createTask, getPublicProfile, listEvents } from "@/lib/data";
import { compressImage } from "@/lib/images";
import type {
  ContactFields,
  ContactSource,
  EventRecord,
  UnderstandResult,
} from "@/lib/types";

const tags = [
  "Potential customer",
  "Investor",
  "Partner",
  "Supplier",
  "Pain point",
  "Asked me to send something",
];

const methods: Array<{ id: ContactSource; label: string }> = [
  { id: "card", label: "Scan a business card" },
  { id: "screenshot", label: "Upload a screenshot" },
  { id: "photo", label: "Take a picture" },
  { id: "manual", label: "Enter manually" },
  { id: "linkedin_qr", label: "Scan LinkedIn QR" },
  { id: "billo_qr", label: "Scan BilloAI QR" },
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
};

export function CaptureWizard() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const preset = params.get("event") ?? "";
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [eventId, setEventId] = useState(preset);
  const [source, setSource] = useState<ContactSource>("card");
  const [step, setStep] = useState<"event" | "method" | "details" | "note" | "working">(preset ? "method" : "event");
  const [fields, setFields] = useState<ContactFields>(emptyFields);
  const [note, setNote] = useState("");
  const [chosenTags, setChosenTags] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);
  const [allowPublicLookup, setAllowPublicLookup] = useState(false);
  const [moreWays, setMoreWays] = useState(false);
  const [detailStep, setDetailStep] = useState(0);
  const [noteStep, setNoteStep] = useState(0);
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    if (!user) return;
    void listEvents(user.uid).then(setEvents);
  }, [user]);

  useEffect(() => {
    return () => {
      void scannerRef.current?.stop().catch(() => undefined);
    };
  }, []);

  function setField<K extends keyof ContactFields>(key: K, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  async function onImage(file: File) {
    if (!user) return;
    setError("");
    try {
      const dataUrl = await compressImage(file);
      const extracted = await postJson<{ fields: ContactFields }>("/api/ai/extract-card", {
        image: dataUrl,
        eventId,
      });
      setFields({ ...emptyFields, ...extracted.fields });
      setStep("details");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that image.");
    }
  }

  async function startScanner(kind: "linkedin_qr" | "billo_qr") {
    setError("");
    setSource(kind);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 8, qrbox: 220 },
        (text) => {
          void scanner.stop().then(() => handleQr(kind, text));
        },
        () => undefined,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Camera access is required to scan a QR code.");
    }
  }

  async function handleQr(kind: "linkedin_qr" | "billo_qr", text: string) {
    if (kind === "linkedin_qr") {
      if (!text.includes("linkedin.com")) {
        setError("That QR is not a LinkedIn profile.");
        return;
      }
      setFields({ ...emptyFields, linkedin: text });
      setStep("details");
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
    setFields({
      ...emptyFields,
      name: profile.name,
      company: profile.company,
      title: profile.title,
      email: profile.email,
      linkedin: profile.linkedin,
      website: profile.website,
    });
    setStep("details");
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

  async function finish() {
    if (!user || !eventId) return;
    setStep("working");
    setError("");
    const rawNote = [note, ...chosenTags].filter(Boolean).join("\n");
    const event = events.find((item) => item.id === eventId);
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
    router.push(`/people/${contactId}`);
  }

  return (
    <div className="space-y-5">
      {step === "event" || step === "method" || step === "working" ? <h1 className="serif text-4xl">Capture</h1> : null}
      {error ? <p className="text-sm text-high">{error}</p> : null}

      {step === "event" ? (
        <div className="space-y-3">
          <p className="text-muted">Which event is this from?</p>
          {events.length === 0 ? (
            <Button type="button" onClick={() => router.push("/events/new")}>
              Create an event first
            </Button>
          ) : (
            events.map((event) => (
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
            ))
          )}
        </div>
      ) : null}

      {step === "method" ? (
        <div className="space-y-3">
          <p className="text-muted">Start with the card. Other ways stay out of the way.</p>
          <label className="surface block bg-foreground p-5 font-semibold text-card">
            Scan a business card
            <span className="mt-1 block text-sm font-normal text-white/70">Photo of a card or badge</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setSource("card");
                void onImage(file);
              }}
            />
          </label>
          <button
            type="button"
            className="w-full rounded-2xl border border-dashed border-line px-4 py-3 text-left font-semibold"
            onClick={() => {
              setSource("manual");
              setStep("details");
            }}
          >
            Enter manually
          </button>
          <button type="button" className="text-sm font-semibold text-accent" onClick={() => setMoreWays((open) => !open)}>
            {moreWays ? "Hide other ways" : "Photo, screenshot, or QR"}
          </button>
          {moreWays
            ? methods
                .filter((method) => method.id !== "card" && method.id !== "manual")
                .map((method) =>
                  method.id === "photo" || method.id === "screenshot" ? (
                    <label key={method.id} className="block rounded-2xl bg-white px-4 py-3 font-semibold">
                      {method.label}
                      <input
                        type="file"
                        accept="image/*"
                        capture={method.id === "screenshot" ? undefined : "environment"}
                        className="sr-only"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          setSource(method.id);
                          void onImage(file);
                        }}
                      />
                    </label>
                  ) : (
                    <button
                      key={method.id}
                      type="button"
                      className="block w-full rounded-2xl bg-white px-4 py-3 text-left font-semibold"
                      onClick={() => {
                        if (method.id === "linkedin_qr" || method.id === "billo_qr") void startScanner(method.id);
                      }}
                    >
                      {method.label}
                    </button>
                  ),
                )
            : null}
          <div id="qr-reader" className="overflow-hidden rounded-2xl" />
        </div>
      ) : null}

      {step === "details" ? (
        <form
          className="mx-auto max-w-xl space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (detailStep === 0 && !fields.name.trim()) {
              setError("Add a name before continuing.");
              return;
            }
            setError("");
            if (detailStep < 2) setDetailStep((current) => current + 1);
            else setStep("note");
          }}
        >
          <Steps labels={["Who", "Reach them", "Links"]} index={detailStep} />
          {detailStep === 0 ? (
            <>
              <h1 className="serif text-4xl">Who did you meet?</h1>
              <Field label="Name" value={fields.name} onChange={(event) => setField("name", event.target.value)} required />
              <Field label="Company" value={fields.company} onChange={(event) => setField("company", event.target.value)} />
              <Field label="Job title" value={fields.title} onChange={(event) => setField("title", event.target.value)} />
            </>
          ) : null}
          {detailStep === 1 ? (
            <>
              <h1 className="serif text-4xl">How do you reach them?</h1>
              <Field label="Email" value={fields.email} onChange={(event) => setField("email", event.target.value)} />
              <Field label="Phone" value={fields.phone} onChange={(event) => setField("phone", event.target.value)} />
            </>
          ) : null}
          {detailStep === 2 ? (
            <>
              <h1 className="serif text-4xl">Anything else visible?</h1>
              <Field label="Website" value={fields.website} onChange={(event) => setField("website", event.target.value)} />
              <Field label="LinkedIn" value={fields.linkedin} onChange={(event) => setField("linkedin", event.target.value)} />
              <Field label="Location" value={fields.location} onChange={(event) => setField("location", event.target.value)} />
            </>
          ) : null}
          <div className="flex gap-3">
            {detailStep > 0 ? (
              <Button type="button" tone="ghost" onClick={() => setDetailStep((current) => current - 1)}>
                Back
              </Button>
            ) : null}
            <Button type="submit" className="flex-1">
              Continue
            </Button>
          </div>
        </form>
      ) : null}

      {step === "note" ? (
        <div className="mx-auto max-w-xl space-y-4">
          <Steps labels={["The conversation", "What it was"]} index={noteStep} />
          {noteStep === 0 ? (
            <>
              <h1 className="serif text-4xl">What did you talk about?</h1>
              <Area label="Note" value={note} onChange={(event) => setNote(event.target.value)} />
              <Button type="button" tone="ghost" onClick={() => void toggleRecording()}>
                {recording ? "Stop voice note" : "Speak a voice note"}
              </Button>
              <Button type="button" className="w-full" onClick={() => setNoteStep(1)}>
                Continue
              </Button>
            </>
          ) : (
            <>
              <h1 className="serif text-4xl">What kind of conversation was it?</h1>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const on = chosenTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        setChosenTags((current) => (on ? current.filter((item) => item !== tag) : [...current, tag]))
                      }
                      className={`rounded-full px-3 py-2 text-sm ${on ? "bg-accent text-accent-ink" : "bg-card text-muted"}`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
              <p className="text-sm text-muted">
                Public lookup uses company and role information only. It does not look up private life details.
              </p>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={allowPublicLookup}
                  onChange={(event) => setAllowPublicLookup(event.target.checked)}
                />
                Look up public professional information for this person.
              </label>
              <div className="flex gap-3">
                <Button type="button" tone="ghost" onClick={() => setNoteStep(0)}>
                  Back
                </Button>
                <Button type="button" className="flex-1" onClick={() => void finish()}>
                  Understand this contact
                </Button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {step === "working" ? (
        <p className="text-muted">Reading the conversation, checking public context, and deciding who matters…</p>
      ) : null}
    </div>
  );
}
