"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { BusyBar, CaptureBodySkeleton, OverlayStatus, ScreenStatus } from "@/components/loading";
import { HuntWhy, type HuntSummary } from "@/components/hunt-why";
import { PaywallNotice } from "@/components/paywall";
import { BrandMark } from "@/components/brand";
import { ChannelMark } from "@/components/channel-mark";
import { IconCamera, IconMic, IconQr } from "@/components/icons";
import { Area, Avatar, Button, ErrorNote, Field, PageHeader, PageWrap, SelectField } from "@/components/ui";
import { ApiError, getJson, isPaywalled, postForm, postJson } from "@/lib/api";
import { userMessage } from "@/lib/errors";
import { addDays, todayISO } from "@/lib/dates";
import { createContact, createEvent, createTask, getEvent, listEvents, resolvePublicCard, updateEvent } from "@/lib/data";
import { CARD_SCHEME, parseCardScan } from "@/lib/card";
import { asHref, looksLikeLink } from "@/lib/links";
import { cardFaceSrc, contactFromProfile, labelFromUrl } from "@/lib/profile-links";
import { scanQrFile, startQrScan } from "@/lib/qr-scan";
import { skipFollowUp } from "@/lib/relevance";
import { compressImage, dataUrlToBlob } from "@/lib/images";
import { newCaptureId, putQueuedCapture } from "@/lib/capture-queue";
import { mergeContactFields } from "@/lib/capture-sync";
import { scoreContact } from "@/lib/score-contact";
import { useCaptureSync } from "@/lib/use-capture-sync";
import { GOAL_LABELS, NETWORKING_GOALS, type ContactFields, type ContactSource, type EventRecord, type NetworkingGoal, type UnderstandResult } from "@/lib/types";

function isProfilePaste(value: string) {
  const text = value.trim();
  if (!text) return false;
  const scanned = parseCardScan(text);
  return scanned.kind === "billo" || scanned.kind === "linkedin" || scanned.kind === "url" || looksLikeLink(text);
}

function pasteHint(value: string) {
  const text = value.trim();
  if (!text) return "";
  const scanned = parseCardScan(text);
  if (scanned.kind === "billo") return "Their Billo card";
  if (scanned.kind === "linkedin") return "LinkedIn";
  if (isProfilePaste(text)) {
    const label = labelFromUrl(text);
    return label === "Link" ? "Public page" : label;
  }
  return "We’ll use this as their name";
}

function ShareChip({ children, label }: { children: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-sm">
      {children}
      {label}
    </span>
  );
}

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

type Queued = {
  fields: ContactFields;
  preview: string;
  cardUid?: string;
  photo?: Blob;
  audio?: Blob;
  audioName?: string;
};

type InPlayState = { inPlay: boolean; heldBy: string[] };

