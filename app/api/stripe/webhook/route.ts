import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { adminDb } from "@/lib/firebase/admin";
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
      const customer = typeof session.customer === "string" ? session.customer : session.customer?.id;
      const seats = Number(session.metadata.seats || 0);
      if (customer && session.metadata.uid) {
        await adminDb()
          .collection("users")
          .doc(session.metadata.uid)
          .set({ stripeCustomerId: customer }, { merge: true });
      }
      if (seats > 0) {
        await adminDb()
          .collection("organizedEvents")
          .doc(session.metadata.organizedEventId)
          .set({ seatLimit: seats }, { merge: true });
      }
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
