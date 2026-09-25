import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { firebaseDb } from "@/lib/firebase/client";
import type {
  ContactDoc,
  ContactRecord,
  EventDoc,
  EventInput,
  EventRecord,
  OrganizedEventDoc,
  PublicProfile,
  TaskDoc,
  TaskRecord,
  UserDoc,
} from "@/lib/types";

function mapDoc<T>(id: string, data: T) {
  return { id, ...data };
}

function requireOwner<T extends { ownerId: string }>(record: T, uid: string) {
  if (record.ownerId !== uid) throw new Error("You do not have access to that.");
  return record;
}

export async function ensureUser(uid: string, name: string, email: string) {
  const db = firebaseDb();
  const existing = await getDoc(doc(db, "users", uid));
  if (existing.exists()) return;
  const createdAt = new Date().toISOString();
  const user: UserDoc = {
    name,
    email,
    createdAt,
    plan: "free",
    subscriptionStatus: "none",
    stripeCustomerId: "",
    consentAt: "",
  };
  const profile: PublicProfile = {
    name,
    company: "",
    title: "",
    email,
    linkedin: "",
    website: "",
  };
  await setDoc(doc(db, "users", uid), user);
  await setDoc(doc(db, "publicProfiles", uid), profile);
}

export async function getPublicProfile(uid: string) {
  const snap = await getDoc(doc(firebaseDb(), "publicProfiles", uid));
  if (!snap.exists()) return null;
  return snap.data() as PublicProfile;
}

export async function getUser(uid: string) {
  const snap = await getDoc(doc(firebaseDb(), "users", uid));
  if (!snap.exists()) return null;
  return snap.data() as UserDoc;
}

export async function saveConsent(uid: string) {
  await setDoc(doc(firebaseDb(), "users", uid), { consentAt: new Date().toISOString() }, { merge: true });
}

export async function markOnboarded(uid: string) {
  await setDoc(doc(firebaseDb(), "users", uid), { onboardedAt: new Date().toISOString() }, { merge: true });
}

export async function savePublicProfile(uid: string, profile: PublicProfile) {
  const db = firebaseDb();
  const userRef = doc(db, "users", uid);
  const existing = await getDoc(userRef);
  if (!existing.exists()) {
    await ensureUser(uid, profile.name, profile.email);
  } else {
    await setDoc(userRef, { name: profile.name, email: profile.email }, { merge: true });
  }
  await setDoc(doc(db, "publicProfiles", uid), profile);
}

export async function listEvents(uid: string) {
  const snap = await getDocs(query(collection(firebaseDb(), "events"), where("ownerId", "==", uid)));
  return snap.docs
    .map((item) => mapDoc(item.id, item.data() as EventDoc))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

export async function getEvent(uid: string, id: string) {
  const snap = await getDoc(doc(firebaseDb(), "events", id));
  if (!snap.exists()) return null;
  return requireOwner(mapDoc(snap.id, snap.data() as EventDoc), uid);
}

export async function createEvent(uid: string, input: EventInput) {
  const payload: EventDoc = {
    ...input,
    ownerId: uid,
    organizedEventId: "",
    createdAt: new Date().toISOString(),
  };
  const created = await addDoc(collection(firebaseDb(), "events"), payload);
  return created.id;
}

export async function listContacts(uid: string) {
  const snap = await getDocs(query(collection(firebaseDb(), "contacts"), where("ownerId", "==", uid)));
  return snap.docs
    .map((item) => mapDoc(item.id, item.data() as ContactDoc))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listContactsForEvent(uid: string, eventId: string) {
  const contacts = await listContacts(uid);
  return contacts.filter((contact) => contact.eventId === eventId);
}

export async function getContact(uid: string, id: string) {
  const snap = await getDoc(doc(firebaseDb(), "contacts", id));
  if (!snap.exists()) return null;
  return requireOwner(mapDoc(snap.id, snap.data() as ContactDoc), uid);
}

export async function createContact(uid: string, input: Omit<ContactDoc, "ownerId" | "createdAt" | "updatedAt">) {
  const now = new Date().toISOString();
  const payload: ContactDoc = { ...input, ownerId: uid, createdAt: now, updatedAt: now };
  const created = await addDoc(collection(firebaseDb(), "contacts"), payload);
  return created.id;
}

export async function updateContact(uid: string, id: string, patch: Partial<ContactDoc>) {
  const current = await getContact(uid, id);
  if (!current) throw new Error("Contact not found.");
  await updateDoc(doc(firebaseDb(), "contacts", id), { ...patch, updatedAt: new Date().toISOString() });
}

export async function listTasks(uid: string) {
  const snap = await getDocs(query(collection(firebaseDb(), "tasks"), where("ownerId", "==", uid)));
  return snap.docs
    .map((item) => mapDoc(item.id, item.data() as TaskDoc))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export async function openTaskForContact(uid: string, contactId: string) {
  const tasks = await listTasks(uid);
  return tasks.find((task) => task.contactId === contactId && task.status === "open") ?? null;
}

export async function createTask(uid: string, input: Omit<TaskDoc, "ownerId" | "createdAt" | "status">) {
  const payload: TaskDoc = {
    ...input,
    ownerId: uid,
    status: "open",
    createdAt: new Date().toISOString(),
  };
  const created = await addDoc(collection(firebaseDb(), "tasks"), payload);
  return created.id;
}

export async function updateTask(uid: string, id: string, patch: Partial<TaskDoc>) {
  const snap = await getDoc(doc(firebaseDb(), "tasks", id));
  if (!snap.exists()) throw new Error("Task not found.");
  requireOwner(snap.data() as TaskDoc, uid);
  await updateDoc(doc(firebaseDb(), "tasks", id), patch);
}

export async function listOrganizedEvents(uid: string) {
  const snap = await getDocs(
    query(collection(firebaseDb(), "organizedEvents"), where("organizerId", "==", uid)),
  );
  return snap.docs.map((item) => mapDoc(item.id, item.data() as OrganizedEventDoc));
}

export async function deleteOwnedData(uid: string) {
  const db = firebaseDb();
  for (const name of ["events", "contacts", "tasks"] as const) {
    const snap = await getDocs(query(collection(db, name), where("ownerId", "==", uid)));
    await Promise.all(snap.docs.map((item) => deleteDoc(item.ref)));
  }
  const organized = await getDocs(query(collection(db, "organizedEvents"), where("organizerId", "==", uid)));
  await Promise.all(organized.docs.map((item) => deleteDoc(item.ref)));
  await deleteDoc(doc(db, "users", uid));
  await deleteDoc(doc(db, "publicProfiles", uid));
}

export type { ContactRecord, EventRecord, TaskRecord };
