import { NextResponse } from "next/server";
import { publicErrorMessage, reportServerError } from "@/lib/errors";
import { adminDb, sessionFromRequest } from "@/lib/firebase/admin";
import { isOpsEmail } from "@/lib/ops";
import { clampSeats, clampTeamSeats, SEAT_MAX, SEAT_MIN, TEAM_SEAT_MAX, TEAM_SEAT_MIN } from "@/lib/pricing";
import { grantStaffGroupSeats, grantStaffProAccess } from "@/lib/staff-pro";
import { appOrigin, integrationId, stripeClient } from "@/lib/stripe";
import { joinCode, teamByAdmin } from "@/lib/team";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await sessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const staff = isOpsEmail(session.email);
  if (!session.email_verified && !staff) {
    return NextResponse.json({ error: "Verify your email before paying." }, { status: 403 });
  }

  const body = (await request.json()) as {
    plan?: "individual" | "organizer" | "team";
    interval?: "month" | "year";
    eventId?: string;
    seats?: number;
  };
  if (body.plan !== "individual" && body.plan !== "organizer" && body.plan !== "team") {
    return NextResponse.json({ error: "Choose a plan." }, { status: 400 });
  }

  try {
    const userRef = adminDb().collection("users").doc(session.uid);
    const user = await userRef.get();
    const customerId = String(user.data()?.stripeCustomerId ?? "");
    let organizedEventId = "";
    let teamId = "";

    if (body.plan === "organizer") {
      const seats = Number(body.seats);
      if (!body.eventId || !Number.isFinite(seats) || seats < SEAT_MIN || seats > SEAT_MAX) {
        return NextResponse.json({ error: "Choose an event and a seat count from 1 to 500." }, { status: 400 });
      }
      const event = await adminDb().collection("events").doc(body.eventId).get();
      if (!event.exists || event.data()?.ownerId !== session.uid) {
        return NextResponse.json({ error: "That event was not found." }, { status: 404 });
      }
      if (!event.data()?.forSeats) {
        return NextResponse.json({ error: "Choose the event those seats attach to, not one you captured for yourself." }, { status: 400 });
      }
      const existing = await adminDb()
        .collection("organizedEvents")
        .where("organizerId", "==", session.uid)
        .where("eventId", "==", body.eventId)
        .limit(1)
        .get();
      const eventData = event.data();
      if (existing.empty) {
        const created = await adminDb().collection("organizedEvents").add({
          organizerId: session.uid,
          eventId: body.eventId,
          name: eventData?.name ?? "Event",
          date: String(eventData?.date ?? ""),
          location: String(eventData?.location ?? ""),
          seatLimit: 0,
          seatsUsed: 0,
          joinCode: joinCode(),
          createdAt: new Date().toISOString(),
          groupKind: user.data()?.groupKind === "company" || user.data()?.groupKind === "event" ? user.data()?.groupKind : "",
        });
        organizedEventId = created.id;
      } else {
        organizedEventId = existing.docs[0]!.id;
        await existing.docs[0]!.ref.set(
          {
            name: eventData?.name ?? existing.docs[0]!.data().name,
            date: String(eventData?.date ?? existing.docs[0]!.data().date ?? ""),
            location: String(eventData?.location ?? existing.docs[0]!.data().location ?? ""),
          },
          { merge: true },
        );
      }
    }

    if (body.plan === "team") {
      if (!staff && user.data()?.plan === "team" && user.data()?.subscriptionStatus === "active") {
        return NextResponse.json({ error: "Change the seat count in Manage billing. Do not start a second Team checkout." }, { status: 400 });
      }
      const seats = Number(body.seats);
      if (!Number.isFinite(seats) || seats < TEAM_SEAT_MIN || seats > TEAM_SEAT_MAX) {
        return NextResponse.json({ error: `Team seats start at ${TEAM_SEAT_MIN}.` }, { status: 400 });
      }
      const existing = await teamByAdmin(session.uid);
      if (existing) {
        teamId = existing.id;
      } else {
        const created = await adminDb().collection("teams").add({
          adminUid: session.uid,
          name: String(user.data()?.name || "Team"),
          seatLimit: 0,
          stripeCustomerId: customerId,
          icp: "",
          targetCompanies: [],
          targetRoles: "",
          joinCode: joinCode(),
          createdAt: new Date().toISOString(),
        });
        teamId = created.id;
      }
    }

    const origin = appOrigin(request);
    if (staff) {
      await grantStaffProAccess({
        uid: session.uid,
        email: session.email,
        name: String(user.data()?.name || session.name || "Team"),
        teamSeats: body.plan === "team" ? clampTeamSeats(Number(body.seats)) : undefined,
      });
      if (body.plan === "organizer" && organizedEventId) {
        await grantStaffGroupSeats(session.uid, organizedEventId, Number(body.seats));
        return NextResponse.json({ url: `${origin}/group?status=success` });
      }
      if (body.plan === "team") {
        return NextResponse.json({ url: `${origin}/team?status=success` });
      }
      return NextResponse.json({ url: `${origin}/billing?status=success` });
    }

    const price =
      body.plan === "individual"
        ? body.interval === "year"
          ? process.env.STRIPE_PRICE_INDIVIDUAL_YEARLY
          : process.env.STRIPE_PRICE_INDIVIDUAL
        : body.plan === "team"
          ? body.interval === "month"
            ? process.env.STRIPE_PRICE_TEAM_MONTHLY
            : process.env.STRIPE_PRICE_TEAM_YEARLY
          : process.env.STRIPE_PRICE_ORGANIZER;
    if (!price) return NextResponse.json({ error: "Stripe prices are not configured yet." }, { status: 500 });

    const stripe = stripeClient();
    const quantity =
      body.plan === "organizer"
        ? clampSeats(Number(body.seats))
        : body.plan === "team"
          ? clampTeamSeats(Number(body.seats))
          : 1;
    const checkout = await stripe.checkout.sessions.create({
      mode: body.plan === "organizer" ? "payment" : "subscription",
      client_reference_id: session.uid,
      customer: customerId || undefined,
      customer_email: customerId ? undefined : session.email,
      customer_update: customerId ? { address: "auto", name: "auto" } : undefined,
      billing_address_collection: "required",
      automatic_tax: { enabled: true },
      line_items: [{ price, quantity }],
      success_url:
        body.plan === "organizer"
          ? `${origin}/group?status=success`
          : body.plan === "team"
            ? `${origin}/team?status=success`
            : `${origin}/billing?status=success`,
      cancel_url: `${origin}/billing?status=cancel`,
      metadata: {
        uid: session.uid,
        plan: body.plan,
        organizedEventId,
        teamId,
        seats: String(quantity),
      },
      subscription_data:
        body.plan === "individual" || body.plan === "team"
          ? { metadata: { uid: session.uid, plan: body.plan, teamId } }
          : undefined,
      integration_identifier: integrationId("billoai_checkout"),
    });

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    reportServerError("checkout", error);
    return NextResponse.json({ error: publicErrorMessage(error, "Could not start checkout.") }, { status: 500 });
  }
}
