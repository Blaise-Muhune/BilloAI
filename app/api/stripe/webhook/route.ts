import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import type Stripe from "stripe";
import { adminDb } from "@/lib/firebase/admin";
import { clampSeats } from "@/lib/pricing";
import { stripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

async function applySubscription(subscription: Stripe.Subscription) {
  const uid = subscription.metadata.uid;
  const plan = subscription.metadata.plan;
  if (!uid || (plan !== "individual" && plan !== "organizer")) return;
  const status =
    subscription.status === "active" || subscription.status === "trialing"
      ? "active"
      : subscription.status === "past_due"
        ? "past_due"
        : "canceled";
  const customer = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  await adminDb().collection("users").doc(uid).set(
    { plan: status === "canceled" ? "free" : plan, subscriptionStatus: status, stripeCustomerId: customer },
    { merge: true },
  );
}

async function applySeatPayment(session: Stripe.Checkout.Session) {
  const organizedEventId = session.metadata?.organizedEventId;
  const uid = session.metadata?.uid;
  const seats = clampSeats(Number(session.metadata?.seats || 0));
  if (!organizedEventId || !uid || seats < 1) return;

  const customer = typeof session.customer === "string" ? session.customer : session.customer?.id;
  if (customer) {
    const userRef = adminDb().collection("users").doc(uid);
    const current = await userRef.get();
    const currentPlan = current.data()?.plan;
    await userRef.set(
      {
        stripeCustomerId: customer,
        workspace: "group",
        ...(currentPlan === "individual" ? {} : { plan: "organizer" }),
      },
      { merge: true },
    );
  }

  const orgRef = adminDb().collection("organizedEvents").doc(organizedEventId);
  const payRef = orgRef.collection("payments").doc(session.id);
  await adminDb().runTransaction(async (tx) => {
    const pay = await tx.get(payRef);
    if (pay.exists) return;
    tx.set(payRef, { seats, uid, createdAt: new Date().toISOString() });
    tx.set(orgRef, { seatLimit: FieldValue.increment(seats) }, { merge: true });
  });
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook secret is not configured." }, { status: 500 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });

  const stripe = stripeClient();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    if (session.mode === "payment" && session.metadata?.plan === "organizer" && session.metadata.organizedEventId) {
      await applySeatPayment(session);
    }
    if (session.subscription) {
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await applySubscription(subscription);
    }
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    await applySubscription(event.data.object);
  }

  return NextResponse.json({ received: true });
}
