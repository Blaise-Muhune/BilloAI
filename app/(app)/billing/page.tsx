"use client";

import { sendEmailVerification } from "firebase/auth";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { BillingBodySkeleton, BillingSkeleton, OverlayStatus } from "@/components/loading";
import { Button, Field, PageHeader, PageWrap, SelectField, Steps } from "@/components/ui";
import { postJson } from "@/lib/api";
import { getUser, listEvents, listOrganizedEvents } from "@/lib/data";
import {
  INDIVIDUAL_MONTHLY_USD,
  INDIVIDUAL_YEARLY_PER_MONTH_USD,
  INDIVIDUAL_YEARLY_USD,
  ORGANIZER_SEAT_USD,
  SEAT_MAX,
  SEAT_MIN,
  clampSeats,
  planLabel,
  seatsPrice,
  statusLabel,
  usd,
} from "@/lib/pricing";
import type { EventRecord, OrganizedEventDoc, UserDoc } from "@/lib/types";

type Organized = OrganizedEventDoc & { id: string };

function BillingForm() {
  const { user } = useAuth();
  const params = useSearchParams();
  const [account, setAccount] = useState<UserDoc | null>(null);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [organized, setOrganized] = useState<Organized[]>([]);
  const [eventId, setEventId] = useState("");
  const [seats, setSeats] = useState(25);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [planStep, setPlanStep] = useState<"choose" | "individual" | "organizer">("choose");
  const [interval, setInterval] = useState<"month" | "year">("month");
  const [seatStep, setSeatStep] = useState(0);
  const [ready, setReady] = useState(false);
  const status = params.get("status");
  const requestedEvent = params.get("event");
  const wantSeats = params.get("plan") === "organizer";

  useEffect(() => {
    if (!user) return;
    void Promise.all([getUser(user.uid), listEvents(user.uid, { seats: true }), listOrganizedEvents(user.uid)])
      .then(([nextUser, nextEvents, nextOrganized]) => {
        setAccount(nextUser);
        setEvents(nextEvents);
        setOrganized(nextOrganized);
        const chosen = nextEvents.find((item) => item.id === requestedEvent)?.id ?? nextEvents[0]?.id ?? "";
        setEventId(chosen);
        const paid = nextOrganized.find((item) => item.eventId === chosen)?.seatLimit ?? 0;
        setSeats(paid > 0 ? 10 : 25);
        if (wantSeats || nextUser?.workspace === "group") {
          setPlanStep("organizer");
          if (chosen && (requestedEvent || nextEvents.length <= 1)) setSeatStep(1);
        }
      })
      .finally(() => setReady(true));
  }, [user, params, requestedEvent, wantSeats]);

  const selected = events.find((item) => item.id === eventId);
  const existing = organized.find((item) => item.eventId === eventId);
  const paidSeats = existing?.seatLimit ?? 0;
  const count = clampSeats(seats);

  const organizerTitle = useMemo(() => {
    if (selected?.name) return paidSeats > 0 ? `Add seats for ${selected.name}` : `Seats for ${selected.name}`;
    return "Pay for this event";
  }, [paidSeats, selected?.name]);

  async function checkout(plan: "individual" | "organizer") {
    setPending(true);
    setError("");
    try {
      const result = await postJson<{ url: string }>("/api/stripe/checkout", {
        plan,
        interval: plan === "individual" ? interval : undefined,
        eventId: plan === "organizer" ? eventId : undefined,
        seats: plan === "organizer" ? count : undefined,
      });
      window.location.href = result.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
      setPending(false);
    }
  }

  async function portal() {
    setError("");
    try {
      const result = await postJson<{ url: string }>("/api/stripe/portal", {});
      window.location.href = result.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open billing.");
    }
  }

  return (
    <PageWrap>
      <PageHeader
        kicker={planStep === "organizer" ? "Seats" : "Plan"}
        title={planStep === "organizer" ? organizerTitle : "Keep seeing who is worth staying connected to"}
        body={
          planStep === "organizer"
            ? `Group seats are ${usd(ORGANIZER_SEAT_USD)} each, once, for one named event. People you pay for keep who they met. Unused seats stay with this event. Your own matching is Individual, or your first event.`
            : `Your first event includes matching. After that, Individual is ${usd(INDIVIDUAL_MONTHLY_USD)} a month, or ${usd(INDIVIDUAL_YEARLY_USD)} a year. Group seats are ${usd(ORGANIZER_SEAT_USD)} each for one event. You always send the message yourself.`
        }
      />
      {pending ? <OverlayStatus label="Taking you to checkout" /> : null}
      {status === "success" ? <p className="text-sm text-accent">Checkout finished. Your plan updates after Stripe confirms it.</p> : null}
      {status === "cancel" ? <p className="text-sm text-muted">Checkout was canceled.</p> : null}
      {!ready ? <BillingBodySkeleton /> : null}
      {ready && account ? (
        <p className="text-sm">
          Current plan: {planLabel(account.plan)}. Status: {statusLabel(account.subscriptionStatus)}.
          {user && !user.emailVerified ? " Verify your email before you can subscribe." : ""}
        </p>
      ) : null}
      {user && !user.emailVerified ? (
        <Button type="button" tone="ghost" onClick={() => void sendEmailVerification(user)}>
          Send verification email
        </Button>
      ) : null}
      {error ? <p className="text-sm text-high">{error}</p> : null}
      {ready && planStep === "choose" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <button type="button" className="surface p-7 text-left transition hover:bg-[#f7f3ea]" onClick={() => setPlanStep("individual")}>
            <span className="kicker">For you, every event</span>
            <span className="mt-3 block font-semibold">Individual</span>
            <span className="serif mt-3 block text-5xl">{usd(INDIVIDUAL_MONTHLY_USD)}</span>
            <span className="mt-2 block text-sm text-muted">
              per month after your first event. Or {usd(INDIVIDUAL_YEARLY_USD)} a year.
            </span>
            <span className="mt-6 block text-sm font-semibold text-accent">Choose Individual</span>
          </button>
          <button
            type="button"
            className="surface p-7 text-left transition hover:bg-[#f7f3ea]"
            onClick={() => {
              setPlanStep("organizer");
              setSeatStep(events.length <= 1 ? 1 : 0);
            }}
          >
            <span className="kicker">For one event</span>
            <span className="mt-3 block font-semibold">Group seats</span>
            <span className="serif mt-3 block text-5xl">{usd(ORGANIZER_SEAT_USD)}</span>
            <span className="mt-2 block text-sm text-muted">per seat, once, for that event. They keep who they met. You see counts.</span>
            <span className="mt-6 block text-sm font-semibold text-accent">Choose group seats</span>
          </button>
        </div>
      ) : null}
      {ready && planStep === "individual" ? (
        <section className="surface mx-auto max-w-2xl space-y-5 p-6 lg:p-8">
          <h2 className="serif text-3xl">Individual</h2>
          <p className="text-muted">
            Use your first event first. Then this covers every event after that, including events after a company or host paid for one seat.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" className={`rounded-2xl border px-4 py-4 text-left ${interval === "month" ? "border-accent bg-white" : "border-line"}`} onClick={() => setInterval("month")}>
              <span className="block font-semibold">{usd(INDIVIDUAL_MONTHLY_USD)} a month</span>
            </button>
            <button type="button" className={`rounded-2xl border px-4 py-4 text-left ${interval === "year" ? "border-accent bg-white" : "border-line"}`} onClick={() => setInterval("year")}>
              <span className="block font-semibold">{usd(INDIVIDUAL_YEARLY_USD)} a year</span>
              <span className="text-sm text-muted">{usd(INDIVIDUAL_YEARLY_PER_MONTH_USD)} a month if you pay the year</span>
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" tone="ghost" onClick={() => setPlanStep("choose")}>
              Back
            </Button>
            <Button type="button" busy={pending} onClick={() => void checkout("individual")}>
              {interval === "year" ? `Pay ${usd(INDIVIDUAL_YEARLY_USD)} for the year` : `Subscribe for ${usd(INDIVIDUAL_MONTHLY_USD)} a month`}
            </Button>
          </div>
        </section>
      ) : null}
      {ready && planStep === "organizer" ? (
        <section className="surface mx-auto max-w-2xl space-y-5 p-6 lg:p-8">
          <Steps labels={["Event", "Seats"]} index={Math.min(seatStep, events.length === 0 ? 0 : seatStep)} />
          {seatStep === 0 || events.length === 0 ? (
            <>
              <h2 className="serif text-3xl">Which event?</h2>
              <p className="text-muted">Seats attach to one named event. Not a month, and not every event after this.</p>
              {events.length === 0 ? (
                <p className="text-sm text-muted">
                  Create that first.{" "}
                  <Link href="/events/new?for=group" className="font-semibold text-accent">
                    Add an event
                  </Link>
                </p>
              ) : (
                <SelectField label="Event" value={eventId} onChange={(event) => setEventId(event.target.value)}>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </SelectField>
              )}
              <div className="flex flex-wrap gap-3">
                <Button type="button" tone="ghost" onClick={() => setPlanStep("choose")}>
                  Back
                </Button>
                <Button type="button" disabled={!eventId} onClick={() => setSeatStep(1)}>
                  Continue
                </Button>
              </div>
            </>
          ) : (
            <>
              <h2 className="serif text-3xl">{paidSeats > 0 ? "How many more seats?" : "How many seats?"}</h2>
              {paidSeats > 0 ? (
                <p className="text-muted">
                  {selected?.name} already has {paidSeats} seats. Unused ones stay here. This purchase adds more for the same event.
                </p>
              ) : (
                <p className="text-muted">
                  {usd(ORGANIZER_SEAT_USD)} per seat, once, for {selected?.name || "this event"}. Unused seats stay with this event.
                </p>
              )}
              <Field
                label="Seats"
                type="number"
                min={SEAT_MIN}
                max={SEAT_MAX}
                value={seats}
                onChange={(event) => setSeats(Number(event.target.value))}
              />
              <p className="serif text-4xl">
                {usd(seatsPrice(count))}{" "}
                <span className="font-sans text-base text-muted">
                  for {count} {paidSeats > 0 ? "more seats" : "seats"}
                </span>
              </p>
              <ul className="space-y-2 text-sm text-muted">
                <li>They keep who they met and set their own goal.</li>
                <li>You see counts. You never see names, notes, or drafts.</li>
                <li>Buying seats does not cover your own matching.</li>
                <li>The next event is Individual for them, or another seat purchase for that event.</li>
              </ul>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  tone="ghost"
                  onClick={() => {
                    if (events.length > 1) setSeatStep(0);
                    else setPlanStep("choose");
                  }}
                >
                  Back
                </Button>
                <Button type="button" busy={pending} disabled={!eventId} onClick={() => void checkout("organizer")}>
                  Pay {usd(seatsPrice(count))} for {paidSeats > 0 ? "more seats" : "these seats"}
                </Button>
              </div>
            </>
          )}
        </section>
      ) : null}
      {ready && planStep === "organizer" ? (
        <p className="text-sm text-muted">
          Going to events all year?{" "}
          <button type="button" className="font-semibold text-accent" onClick={() => setPlanStep("individual")}>
            Individual is the plan for each person
          </button>
          .
        </p>
      ) : null}
      {ready ? (
        <Button type="button" tone="ghost" onClick={() => void portal()}>
          Manage billing
        </Button>
      ) : null}
    </PageWrap>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<BillingSkeleton />}>
      <BillingForm />
    </Suspense>
  );
}
