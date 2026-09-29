import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import type Stripe from "stripe";
import { adminDb } from "@/lib/firebase/admin";
import { clampSeats } from "@/lib/pricing";
import { stripeClient } from "@/lib/stripe";
import { ensureSeat, joinCode, teamByAdmin } from "@/lib/team";

export const runtime = "nodejs";

function subscriptionStatus(subscription: Stripe.Subscription) {
  return subscription.status === "active" || subscription.status === "trialing"
    ? "active"
    : subscription.status === "past_due"
      ? "past_due"
      : "canceled";
}

async function applyIndividual(subscription: Stripe.Subscription) {
  const uid = subscription.metadata.uid;
  if (!uid || subscription.metadata.plan !== "individual") return;
  const status = subscriptionStatus(subscription);
  const customer = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const user = await adminDb().collection("users").doc(uid).get();
  if (user.data()?.staffAccess) return;
  await adminDb().collection("users").doc(uid).set(
    { plan: status === "canceled" ? "free" : "individual", subscriptionStatus: status, stripeCustomerId: customer },
    { merge: true },
  );
}

async function applyTeamSubscription(subscription: Stripe.Subscription) {
  const uid = subscription.metadata.uid;
  if (!uid || subscription.metadata.plan !== "team") return;
  const already = await adminDb().collection("users").doc(uid).get();
  if (already.data()?.staffAccess) return;
  const status = subscriptionStatus(subscription);
  const customer = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const quantity = Number(subscription.items.data[0]?.quantity ?? subscription.metadata.seats ?? 0);
  const seatLimit = Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0;
  let teamId = subscription.metadata.teamId || "";
  const existing = teamId ? await adminDb().collection("teams").doc(teamId).get() : null;
  if (!existing?.exists) {
    const found = await teamByAdmin(uid);
    teamId = found?.id ?? "";
  }
  if (!teamId) {
    const user = await adminDb().collection("users").doc(uid).get();
    const created = await adminDb().collection("teams").add({
      adminUid: uid,
      name: String(user.data()?.name || "Team"),
      seatLimit,
      stripeCustomerId: customer,
      icp: "",
      targetCompanies: [],
      targetRoles: "",
      joinCode: joinCode(),
      createdAt: new Date().toISOString(),
    });
    teamId = created.id;
  } else {
    await adminDb().collection("teams").doc(teamId).set({ seatLimit, stripeCustomerId: customer }, { merge: true });
  }

  await adminDb().collection("users").doc(uid).set(
    {
      plan: status === "canceled" ? "free" : "team",
      subscriptionStatus: status,
      stripeCustomerId: customer,
      teamId,
      ...(status === "active" ? { workspace: "team" } : {}),
    },
    { merge: true },
  );

  if (status === "active") {
    const user = await adminDb().collection("users").doc(uid).get();
    await ensureSeat(teamId, String(user.data()?.email ?? ""), uid, "active");
  }
}

async function applySubscription(subscription: Stripe.Subscription) {
  if (subscription.metadata.plan === "team") {
    await applyTeamSubscription(subscription);
    return;
  }
  await applyIndividual(subscription);
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
        ...(currentPlan === "individual" || currentPlan === "team" ? {} : { plan: "organizer" }),
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
      if (!subscription.metadata.plan && session.metadata?.plan) {
        subscription.metadata.plan = session.metadata.plan;
        subscription.metadata.uid = session.metadata.uid || subscription.metadata.uid;
        subscription.metadata.teamId = session.metadata.teamId || subscription.metadata.teamId;
      }
      await applySubscription(subscription);
    }
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    await applySubscription(event.data.object);
  }

  return NextResponse.json({ received: true });
}
