"use client";

import { sendEmailVerification } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button, Field, Steps } from "@/components/ui";
import { createEvent, getPublicProfile, getUser, markOnboarded, savePublicProfile } from "@/lib/data";
import { todayISO } from "@/lib/dates";
import { GOAL_LABELS, NETWORKING_GOALS, type NetworkingGoal, type PublicProfile } from "@/lib/types";

const steps = ["Welcome", "Your card", "First event", "Capture", "Email"] as const;

export default function OnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [host, setHost] = useState(params.get("for") === "organizer");
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<PublicProfile>({
    name: "",
    company: "",
    title: "",
    email: "",
    linkedin: "",
    website: "",
  });
  const [eventName, setEventName] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState(todayISO());
  const [goal, setGoal] = useState<NetworkingGoal>("customers");
  const [goalDetail, setGoalDetail] = useState("");
  const [eventId, setEventId] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [cardPart, setCardPart] = useState(0);
  const [eventPart, setEventPart] = useState(0);

  useEffect(() => {
    if (sessionStorage.getItem("billo-intent") === "organizer") setHost(true);
  }, []);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const [account, card] = await Promise.all([getUser(user.uid), getPublicProfile(user.uid)]);
      if (account?.onboardedAt) {
        router.replace(host || sessionStorage.getItem("billo-intent") === "organizer" ? "/billing?plan=organizer" : "/home");
        return;
      }
      setProfile({
        name: card?.name || user.displayName || "",
        company: card?.company || "",
        title: card?.title || "",
        email: card?.email || user.email || "",
        linkedin: card?.linkedin || "",
        website: card?.website || "",
      });
      if (user.emailVerified) setStep((current) => (current === 4 ? 3 : current));
    })();
  }, [user, router]);

  async function finish(nextHref: string) {
    if (!user) return;
    setPending(true);
    setError("");
    try {
      await markOnboarded(user.uid);
      router.replace(host ? "/billing?plan=organizer" : nextHref);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not finish setup.");
      setPending(false);
    }
  }

  async function saveCard() {
    if (!user) return;
    if (!profile.name.trim()) {
      setError("Add the name people should see on your card.");
      return;
    }
    setPending(true);
    setError("");
    try {
      await savePublicProfile(user.uid, profile);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your card.");
    } finally {
      setPending(false);
    }
  }

  async function saveEvent() {
    if (!user) return;
    if (!eventName.trim() || !location.trim() || !goalDetail.trim()) {
      setError("Add the event name, where it is, and what success looks like.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const id = await createEvent(user.uid, {
        name: eventName,
        type: "Event",
        location,
        date,
        goal,
        goalDetail,
        targetPeople: "",
        targetCompaniesOrRoles: "",
      });
      setEventId(id);
      if (host) {
        if (user.emailVerified) await finish("/billing?plan=organizer");
        else setStep(4);
        return;
      }
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the event.");
    } finally {
      setPending(false);
    }
  }

  const last = user?.emailVerified ? 3 : 4;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex gap-2" aria-label="Setup progress">
        {steps.slice(0, last + 1).map((label, index) => (
          <span key={label} className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-accent" : "bg-line"}`} />
        ))}
      </div>
      <p className="kicker">
        Step {step + 1} of {last + 1}
      </p>
      {error ? <p className="text-sm text-high">{error}</p> : null}

      {step === 0 ? (
        <section className="space-y-4">
          <h1 className="serif text-4xl leading-tight">
            {host ? "Set up the event you are hosting." : "Set up BilloAI before the room gets loud."}
          </h1>
          <p className="text-muted">
            {host
              ? "Name the event, then buy seats. You will get a join code. You will not see who attendees meet."
              : "Four short steps. After this you can capture people and see who to follow up with."}
          </p>
          <ol className="space-y-3">
            <li className="rounded-3xl bg-foreground p-4 text-card">
              <span className="serif text-2xl text-[#9ddec8]">1</span>
              <span className="mt-1 block font-semibold">{host ? "Who you are" : "Your card"}</span>
              <span className="mt-1 block text-sm text-white/75">
                {host ? "Your name on the account. Attendees never see your private notes." : "Name, company, and title. This is the only thing another user can scan."}
              </span>
            </li>
            <li className="rounded-3xl border border-dashed border-line p-4">
              <span className="serif text-2xl text-accent">2</span>
              <span className="mt-1 block font-semibold">{host ? "The event you are running" : "The event and the goal"}</span>
              <span className="mt-1 block text-sm text-muted">
                {host ? "Seats attach to this event. Then you pay once and share the code." : "Priority only works when BilloAI knows why you showed up."}
              </span>
            </li>
            {host ? null : (
            <li className="rounded-3xl border border-dashed border-line p-4">
              <span className="serif text-2xl text-accent">3</span>
              <span className="mt-1 block font-semibold">How a capture works</span>
              <span className="mt-1 block text-sm text-muted">Scan a card, add what you talked about, then copy the follow-up yourself.</span>
            </li>
            )}
          </ol>
          <Button type="button" className="w-full" onClick={() => setStep(1)}>
            Start
          </Button>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="space-y-4">
          <Steps labels={["Who you are", "Email"]} index={cardPart} />
          {cardPart === 0 ? (
            <>
              <h1 className="serif text-4xl">Your card</h1>
              <p className="text-muted">People who scan your BilloAI QR see only these fields. Notes stay private.</p>
              <Field label="Name" value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} required />
              <Field label="Company" value={profile.company} onChange={(event) => setProfile({ ...profile, company: event.target.value })} />
              <Field label="Title" value={profile.title} onChange={(event) => setProfile({ ...profile, title: event.target.value })} />
              <Button
                type="button"
                className="w-full"
                onClick={() => {
                  if (!profile.name.trim()) {
                    setError("Add the name people should see on your card.");
                    return;
                  }
                  setError("");
                  setCardPart(1);
                }}
              >
                Continue
              </Button>
            </>
          ) : (
            <>
              <h1 className="serif text-4xl">Your email on the card</h1>
              <Field label="Email" type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} />
              <div className="flex gap-3">
                <Button type="button" tone="ghost" onClick={() => setCardPart(0)}>
                  Back
                </Button>
                <Button type="button" className="flex-1" disabled={pending} onClick={() => void saveCard()}>
                  {pending ? "Saving…" : "Save card"}
                </Button>
              </div>
            </>
          )}
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-4">
          <Steps labels={["The event", "The goal"]} index={eventPart} />
          {eventPart === 0 ? (
            <>
              <h1 className="serif text-4xl">{host ? "The event you are hosting" : "Your next event"}</h1>
              <p className="text-muted">{host ? "Seats will attach to this event. You cannot skip this step." : "Skip this if you are not heading to one yet."}</p>
              <Field label="Event name" value={eventName} onChange={(event) => setEventName(event.target.value)} />
              <Field label="Where" value={location} onChange={(event) => setLocation(event.target.value)} />
              <Field label="Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              <Button
                type="button"
                className="w-full"
                onClick={() => {
                  setError("");
                  setEventPart(1);
                }}
              >
                Continue
              </Button>
            </>
          ) : (
            <>
              <h1 className="serif text-4xl">What does success look like?</h1>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-muted">Goal</span>
                <select
                  value={goal}
                  onChange={(event) => setGoal(event.target.value as NetworkingGoal)}
                  className="w-full rounded-2xl border border-line bg-white px-3 py-3"
                >
                  {NETWORKING_GOALS.map((item) => (
                    <option key={item} value={item}>
                      {GOAL_LABELS[item]}
                    </option>
                  ))}
                </select>
              </label>
              <Field label="In your own words" value={goalDetail} onChange={(event) => setGoalDetail(event.target.value)} placeholder="Find operators who need automation" />
              <div className="flex gap-3">
                <Button type="button" tone="ghost" onClick={() => setEventPart(0)}>
                  Back
                </Button>
                <Button type="button" className="flex-1" disabled={pending} onClick={() => void saveEvent()}>
                  {pending ? "Saving…" : "Create event"}
                </Button>
              </div>
            </>
          )}
          {host ? null : (
          <button type="button" className="w-full text-sm font-semibold text-muted" onClick={() => setStep(3)}>
            Skip for now
          </button>
          )}
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-4">
          <h1 className="serif text-4xl">At the event</h1>
          <p className="text-muted">One main action. The rest can wait until you need it.</p>
          <div className="rounded-3xl bg-foreground p-5 text-card">
            <p className="font-semibold">Scan a business card</p>
            <p className="mt-1 text-sm text-white/75">The photo is read, then discarded. We look up who they are in public so the score matches why you went.</p>
          </div>
          <div className="rounded-3xl border border-dashed border-line p-4">
            <p className="font-semibold">Add what you talked about</p>
            <p className="mt-1 text-sm text-muted">Type it or speak it. That note is what the priority is based on.</p>
          </div>
          <div className="rounded-3xl border border-dashed border-line p-4">
            <p className="font-semibold">Copy the follow-up</p>
            <p className="mt-1 text-sm text-muted">BilloAI drafts it. You send it. Nothing goes out on its own.</p>
          </div>
          <Button
            type="button"
            className="w-full"
            disabled={pending}
            onClick={() => {
              if (user?.emailVerified) void finish(eventId ? `/capture?event=${eventId}` : "/home");
              else setStep(4);
            }}
          >
            {user?.emailVerified ? "Go capture someone" : "Continue"}
          </Button>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="space-y-4">
          <h1 className="serif text-4xl">Verify your email</h1>
          <p className="text-muted">
            {host
              ? `Verify ${user?.email || "your email"} so you can pay for seats.`
              : `Your first event can use card reading now. Verify ${user?.email || "your email"} before you pay or use AI on later events.`}
          </p>
          <Button
            type="button"
            tone="ghost"
            className="w-full"
            onClick={() => {
              if (!user) return;
              void sendEmailVerification(user).then(() => setSent(true));
            }}
          >
            {sent ? "Verification email sent" : "Send verification email"}
          </Button>
          <Button type="button" className="w-full" disabled={pending} onClick={() => void finish(host ? "/billing?plan=organizer" : eventId ? `/capture?event=${eventId}` : "/capture")}>
            {pending ? "Finishing…" : host ? "Go pay for seats" : "Capture someone"}
          </Button>
        </section>
      ) : null}
    </div>
  );
}
