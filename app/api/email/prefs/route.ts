import { NextResponse } from "next/server";
import { adminDb, sessionFromRequest } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await sessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const user = await adminDb().collection("users").doc(session.uid).get();
  return NextResponse.json({ unsubscribed: Boolean(user.data()?.emailUnsubscribedAt) });
}

export async function PATCH(request: Request) {
  const session = await sessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const body = (await request.json()) as { unsubscribed?: boolean };
  await adminDb()
    .collection("users")
    .doc(session.uid)
    .set(
      { emailUnsubscribedAt: body.unsubscribed ? new Date().toISOString() : "" },
      { merge: true },
    );
  return NextResponse.json({ ok: true, unsubscribed: Boolean(body.unsubscribed) });
}
