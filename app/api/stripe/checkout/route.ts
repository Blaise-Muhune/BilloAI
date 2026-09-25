import { NextResponse } from "next/server";
import { adminDb, sessionFromRequest } from "@/lib/firebase/admin";
import { appOrigin, integrationId, stripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

function joinCode() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}

export async function POST(request: Request) {
  const session = await sessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!session.email_verified) {
    return NextResponse.json({ error: "Verify your email before subscribing." }, { status: 403 });
  }

  const body = (await request.json()) as {
    plan?: "individual" | "organizer";
    eventId?: string;
    seats?: number;
  };
  if (body.plan !== "individual" && body.plan !== "organizer") {
    return NextResponse.json({ error: "Choose a plan." }, { status: 400 });
  }

  try {
    const stripe = stripeClient();
    const userRef = adminDb().collection("users").doc(session.uid);
    const user = await userRef.get();
    const customerId = String(user.data()?.stripeCustomerId ?? "");
    let organizedEventId = "";

    if (body.plan === "organizer") {
      const seats = Number(body.seats);
      if (!body.eventId || !Number.isFinite(seats) || seats < 1 || seats > 500) {
        return NextResponse.json({ error: "Choose an event and a seat count from 1 to 500." }, { status: 400 });
      }
      const event = await adminDb().collection("events").doc(body.eventId).get();
      if (!event.exists || event.data()?.ownerId !== session.uid) {
        return NextResponse.json({ error: "That event was not found." }, { status: 404 });
      }
      const existing = await adminDb()
        .collection("organizedEvents")
        .where("organizerId", "==", session.uid)
        .where("eventId", "==", body.eventId)
        .limit(1)
        .get();
      if (existing.empty) {
        const created = await adminDb().collection("organizedEvents").add({
          organizerId: session.uid,
          eventId: body.eventId,
          name: event.data()?.name ?? "Event",
          seatLimit: 0,
          seatsUsed: 0,
          joinCode: joinCode(),
          createdAt: new Date().toISOString(),
        });
        organizedEventId = created.id;
      } else {
        organizedEventId = existing.docs[0]!.id;
      }
    }

    const price = body.plan === "individual" ? process.env.STRIPE_PRICE_INDIVIDUAL : process.env.STRIPE_PRICE_ORGANIZER;
    if (!price) return NextResponse.json({ error: "Stripe prices are not configured yet." }, { status: 500 });

    const origin = appOrigin(request);
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      client_reference_id: session.uid,
      customer: customerId || undefined,
      customer_email: customerId ? undefined : session.email,
      customer_update: customerId ? { address: "auto" } : undefined,
      billing_address_collection: customerId ? "required" : undefined,
      automatic_tax: { enabled: true },
      line_items: [{ price, quantity: body.plan === "organizer" ? Number(body.seats) : 1 }],
      success_url: `${origin}/billing?status=success`,
      cancel_url: `${origin}/billing?status=cancel`,
      metadata: { uid: session.uid, plan: body.plan, organizedEventId },
      subscription_data: { metadata: { uid: session.uid, plan: body.plan, organizedEventId } },
      integration_identifier: integrationId("billoai_checkout"),
    });

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start checkout.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
