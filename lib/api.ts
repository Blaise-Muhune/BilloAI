import { firebaseAuth } from "@/lib/firebase/client";

export class ApiError extends Error {
  status: number;
  eventName?: string;
  reason?: string;
  constructor(message: string, status: number, extra?: { eventName?: string; reason?: string }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.eventName = extra?.eventName;
    this.reason = extra?.reason;
  }
}

export function isPaywalled(error: unknown) {
  return error instanceof ApiError && error.status === 402;
}

async function readError(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as { error?: string; eventName?: string; reason?: string };
  throw new ApiError(payload.error || "Request failed.", response.status, {
    eventName: payload.eventName,
    reason: payload.reason,
  });
}

async function authHeaders(json = true) {
  const user = firebaseAuth().currentUser;
  if (!user) throw new Error("Sign in required.");
  const token = await user.getIdToken();
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

export async function getPublicJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) await readError(response);
  return (await response.json()) as T;
}

export async function postPublicJson<T>(path: string, body: unknown): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const user = firebaseAuth().currentUser;
  if (user) {
    try {
      headers.Authorization = `Bearer ${await user.getIdToken()}`;
    } catch {
      // Public routes still work without a session.
    }
  }
  const response = await fetch(path, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) await readError(response);
  return (await response.json()) as T;
}

export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { headers: await authHeaders(false) });
  if (!response.ok) await readError(response);
  return (await response.json()) as T;
}

export async function patchJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "PATCH",
    headers: await authHeaders(true),
    body: JSON.stringify(body),
  });
  if (!response.ok) await readError(response);
  return (await response.json()) as T;
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: await authHeaders(true),
    body: JSON.stringify(body),
  });
  if (!response.ok) await readError(response);
  return (await response.json()) as T;
}

export async function deleteJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { method: "DELETE", headers: await authHeaders(false) });
  if (!response.ok) await readError(response);
  return (await response.json()) as T;
}

export async function postForm<T>(path: string, body: FormData): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: await authHeaders(false),
    body,
  });
  if (!response.ok) await readError(response);
  return (await response.json()) as T;
}
