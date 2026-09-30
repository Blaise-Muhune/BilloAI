import { announceCaptureQueue } from "@/lib/capture-events";
import type { ContactFields, ContactSource } from "@/lib/types";

const DB_NAME = "billo-capture";
const STORE = "queue";
const VERSION = 1;

export type CaptureQueueItem = {
  id: string;
  eventId: string;
  source: ContactSource;
  fields: ContactFields;
  rawNote: string;
  cardUid: string;
  allowPublicLookup: boolean;
  createdAt: string;
  contactId?: string;
  photo?: Blob;
  audio?: Blob;
  audioName?: string;
};

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open capture queue."));
  });
}

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T> | void) {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const store = tx.objectStore(STORE);
        const request = work(store);
        tx.oncomplete = () => {
          db.close();
          resolve((request ? request.result : undefined) as T);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error ?? new Error("Capture queue failed."));
        };
        if (request) {
          request.onerror = () => reject(request.error ?? new Error("Capture queue failed."));
        }
      }),
  );
}

export function newCaptureId() {
  return `cap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function putQueuedCapture(item: CaptureQueueItem) {
  await run("readwrite", (store) => store.put(item));
  announceCaptureQueue();
}

export async function getQueuedCapture(id: string) {
  return run<CaptureQueueItem | undefined>("readonly", (store) => store.get(id));
}

export async function listQueuedCaptures() {
  const items = await run<CaptureQueueItem[]>("readonly", (store) => store.getAll());
  return (items ?? []).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function deleteQueuedCapture(id: string) {
  await run("readwrite", (store) => store.delete(id));
  announceCaptureQueue();
}
