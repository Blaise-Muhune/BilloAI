import { NextResponse } from "next/server";
import { adminDb, sessionFromRequest } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await sessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  await adminDb().collection("users").doc(session.uid).set({ lastSeenAt: new Date().toISOString() }, { merge: true });
  return NextResponse.json({ ok: true });
}
