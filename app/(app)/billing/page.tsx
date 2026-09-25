"use client";

import { sendEmailVerification } from "firebase/auth";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button, Field, Steps } from "@/components/ui";
import { postJson } from "@/lib/api";
import { getUser, listEvents } from "@/lib/data";
import { INDIVIDUAL_MONTHLY_USD, INDIVIDUAL_YEARLY_USD, ORGANIZER_SEAT_USD, usd } from "@/lib/pricing";
import type { EventRecord, UserDoc } from "@/lib/types";

function BillingForm() {
  const { user } = useAuth();
  const params = useSearchParams();
  const [account, setAccount] = useState<UserDoc | null>(null);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [eventId, setEventId] = useState("");
  const [seats, setSeats] = useState(25);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [planStep, setPlanStep] = useState<"choose" | "individual" | "organizer">("choose");
  const [interval, setInterval] = useState<"month" | "year">("month");
  const [seatStep, setSeatStep] = useState(0);
  const status = params.get("status");

  useEffect(() => {
    if (!user) return;
    void Promise.all([getUser(user.uid), listEvents(user.uid)]).then(([nextUser, nextEvents]) => {
      setAccount(nextUser);
      setEvents(nextEvents);
      setEventId(nextEvents[0]?.id ?? "");
    });
    if (params.get("plan") === "organizer") setPlanStep("organizer");
  }, [user, params]);

  async function checkout(plan: "individual" | "organizer") {
    setPending(true);
    setError("");
    try {
      const result = await postJson<{ url: string }>("/api/stripe/checkout", {
        plan,
        interval: plan === "individual" ? interval : undefined,
        eventId: plan === "organizer" ? eventId : undefined,
        seats: plan === "organizer" ? seats : undefined,
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
    <div className="space-y-6">
      <h1 className="serif text-4xl">Plans</h1>
      <p className="text-muted">
        Your first event includes card reading and drafts. After that, Individual is {usd(INDIVIDUAL_MONTHLY_USD)} a
        month, or {usd(INDIVIDUAL_YEARLY_USD)} a year. Organizer is {usd(ORGANIZER_SEAT_USD)} a seat for that event. You
        always send the message yourself.
      </p>
      {status === "success" ? <p className="text-sm text-accent">Checkout finished. Your plan updates after Stripe confirms it.</p> : null}
      {status === "cancel" ? <p className="text-sm text-muted">Checkout was canceled.</p> : null}
      {account ? (
        <p className="text-sm">
          Current plan: {account.plan}. Status: {account.subscriptionStatus}.
          {user && !user.emailVerified ? " Verify your email before you can subscribe." : ""}
        </p>
      ) : (
        <p className="text-muted">Loading plan…</p>
      )}
      {user && !user.emailVerified ? (
        <Button type="button" tone="ghost" onClick={() => void sendEmailVerification(user)}>
          Send verification email
        </Button>
      ) : null}
      {error ? <p className="text-sm text-high">{error}</p> : null}
      {planStep === "choose" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" className="surface p-4 text-left" onClick={() => setPlanStep("individual")}>
            <span className="block font-semibold">Individual</span>
            <span className="serif mt-2 block text-3xl">{usd(INDIVIDUAL_MONTHLY_USD)}</span>
            <span className="mt-1 block text-sm text-muted">per month after your first event. Or {usd(INDIVIDUAL_YEARLY_USD)} a year.</span>
          </button>
          <button type="button" className="surface p-4 text-left" onClick={() => setPlanStep("organizer")}>
            <span className="block font-semibold">Organizer</span>
            <span className="serif mt-2 block text-3xl">{usd(ORGANIZER_SEAT_USD)}</span>
            <span className="mt-1 block text-sm text-muted">per seat for that event. You never see attendee contacts.</span>
          </button>
        </div>
      ) : null}
      {planStep === "individual" ? (
        <section className="mx-auto max-w-xl space-y-3">
          <h2 className="serif text-3xl">Individual</h2>
          <p className="text-muted">Use your first event first. Then keep card reading and drafts on every event after that.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" className={`rounded-2xl border px-4 py-3 text-left ${interval === "month" ? "border-accent bg-white" : "border-line"}`} onClick={() => setInterval("month")}>
              <span className="block font-semibold">{usd(INDIVIDUAL_MONTHLY_USD)} a month</span>
            </button>
            <button type="button" className={`rounded-2xl border px-4 py-3 text-left ${interval === "year" ? "border-accent bg-white" : "border-line"}`} onClick={() => setInterval("year")}>
              <span className="block font-semibold">{usd(INDIVIDUAL_YEARLY_USD)} a year</span>
              <span className="text-sm text-muted">{usd(15)} a month if you pay the year</span>
            </button>
          </div>
          <div className="flex gap-3">
            <Button type="button" tone="ghost" onClick={() => setPlanStep("choose")}>
              Back
            </Button>
            <Button type="button" disabled={pending} onClick={() => void checkout("individual")}>
              {interval === "year" ? `Pay ${usd(INDIVIDUAL_YEARLY_USD)} for the year` : `Subscribe for ${usd(INDIVIDUAL_MONTHLY_USD)} a month`}
            </Button>
          </div>
        </section>
      ) : null}
      {planStep === "organizer" ? (
        <section className="mx-auto max-w-xl space-y-3">
          <Steps labels={["Event", "Seats"]} index={seatStep} />
          {seatStep === 0 ? (
            <>
              <h2 className="serif text-3xl">Which event?</h2>
              <label className="block text-sm">
                Event
                <select className="mt-1 w-full rounded-2xl border border-line bg-white px-3 py-3" value={eventId} onChange={(event) => setEventId(event.target.value)}>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex gap-3">
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
              <h2 className="serif text-3xl">How many seats?</h2>
              <p className="text-muted">{usd(ORGANIZER_SEAT_USD)} per seat, once, for this event.</p>
              <Field label="Seats" type="number" min={1} max={500} value={seats} onChange={(event) => setSeats(Number(event.target.value))} />
              <p className="serif text-3xl">
                {usd(Math.min(500, Math.max(1, seats || 0)) * ORGANIZER_SEAT_USD)}{" "}
                <span className="font-sans text-base text-muted">for {Math.min(500, Math.max(1, seats || 0))} seats</span>
              </p>
              <div className="flex gap-3">
                <Button type="button" tone="ghost" onClick={() => setSeatStep(0)}>
                  Back
                </Button>
                <Button type="button" disabled={pending || !eventId} onClick={() => void checkout("organizer")}>
                  Pay {usd(Math.min(500, Math.max(1, seats || 0)) * ORGANIZER_SEAT_USD)} for this event
                </Button>
              </div>
            </>
          )}
        </section>
      ) : null}
      <Button type="button" tone="ghost" onClick={() => void portal()}>
        Manage billing
      </Button>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <BillingForm />
    </Suspense>
  );
}
