import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { DecodedIdToken } from "firebase-admin/auth";

const googleJwks = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

function adminApp(): App {
  if (getApps().length) return getApps()[0]!;

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (json) {
    return initializeApp({
      credential: cert(JSON.parse(json) as Record<string, string>),
      projectId,
    });
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (clientEmail && privateKey && projectId) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
    });
  }

  if (projectId) {
    return initializeApp({ projectId });
  }

  throw new Error("Firebase Admin is not configured.");
}

export async function adminAuth() {
  const { getAuth } = await import("firebase-admin/auth");
  return getAuth(adminApp());
}

export function adminDb() {
  return getFirestore(adminApp());
}

export function adminBucket() {
  const configured = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  return getStorage(adminApp()).bucket(configured);
}

export async function sessionFromRequest(request: Request): Promise<DecodedIdToken | null> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!token || !projectId) return null;
  try {
    const { payload } = await jwtVerify(token, googleJwks, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });
    if (!payload.sub) return null;
    return { ...payload, uid: payload.sub } as DecodedIdToken;
  } catch {
    return null;
  }
}

export async function uidFromRequest(request: Request) {
  const session = await sessionFromRequest(request);
  return session?.uid ?? null;
}