export function CaptureWizard() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const preset = params.get("event") ?? "";
  const cardParam = params.get("card") ?? "";
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
  const [inPlay, setInPlay] = useState<InPlayState>({ inPlay: false, heldBy: [] });
  const [cardUid, setCardUid] = useState("");
  const [hunt, setHunt] = useState<HuntSummary | null>(null);
  const [night, setNight] = useState(false);
  const [moreDetails, setMoreDetails] = useState(false);
  const [typeNote, setTypeNote] = useState(false);
  const [saving, setSaving] = useState(false);
  const [readingCard, setReadingCard] = useState(false);
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const openedCard = useRef("");
  const queueIndexRef = useRef(0);
  const pendingAudio = useRef<{ blob: Blob; name: string } | null>(null);

  useCaptureSync(user?.uid);
  queueIndexRef.current = queueIndex;

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
    if (!user || !eventsReady || !cardParam || !eventId || openedCard.current === cardParam) return;
    openedCard.current = cardParam;
    void handleScan(`${CARD_SCHEME}${cardParam}`);
  }, [user, eventsReady, cardParam, eventId]);

  useEffect(() => {
    return () => {
      void scannerRef.current?.stop().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    const company = fields.company.trim();
    if (!user || step !== "confirm" || company.length < 2) {
      setInPlay({ inPlay: false, heldBy: [] });
      return;
    }
    let cancel = false;
    const timer = window.setTimeout(() => {
      void getJson<InPlayState>(`/api/team/in-play?company=${encodeURIComponent(company)}`)
        .then((result) => {
          if (!cancel) setInPlay({ inPlay: result.inPlay, heldBy: result.heldBy ?? [] });
        })
        .catch(() => {
          if (!cancel) setInPlay({ inPlay: false, heldBy: [] });
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
    setCardUid(person.cardUid || "");
    setNote("");
    setChosenTags([]);
    setAllowPublicLookup(true);
    setTypeNote(false);
    pendingAudio.current = person.audio ? { blob: person.audio, name: person.audioName || "note.webm" } : null;
    setStep("confirm");
  }

  async function extractInto(index: number, image: string) {
    if (queueIndexRef.current === index) setReadingCard(true);
    try {
      const extracted = await postJson<{ fields: ContactFields }>("/api/ai/extract-card", { image, eventId });
      setQueue((current) =>
        current.map((item, itemIndex) =>
          itemIndex === index
            ? { ...item, fields: mergeContactFields(item.fields, extracted.fields), photo: undefined }
            : item,
        ),
      );
      if (queueIndexRef.current === index) {
        setFields((current) => mergeContactFields(current, extracted.fields));
      }
    } catch (err) {
      if (!notePaywall(err)) {
        setError(userMessage(err, "Could not read that photo. You can still save a name."));
      }
    } finally {
      if (queueIndexRef.current === index) setReadingCard(false);
    }
  }

  async function onImage(files: File[], mergeIntoCurrent = false) {
    if (!user) return;
    const chosen = files.slice(0, 12);
    if (!chosen.length) return;
    setError("");
    setSource("photo");
    setCardUid("");
    if (mergeIntoCurrent) {
      const file = chosen[0];
      if (!file) return;
      setReading("Reading the other side…");
      try {
        const image = await compressImage(file);
        const photo = dataUrlToBlob(image);
        setPreview(image);
        setQueue((current) =>
          current.map((item, itemIndex) => (itemIndex === queueIndex ? { ...item, preview: image, photo } : item)),
        );
        void extractInto(queueIndex, image);
      } catch (err) {
        if (!notePaywall(err)) setError(userMessage(err, "Could not read that photo."));
      } finally {
        setReading("");
      }
      return;
    }
    const people: Queued[] = [];
    let failed = 0;
    for (const file of chosen) {
      try {
        const image = await compressImage(file);
        people.push({ fields: { ...emptyFields }, preview: image, photo: dataUrlToBlob(image) });
      } catch {
        failed += 1;
      }
    }
    if (!people.length) {
      setError("Could not open those photos.");
      return;
    }
    if (failed) setError(`${failed} photo${failed === 1 ? "" : "s"} could not be opened. Confirm the ones that worked.`);
    setQueue(people);
    setQueueIndex(0);
    beginPerson(people[0]!);
    people.forEach((person, index) => void extractInto(index, person.preview));
  }

  async function startScanner() {
    setError("");
    const host = document.getElementById("qr-reader");
    if (!host) return;
    try {
      let taken = false;
      const stop = await startQrScan(host, (text) => {
        if (taken) return;
        taken = true;
        void stop().then(() => handleScan(text));
      });
      scannerRef.current = { stop };
    } catch (err) {
      setError(userMessage(err, "Allow the camera, or upload a photo of the QR."));
    }
  }

  async function onQrFile(file: File) {
    setError("");
    setReading("Reading that QR…");
    try {
      const text = await scanQrFile(file);
      if (!text) {
        setError("No QR was found in that photo.");
        return;
      }
      await handleScan(text);
    } catch (err) {
      setError(userMessage(err, "Could not read that QR photo."));
    } finally {
      setReading("");
    }
  }

  function openConfirm(next: ContactFields, nextCardUid = "") {
    setFields(next);
    setPreview("");
    setCardUid(nextCardUid);
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
    if (!value) return;
    const scanned = parseCardScan(value);
    if (scanned.kind === "billo") {
      await handleScan(value);
      return;
    }
    if (!looksLikeLink(value)) {
      startManual({ ...emptyFields, name: value });
      return;
    }
    await lookupPage(asHref(value), value.toLowerCase().includes("linkedin.com") ? "linkedin_qr" : "manual");
  }

  async function handleScan(text: string) {
    const scanned = parseCardScan(text);
    if (scanned.kind === "linkedin") {
      setSource("linkedin_qr");
      await lookupPage(scanned.href, "linkedin_qr");
      return;
    }
    if (scanned.kind === "url") {
      setSource("manual");
      await lookupPage(scanned.href, "manual");
      return;
    }
    if (scanned.kind !== "billo") {
      setError("That QR is not a profile link we can read.");
      return;
    }
    if (user && scanned.uid === user.uid) {
      setError("That’s your own card. Show it to the other person, or scan theirs.");
      return;
    }
    setSource("billo_qr");
    setReading("Opening that card…");
    try {
      const card = await resolvePublicCard(scanned.uid);
      if (!card) {
        setError("No BilloAI card was found for that code.");
        return;
      }
      openConfirm(
        {
          ...emptyFields,
          ...contactFromProfile(card.profile),
        },
        card.uid,
      );
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
        pendingAudio.current = null;
      } catch (err) {
        pendingAudio.current = { blob: new Blob(chunks, { type }), name: type.includes("mp4") ? "note.m4a" : "note.webm" };
        if (!notePaywall(err)) setError("Could not hear that yet. It stays on this phone. You can still save.");
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
    const current = queue[queueIndex];
    if (
      !fields.name.trim() &&
      !fields.company.trim() &&
      !fields.linkedin.trim() &&
      !fields.website.trim() &&
      !current?.photo
    ) {
      setError("Add a first name, a company, or a link. Whatever you collected is enough.");
      return;
    }
    const nightSave = night;
    if (!nightSave) setStep("working");
    else setSaving(true);
    setError("");
    const rawNote = [note, ...chosenTags].filter(Boolean).join("\n");
    const event = events.find((item) => item.id === eventId) ?? (await getEvent(user.uid, eventId));
    let understood: UnderstandResult | null = null;
    let blocked = paywalled;
    if (!nightSave && event) {
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
    let alreadyInPlay = Boolean(understood?.alreadyInPlay) || inPlay.inPlay;
    let alreadyInPlayBy = understood?.alreadyInPlayBy ?? inPlay.heldBy;
    if (!alreadyInPlay && fields.company.trim()) {
      try {
        const flag = await getJson<InPlayState>(`/api/team/in-play?company=${encodeURIComponent(fields.company)}`);
        alreadyInPlay = flag.inPlay;
        alreadyInPlayBy = flag.heldBy ?? [];
      } catch {
        alreadyInPlay = false;
      }
    }

    async function afterSave(contactId: string) {
      pendingAudio.current = null;
      setSaving(false);
      const nextIndex = queueIndex + 1;
      if (!contactId || contactId === "queued") {
        setStep(nightSave ? "method" : "confirm");
        return;
      }
      if (blocked && !nightSave) {
        setStep("confirm");
        setError("We saved them. Matching needs a plan after your first event.");
        return;
      }
      if (nextIndex < queue.length) {
        setQueueIndex(nextIndex);
        beginPerson(queue[nextIndex]!);
        return;
      }
      if (nightSave) {
        setQueue([]);
        setQueueIndex(0);
        setFields(emptyFields);
        setPreview("");
        setNote("");
        setCardUid("");
        setChosenTags([]);
        setStep("method");
        return;
      }
      router.push(queue.length > 1 ? "/people" : `/people/${contactId}`);
    }

    let contactId = "";
    try {
      contactId = await createContact(user.uid, {
        ...fields,
        eventId,
        source,
        imagePath: "",
        cardUid,
        rawNote,
        structuredNote: understood?.structuredNote ?? null,
        enrichment: understood?.enrichment ?? null,
        relevance: understood?.relevance ?? null,
        alreadyInPlay,
        alreadyInPlayBy,
        scoreStatus: understood ? "ready" : "pending",
      });
    } catch (err) {
      await putQueuedCapture({
        id: newCaptureId(),
        eventId,
        source,
        fields,
        rawNote,
        cardUid,
        allowPublicLookup,
        createdAt: new Date().toISOString(),
        photo: current?.photo,
        audio: pendingAudio.current?.blob,
        audioName: pendingAudio.current?.name,
      });
      setError(userMessage(err, "Saved on this phone. We’ll rank them when you’re back online."));
      await afterSave("queued");
      return;
    }

    const needsPhoto =
      Boolean(current?.photo) &&
      (!fields.name.trim() || !fields.title.trim() || !fields.company.trim() || !fields.linkedin.trim());
    const needsAudio = Boolean(pendingAudio.current) && !rawNote.trim();
    if (needsPhoto || needsAudio) {
      await putQueuedCapture({
        id: newCaptureId(),
        eventId,
        source,
        fields,
        rawNote,
        cardUid,
        allowPublicLookup,
        createdAt: new Date().toISOString(),
        contactId,
        photo: needsPhoto ? current?.photo : undefined,
        audio: needsAudio ? pendingAudio.current?.blob : undefined,
        audioName: pendingAudio.current?.name,
      });
    }

    try {
      if (understood && !skipFollowUp(understood.relevance) && understood.draft.body.trim()) {
      const promise = understood.structuredNote.followUpPromise;
      await createTask(user.uid, {
        contactId,
        eventId,
        contactName: fields.name || "Contact",
        cardUid,
        channel: understood.draft.channel,
        title: promise || understood.draft.title || understood.relevance.suggestedAction,
        draft: understood.draft.body,
        dueDate: understood.draft.dueDate || (understood.relevance.level === "high" ? todayISO() : addDays(todayISO(), 7)),
      });
    } else {
      await createTask(user.uid, {
        contactId,
        eventId,
        contactName: fields.name || "Contact",
        cardUid,
        channel: "linkedin",
        title: "Stay connected",
        draft: "",
        dueDate: addDays(todayISO(), 1),
      });
    }

    if (nightSave) {
      void scoreContact(user.uid, contactId, allowPublicLookup).catch((err: unknown) => {
        if (notePaywall(err)) return;
      });
    }
      await afterSave(contactId);
    } catch (err) {
      setSaving(false);
      setError(userMessage(err, "Saved. Ranking waits until you’re back online."));
      if (nightSave) setStep("method");
      else setStep("confirm");
    }
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
              : step === "method"
                ? night
                  ? "Paper card, any profile they sent, or a QR they showed. Ranking waits until you’re back online."
                  : "Paper card, any profile they sent, or a QR they showed."
                : night
                  ? "Photo or a name, then what you talked about. Ranking waits until you’re back online."
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
            <h2 className="serif text-3xl">Photo of their card</h2>
            <p className="text-muted">Paper card or a screenshot. Each photo is one person.</p>
            <label
              className="flex min-h-[12rem] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line px-4 py-6 text-center hover:border-accent"
              aria-busy={Boolean(reading)}
            >
              <span className="grid h-14 w-14 place-items-center rounded-full bg-[#f7f3ea] text-accent">
                <IconCamera className="h-7 w-7" />
              </span>
              <span>
                <span className="block font-semibold">
                  {reading && !reading.startsWith("Looking") && !reading.startsWith("Reading that QR") ? reading : "Add card photos"}
                </span>
                <span className="mt-1 block text-sm text-muted">
                  {reading && !reading.startsWith("Looking") && !reading.startsWith("Reading that QR")
                    ? "Stay here while we read it."
                    : "Up to 12 at once"}
                </span>
              </span>
              {reading && !reading.startsWith("Looking") && !reading.startsWith("Reading that QR") ? <BusyBar className="w-32" /> : (
                <span className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink">Add photos</span>
              )}
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
          <section className="surface space-y-5 p-6 lg:p-8">
            <h2 className="serif text-3xl">A profile they shared</h2>
            <p className="text-muted">Any public profile they sent you — or the QR on their phone.</p>
            <div className="flex flex-wrap gap-2" aria-label="Links we can read">
              <ShareChip label="LinkedIn"><ChannelMark kind="linkedin" /></ShareChip>
              <ShareChip label="Instagram"><ChannelMark kind="instagram" /></ShareChip>
              <ShareChip label="X"><ChannelMark kind="x" /></ShareChip>
              <ShareChip label="Any site"><ChannelMark kind="website" /></ShareChip>
              <ShareChip label="Billo card"><BrandMark className="h-5 w-5" /></ShareChip>
            </div>
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (link.trim()) void continueTyped();
              }}
            >
              <Field
                label="Paste their link"
                value={link}
                placeholder="linkedin.com/in/…  instagram.com/…  or billoai.com/c/first-last"
                inputMode="url"
                autoComplete="url"
                enterKeyHint="go"
                onChange={(event) => setLink(event.target.value)}
              />
              {pasteHint(link) ? <p className="text-sm text-muted">{pasteHint(link)}</p> : null}
              {link.trim() && !isProfilePaste(link) ? (
                <Button type="submit" tone="ghost" className="w-full">
                  Use this as their name
                </Button>
              ) : (
                <Button type="submit" className="w-full" busy={reading.startsWith("Looking up")} disabled={!isProfilePaste(link)}>
                  {reading.startsWith("Looking up") ? "Looking this up…" : "Look this up"}
                </Button>
              )}
            </form>
            <div className="flex items-center gap-3 text-sm text-muted" role="separator">
              <span className="h-px flex-1 bg-[var(--line)]" />
              Or a QR they showed
              <span className="h-px flex-1 bg-[var(--line)]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => void startScanner()}
                className="flex min-h-[7.5rem] cursor-pointer flex-col items-start justify-between gap-3 rounded-2xl border border-line px-4 py-4 text-left hover:border-accent"
              >
                <span className="grid h-11 w-11 place-items-center rounded-full bg-[#f7f3ea] text-accent">
                  <IconQr />
                </span>
                <span>
                  <span className="block font-semibold">Scan their QR</span>
                  <span className="text-sm text-muted">Live camera</span>
                </span>
              </button>
              <label className="flex min-h-[7.5rem] cursor-pointer flex-col items-start justify-between gap-3 rounded-2xl border border-line px-4 py-4 hover:border-accent">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-[#f7f3ea] text-accent">
                  <IconCamera />
                </span>
                <span>
                  <span className="block font-semibold">Photo of a QR</span>
                  <span className="text-sm text-muted">Screenshot or camera</span>
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    void onQrFile(file);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
            <div id="qr-reader" className="overflow-hidden rounded-2xl" />
            <button type="button" className="text-sm font-semibold text-accent" onClick={() => startManual()}>
              Type what you have
            </button>
          </section>
        </div>
        <p className="text-sm text-muted">On the next screen, speak the note. Type if you need to.</p>
        {night && eventId ? (
          <p>
            <button type="button" className="text-sm font-semibold text-accent" onClick={() => router.push(`/events/${eventId}`)}>
              Done for tonight
            </button>
          </p>
        ) : null}
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
            {cardUid && !preview ? <Avatar name={fields.name || "?"} size="lg" photoSrc={cardFaceSrc(cardUid)} /> : null}
            {preview ? (
              <img src={preview} alt="This card, only while you confirm" className="max-h-80 w-full rounded-2xl bg-white object-contain" />
            ) : null}
            <p className="text-sm text-muted">
              {preview
                ? "The photo stays on this phone until we can read it, then it is discarded."
                : "Fill in only what you collected. Empty fields are fine."}
            </p>
            {readingCard ? (
              <p className="flex items-center gap-3 text-sm text-muted">
                <BusyBar className="w-24" />
                Reading the card
              </p>
            ) : null}
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
            <HuntWhy eventGoal={chosenEvent?.goalDetail || goalDetail} hunt={hunt} inPlay={inPlay.inPlay} heldBy={inPlay.heldBy} />
            <div className="form-grid">
              <Field label="Name" value={fields.name} onChange={(event) => setField("name", event.target.value)} />
              <Field label="Title" value={fields.title} onChange={(event) => setField("title", event.target.value)} />
              <Field label="Company" value={fields.company} onChange={(event) => setField("company", event.target.value)} />
              <Field label="LinkedIn" value={fields.linkedin} onChange={(event) => setField("linkedin", event.target.value)} />
              {night && !moreDetails ? null : (
                <>
                  <Field label="Email" value={fields.email} onChange={(event) => setField("email", event.target.value)} />
                  <Field label="Phone" value={fields.phone} onChange={(event) => setField("phone", event.target.value)} />
                  <Field label="Other handle" value={fields.otherContact} onChange={(event) => setField("otherContact", event.target.value)} />
                  <Field label="Website" value={fields.website} onChange={(event) => setField("website", event.target.value)} />
                  <Field label="City or event location" value={fields.location} onChange={(event) => setField("location", event.target.value)} className="lg:col-span-2" />
                </>
              )}
            </div>
            {night ? (
              <button type="button" className="text-sm font-semibold text-accent" onClick={() => setMoreDetails((current) => !current)}>
                {moreDetails ? "Hide extra fields" : "More than name, title, company, LinkedIn"}
              </button>
            ) : null}
            {night && !typeNote ? (
              <div className="space-y-3">
                <Button type="button" className="w-full" busy={hearing} onClick={() => void toggleRecording()}>
                  {recording ? "Stop" : hearing ? "Hearing…" : "Speak the note"}
                </Button>
                <p className="text-sm text-muted">
                  {recording
                    ? "Recording your recap. Tap Stop when you are done."
                    : "Speak what you talked about after they leave. Do not record them."}
                </p>
                {note ? <p className="rounded-2xl bg-[#f7f3ea] px-4 py-3 text-sm">{note}</p> : null}
                <button type="button" className="text-sm font-semibold text-accent" onClick={() => setTypeNote(true)}>
                  Type instead
                </button>
              </div>
            ) : (
              <>
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
              </>
            )}
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
            <Button type="button" className="w-full" busy={saving} disabled={saving} onClick={() => void finish()}>
              {night || queueIndex + 1 < queue.length ? "Save and add another" : "See if this connection is a fit"}
            </Button>
            {night && eventId ? (
              <button type="button" className="text-sm font-semibold text-accent" onClick={() => router.push(`/events/${eventId}`)}>
                Done for tonight
              </button>
            ) : null}
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
