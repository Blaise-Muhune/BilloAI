import { NextResponse } from "next/server";
import { deleteProfilePhoto, isAzureBlobConfigured, uploadProfilePhoto } from "@/lib/azure-blob";
import { publicErrorMessage, reportServerError } from "@/lib/errors";
import { adminDb, sessionFromRequest } from "@/lib/firebase/admin";

export const runtime = "nodejs";

const MAX_BYTES = 2 * 1024 * 1024;
const WINDOW_MS = 60 * 60 * 1000;
const LIMIT = 12;

function sniffImage(bytes: Uint8Array) {
  if (bytes.length < 12) return "";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return "";
}

async function assertUploadLimit(uid: string) {
  const ref = adminDb().collection("rateLimits").doc(`photo:${uid}`);
  const now = Date.now();
  await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const start = Number(snap.data()?.windowStart ?? 0);
    const count = Number(snap.data()?.count ?? 0);
    if (now - start > WINDOW_MS) {
      tx.set(ref, { windowStart: now, count: 1 });
      return;
    }
    if (count >= LIMIT) throw new Error("Too many photo uploads. Try again in an hour.");
    tx.set(ref, { windowStart: start, count: count + 1 });
  });
}

export async function POST(request: Request) {
  const session = await sessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!isAzureBlobConfigured()) {
    return NextResponse.json({ error: "Photo storage is not set up yet." }, { status: 503 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a photo." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Use a photo under 2 MB." }, { status: 400 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = sniffImage(bytes);
  if (!contentType) return NextResponse.json({ error: "Use a JPEG, PNG, or WebP photo." }, { status: 400 });

  try {
    await assertUploadLimit(session.uid);
    const photoPath = await uploadProfilePhoto(session.uid, Buffer.from(bytes), contentType);
    const photoUpdatedAt = new Date().toISOString();
    await adminDb().collection("publicProfiles").doc(session.uid).set({ photoPath, photoUpdatedAt }, { merge: true });
    return NextResponse.json({ photoPath, photoUpdatedAt });
  } catch (error) {
    reportServerError("profile-photo-upload", error);
    return NextResponse.json({ error: publicErrorMessage(error, "Could not save that photo.") }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await sessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    await deleteProfilePhoto(session.uid);
    await adminDb().collection("publicProfiles").doc(session.uid).set({ photoPath: "", photoUpdatedAt: "" }, { merge: true });
    return NextResponse.json({ removed: true });
  } catch (error) {
    reportServerError("profile-photo-delete", error);
    return NextResponse.json({ error: publicErrorMessage(error, "Could not remove that photo.") }, { status: 500 });
  }
}
