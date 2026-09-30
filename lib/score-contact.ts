import { isPaywalled, postJson } from "@/lib/api";
import { addDays, todayISO } from "@/lib/dates";
import { createTask, getContact, getEvent, listContacts, openTaskForContact, updateContact, updateTask } from "@/lib/data";
import { skipFollowUp } from "@/lib/relevance";
import type { ContactFields, ContactRecord, TaskRecord, UnderstandResult } from "@/lib/types";

export function fieldsFromContact(contact: ContactFields): ContactFields {
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

export function contactNeedsScore(contact: ContactRecord) {
  if (contact.scoreStatus === "ready") return false;
  if (contact.scoreStatus === "pending" || contact.scoreStatus === "failed") return true;
  return !contact.relevance;
}

export async function applyUnderstandResult(
  uid: string,
  contact: ContactRecord,
  result: UnderstandResult,
  task: TaskRecord | null,
) {
  await updateContact(uid, contact.id, {
    structuredNote: result.structuredNote,
    enrichment: result.enrichment,
    relevance: result.relevance,
    alreadyInPlay: Boolean(result.alreadyInPlay),
    alreadyInPlayBy: result.alreadyInPlayBy ?? [],
    scoreStatus: "ready",
  });

  const edited = Boolean(task?.draftEditedAt);
  const title = result.structuredNote.followUpPromise || result.draft.title || result.relevance.suggestedAction;
  const due =
    result.draft.dueDate || (result.relevance.level === "high" ? todayISO() : addDays(todayISO(), 7));

  if (skipFollowUp(result.relevance)) {
    if (task && !edited) {
      await updateTask(uid, task.id, {
        channel: result.draft.channel,
        title: result.relevance.suggestedAction,
        draft: "",
        dueDate: due,
        contactName: contact.name || task.contactName,
      });
    }
    return;
  }

  if (task) {
    await updateTask(uid, task.id, {
      channel: result.draft.channel,
      title,
      dueDate: due,
      contactName: contact.name || task.contactName,
      ...(edited ? {} : { draft: result.draft.body }),
    });
    return;
  }

  if (result.draft.body.trim()) {
    await createTask(uid, {
      contactId: contact.id,
      eventId: contact.eventId,
      contactName: contact.name || "Contact",
      cardUid: contact.cardUid,
      channel: result.draft.channel,
      title,
      draft: result.draft.body,
      dueDate: due,
    });
  }
}

export async function scoreContact(uid: string, contactId: string, allowPublicLookup = true) {
  const contact = await getContact(uid, contactId);
  if (!contact) return;
  const event = await getEvent(uid, contact.eventId);
  if (!event) return;
  try {
    const result = await postJson<UnderstandResult>("/api/ai/understand", {
      event,
      contact: fieldsFromContact(contact),
      rawNote: contact.rawNote,
      allowPublicLookup,
    });
    const task = await openTaskForContact(uid, contact.id);
    await applyUnderstandResult(uid, contact, result, task);
  } catch (error) {
    await updateContact(uid, contact.id, { scoreStatus: isPaywalled(error) ? "failed" : "failed" }).catch(() => undefined);
    throw error;
  }
}

export async function scorePendingContacts(uid: string) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  const contacts = await listContacts(uid);
  for (const contact of contacts.filter(contactNeedsScore)) {
    try {
      await scoreContact(uid, contact.id);
    } catch {
      // Retry on the next drain.
    }
  }
}
