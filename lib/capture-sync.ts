import { postForm, postJson } from "@/lib/api";
import { announceCaptureWork } from "@/lib/capture-events";
import { addDays, todayISO } from "@/lib/dates";
import { createContact, createTask, getContact, updateContact } from "@/lib/data";
import { blobToDataUrl } from "@/lib/images";
import { deleteQueuedCapture, listQueuedCaptures, putQueuedCapture, type CaptureQueueItem } from "@/lib/capture-queue";
import { scoreContact, scorePendingContacts } from "@/lib/score-contact";
import type { ContactFields } from "@/lib/types";

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

export function mergeContactFields(base: ContactFields, extra: ContactFields): ContactFields {
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

function hasIdentity(fields: ContactFields) {
  return Boolean(fields.name.trim() || fields.company.trim() || fields.linkedin.trim() || fields.website.trim());
}

let draining = false;

async function fillFromBlobs(item: CaptureQueueItem) {
  let fields = { ...emptyFields, ...item.fields };
  let rawNote = item.rawNote;
  let photo = item.photo;
  let audio = item.audio;

  if (photo) {
    const needsRead = !fields.name.trim() || !fields.title.trim() || !fields.company.trim() || !fields.linkedin.trim();
    if (needsRead) {
      try {
        const image = await blobToDataUrl(photo);
        const extracted = await postJson<{ fields: ContactFields }>("/api/ai/extract-card", {
          image,
          eventId: item.eventId,
        });
        fields = mergeContactFields(fields, extracted.fields);
        photo = undefined;
      } catch {
        // Keep the photo on the phone until the read works.
      }
    } else {
      photo = undefined;
    }
  }

  if (audio && !rawNote.trim()) {
    try {
      const body = new FormData();
      body.append("audio", audio, item.audioName || "note.webm");
      if (item.eventId) body.append("eventId", item.eventId);
      const result = await postForm<{ text: string }>("/api/ai/transcribe", body);
      rawNote = result.text;
      audio = undefined;
    } catch {
      // Keep the spoken note until we can hear it.
    }
  } else if (audio && rawNote.trim()) {
    audio = undefined;
  }

  return { fields, rawNote, photo, audio };
}

async function drainItem(uid: string, item: CaptureQueueItem) {
  const filled = await fillFromBlobs(item);
  const leftover = filled.photo || filled.audio;

  if (!item.contactId) {
    if (!hasIdentity(filled.fields) && !filled.rawNote.trim()) return;
    const contactId = await createContact(uid, {
      ...filled.fields,
      eventId: item.eventId,
      source: item.source,
      imagePath: "",
      cardUid: item.cardUid,
      rawNote: filled.rawNote,
      structuredNote: null,
      enrichment: null,
      relevance: null,
      alreadyInPlay: false,
      alreadyInPlayBy: [],
      scoreStatus: "pending",
    });
    await createTask(uid, {
      contactId,
      eventId: item.eventId,
      contactName: filled.fields.name || "Contact",
      cardUid: item.cardUid,
      channel: "linkedin",
      title: "Stay connected",
      draft: "",
      dueDate: addDays(todayISO(), 1),
    });
    if (leftover) {
      await putQueuedCapture({
        ...item,
        contactId,
        fields: filled.fields,
        rawNote: filled.rawNote,
        photo: filled.photo,
        audio: filled.audio,
      });
      return;
    }
    await deleteQueuedCapture(item.id);
    await scoreContact(uid, contactId, item.allowPublicLookup).catch(() => undefined);
    return;
  }

  const contact = await getContact(uid, item.contactId);
  if (contact) {
    await updateContact(uid, contact.id, {
      ...mergeContactFields(fieldsFrom(contact), filled.fields),
      rawNote: contact.rawNote.trim() ? contact.rawNote : filled.rawNote,
    });
  }
  if (leftover) {
    await putQueuedCapture({
      ...item,
      fields: filled.fields,
      rawNote: filled.rawNote,
      photo: filled.photo,
      audio: filled.audio,
    });
    return;
  }
  await deleteQueuedCapture(item.id);
  await scoreContact(uid, item.contactId, item.allowPublicLookup).catch(() => undefined);
}

function fieldsFrom(contact: { name: string; company: string; title: string; email: string; phone: string; website: string; linkedin: string; location: string; otherContact: string }): ContactFields {
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

export async function drainCaptureWork(uid: string) {
  if (typeof window === "undefined" || draining) return;
  if (!navigator.onLine) return;
  draining = true;
  try {
    const queued = await listQueuedCaptures();
    for (const item of queued) {
      try {
        await drainItem(uid, item);
      } catch {
        // Leave the item for the next pass.
      }
    }
    await scorePendingContacts(uid);
  } finally {
    draining = false;
    announceCaptureWork();
  }
}
