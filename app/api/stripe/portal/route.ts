import { NextResponse } from "next/server";
import { adminDb, sessionFromRequest } from "@/lib/firebase/admin";
import { appOrigin, stripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await sessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const user = await adminDb().collection("users").doc(session.uid).get();
  const customerId = String(user.data()?.stripeCustomerId ?? "");
  if (!customerId) return NextResponse.json({ error: "No billing account yet." }, { status: 400 });
  const portal = await stripeClient().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appOrigin(request)}/billing`,
  });
  return NextResponse.json({ url: portal.url });
}
