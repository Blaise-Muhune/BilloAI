"use client";

import { sendEmailVerification, signOut } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { BootScreen, OverlayStatus } from "@/components/loading";
import { Button, Field, LiveCard, SelectField, Steps } from "@/components/ui";
import { postJson } from "@/lib/api";
import { createEvent, getPublicProfile, getUser, markOnboarded, savePublicProfile, saveWorkspace } from "@/lib/data";
import { todayISO } from "@/lib/dates";
import { firebaseAuth } from "@/lib/firebase/client";
import { GOAL_LABELS, NETWORKING_GOALS, type GroupKind, type NetworkingGoal, type PublicProfile } from "@/lib/types";
import {
  clearJoinCode,
  groupCopy,
  groupKindFromIntent,
  isGroupIntent,
  persistAuthContext,
  readJoinCode,
  readJoinFrom,
  readStoredIntent,
} from "@/lib/workspace";

const steps = ["Welcome", "Your card", "First event", "Stay connected", "Email"] as const;

export default function OnboardingPage() {
  return (
    <Suspense fallback={<BootScreen label="Setting up" />}>
      <OnboardingFlow />
    </Suspense>
  );
}

function OnboardingFlow() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [group, setGroup] = useState(isGroupIntent(params.get("for")));
  const [kind, setKind] = useState<GroupKind | "">(groupKindFromIntent(params.get("for")));
  const [invited, setInvited] = useState(params.get("join") === "1" || Boolean(params.get("code")));
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
    persistAuthContext({ for: params.get("for"), code: params.get("code"), from: params.get("from") });
    if (isGroupIntent(readStoredIntent())) {
      setGroup(true);
      setKind(groupKindFromIntent(readStoredIntent()) || readJoinFrom());
    }
    if (readJoinCode() || params.get("join") === "1") setInvited(true);
    if (readJoinFrom()) setKind(readJoinFrom());
  }, [params]);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const [account, card] = await Promise.all([getUser(user.uid), getPublicProfile(user.uid)]);
      if (account?.onboardedAt) {
        router.replace(group || isGroupIntent(readStoredIntent()) ? "/group" : invited || readJoinCode() ? `/join?code=${readJoinCode()}` : "/home");
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
  }, [user, router, group, invited]);

  async function finish(nextHref: string) {
    if (!user) return;
    setPending(true);
    setError("");
    try {
      if (group && !invited) await saveWorkspace(user.uid, "group", kind || undefined);
      const code = readJoinCode() || params.get("code")?.trim().toLowerCase() || "";
      if (code) {
        try {
          const result = await postJson<{ eventId: string }>("/api/join", { code });
          clearJoinCode();
          await markOnboarded(user.uid);
          router.replace(`/capture?event=${result.eventId}`);
          return;
        } catch {
          await markOnboarded(user.uid);
          router.replace(`/join?code=${encodeURIComponent(code)}`);
          return;
        }
      }
      await markOnboarded(user.uid);
      router.replace(nextHref);
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
      if (invited) {
        if (user.emailVerified) await finish("/home");
        else setStep(4);
        return;
      }
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your card.");
    } finally {
      setPending(false);
    }
  }

  async function saveEvent() {
    if (!user) return;
    if (!eventName.trim() || !location.trim()) {
      setError("Add the event name and where it is.");
      return;
    }
    if (!group && !goalDetail.trim()) {
      setError("Add the event name, where it is, and what success looks like.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const id = await createEvent(
        user.uid,
        {
          name: eventName,
          type: "Event",
          location,
          date,
          goal: group ? "customers" : goal,
          goalDetail: group ? "" : goalDetail,
          targetPeople: "",
          targetCompaniesOrRoles: "",
        },
        group ? { forSeats: true } : undefined,
      );
      setEventId(id);
      if (group) {
        if (user.emailVerified) await finish(`/billing?plan=organizer&event=${id}`);
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
  const copy = groupCopy(kind);
  const welcomeItems = invited
    ? [
        { n: "1", title: "Your card", body: "Name, company, and title. This is the only thing another user can scan." },
        { n: "2", title: "Join what they paid for", body: copy.joinBody },
      ]
    : group
      ? [
          { n: "1", title: "Who you are", body: "Your name on the account. People you pay for never see your private notes." },
          { n: "2", title: "The event", body: "Seats attach to this event. Then you pay once and share the join link." },
        ]
      : [
          { n: "1", title: "Your card", body: "Name, company, and title. This is the only thing another user can scan." },
          { n: "2", title: "The event and the goal", body: "Priority only works when BilloAI knows why you showed up." },
          { n: "3", title: "Stay connected", body: "We’ll show who fits why you went, and a note you can send yourself." },
        ];

  return (
    <div className="min-h-full lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(24rem,32rem)]">
      {pending ? <OverlayStatus label="Saving your setup" /> : null}
      <div className="flex min-h-full flex-col px-5 py-8 sm:px-10 lg:px-14 lg:py-12">
        <div className="flex items-center justify-between gap-4">
          <p className="serif text-2xl">BilloAI</p>
          <div className="flex items-center gap-4">
            <p className="kicker">
              Step {step + 1} of {last + 1}
            </p>
            <button
              type="button"
              className="text-sm font-semibold text-muted hover:text-foreground"
              onClick={async () => {
                await signOut(firebaseAuth());
                router.replace("/login");
              }}
            >
              Sign out
            </button>
          </div>
        </div>
        <div className="mt-6 flex gap-2" aria-label="Setup progress">
          {steps.slice(0, last + 1).map((label, index) => (
            <span key={label} className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-accent" : "bg-line"}`} />
          ))}
        </div>
        {error ? <p className="mt-4 text-sm text-high">{error}</p> : null}

        <div className="mt-8 flex flex-1 flex-col">
          {step === 0 ? (
            <section className="flex flex-1 flex-col">
              <h1 className="serif max-w-3xl text-4xl leading-[1.08] sm:text-5xl xl:text-[3.35rem]">
                {invited ? copy.joinTitle : group ? "Set up the group you are paying for." : "Set up BilloAI before the room gets loud."}
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-muted">
                {invited
                  ? copy.joinBody
                  : group
                    ? "Name the event, then buy seats for that event. You get a join link. You will not see who they meet."
                    : "Four short steps. After this you’ll know who from the event is worth staying connected to."}
              </p>
              <ol className={`mt-10 grid gap-4 ${group || invited ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}>
                {welcomeItems.map((item, index) => (
                  <li
                    key={item.n}
                    className={`rounded-[1.6rem] p-5 ${
                      index === 0 ? "bg-foreground text-card" : "border border-line bg-card"
                    }`}
                  >
                    <span className={`serif text-3xl ${index === 0 ? "text-[#9ddec8]" : "text-accent"}`}>{item.n}</span>
                    <span className="mt-3 block text-lg font-semibold">{item.title}</span>
                    <span className={`mt-2 block text-sm leading-relaxed ${index === 0 ? "text-white/70" : "text-muted"}`}>
                      {item.body}
                    </span>
                  </li>
                ))}
              </ol>
              <div className="mt-10">
                <Button type="button" className="w-full sm:w-auto sm:min-w-48" onClick={() => setStep(1)}>
                  Start setup
                </Button>
              </div>
            </section>
          ) : null}

          {step === 1 ? (
            <section className="max-w-3xl space-y-5">
              <div className="lg:hidden">
                <Steps labels={["Who you are", "Email"]} index={cardPart} />
              </div>
              <h1 className="serif text-4xl xl:text-5xl">{cardPart === 0 ? "Your card" : "Your email on the card"}</h1>
              <p className="text-muted">People who scan your BilloAI QR see only these fields. Notes stay private.</p>
              <div className="form-grid">
                {cardPart === 0 ? (
                  <>
                    <Field label="Name" value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} required />
                    <Field label="Company" value={profile.company} onChange={(event) => setProfile({ ...profile, company: event.target.value })} />
                    <Field label="Title" value={profile.title} onChange={(event) => setProfile({ ...profile, title: event.target.value })} className="lg:col-span-2" />
                  </>
                ) : (
                  <Field label="Email" type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} className="lg:col-span-2" />
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                {cardPart === 1 ? (
                  <Button type="button" tone="ghost" onClick={() => setCardPart(0)}>
                    Back
                  </Button>
                ) : null}
                {cardPart === 0 ? (
                  <Button
                    type="button"
                    className="min-w-40"
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
                ) : (
                  <Button type="button" className="min-w-40" busy={pending} onClick={() => void saveCard()}>
                    {pending ? "Saving…" : "Save card"}
                  </Button>
                )}
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="max-w-3xl space-y-5">
              {group ? null : (
                <div className="lg:hidden">
                  <Steps labels={["The event", "The goal"]} index={eventPart} />
                </div>
              )}
              <h1 className="serif text-4xl xl:text-5xl">
                {eventPart === 0
                  ? group
                    ? "The event seats attach to"
                    : "Your next event"
                  : "What does success look like?"}
              </h1>
              <p className="text-muted">
                {eventPart === 0
                  ? group
                    ? "Name the event. People you pay for set their own goal. You never see it."
                    : "Skip this if you are not heading to one yet."
                  : "This sentence is how we know who is worth staying connected to."}
              </p>
              {eventPart === 0 ? (
                <div className="form-grid">
                  <Field label="Event name" value={eventName} onChange={(event) => setEventName(event.target.value)} />
                  <Field label="Where" value={location} onChange={(event) => setLocation(event.target.value)} />
                  <Field label="Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
                </div>
              ) : (
                <div className="space-y-4">
                  <SelectField value={goal} onChange={(event) => setGoal(event.target.value as NetworkingGoal)} label="Goal">
                    {NETWORKING_GOALS.map((item) => (
                      <option key={item} value={item}>
                        {GOAL_LABELS[item]}
                      </option>
                    ))}
                  </SelectField>
                  <Field
                    label="In your own words"
                    value={goalDetail}
                    onChange={(event) => setGoalDetail(event.target.value)}
                    placeholder="Find operators who need automation"
                  />
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3">
                {eventPart === 1 ? (
                  <Button type="button" tone="ghost" onClick={() => setEventPart(0)}>
                    Back
                  </Button>
                ) : null}
                {eventPart === 0 ? (
                  <Button
                    type="button"
                    className="min-w-40"
                    busy={Boolean(pending && group)}
                    onClick={() => {
                      setError("");
                      if (group) void saveEvent();
                      else setEventPart(1);
                    }}
                  >
                    {group ? (pending ? "Saving…" : "Create event") : "Continue"}
                  </Button>
                ) : (
                  <Button type="button" className="min-w-40" busy={pending} onClick={() => void saveEvent()}>
                    {pending ? "Saving…" : "Create event"}
                  </Button>
                )}
                {group ? null : (
                  <button type="button" className="text-sm font-semibold text-muted" onClick={() => setStep(3)}>
                    Skip for now
                  </button>
                )}
              </div>
            </section>
          ) : null}

          {step === 3 ? (
            <section className="max-w-4xl space-y-6">
              <h1 className="serif text-4xl xl:text-5xl">Keep the people you meet</h1>
              <p className="max-w-2xl text-muted">Save them, say what you talked about, and see who is worth staying connected to.</p>
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-[1.6rem] bg-foreground p-6 text-card">
                  <p className="font-semibold">Save who you met</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/70">
                    A card photo is read, then discarded. We look them up in public so the match uses more than a name.
                  </p>
                </div>
                <div className="rounded-[1.6rem] border border-line bg-card p-6">
                  <p className="font-semibold">Say what you talked about</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">Type it or speak it. That conversation is how we know if they fit why you went.</p>
                </div>
                <div className="rounded-[1.6rem] border border-line bg-card p-6">
                  <p className="font-semibold">Stay connected if they fit</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">You’ll get a note you can send. Nothing goes out on its own.</p>
                </div>
              </div>
              <Button
                type="button"
                className="min-w-52"
                busy={pending}
                onClick={() => {
                  if (user?.emailVerified) void finish(eventId ? `/capture?event=${eventId}` : "/home");
                  else setStep(4);
                }}
              >
                {user?.emailVerified ? "Add someone you met" : "Continue"}
              </Button>
            </section>
          ) : null}

          {step === 4 ? (
            <section className="max-w-xl space-y-5">
              <h1 className="serif text-4xl xl:text-5xl">Verify your email</h1>
              <p className="text-muted">
                {group
                  ? `Verify ${user?.email || "your email"} so you can pay for seats.`
                  : invited
                    ? `Verify ${user?.email || "your email"}, then you will join what they set up for you.`
                    : `Your first event can match people you meet now. Verify ${user?.email || "your email"} before you pay or use that on later events.`}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  tone="ghost"
                  onClick={() => {
                    if (!user) return;
                    void sendEmailVerification(user).then(() => setSent(true));
                  }}
                >
                  {sent ? "Verification email sent" : "Send verification email"}
                </Button>
                <Button type="button" busy={pending} onClick={() => void finish(group ? (eventId ? `/billing?plan=organizer&event=${eventId}` : "/billing?plan=organizer") : eventId ? `/capture?event=${eventId}` : "/capture")}>
                  {pending ? "Finishing…" : group ? "Go pay for seats" : invited ? "Join" : "Add someone you met"}
                </Button>
              </div>
            </section>
          ) : null}
        </div>
      </div>
      <aside className="preview-pane hidden min-h-full flex-col justify-between px-10 py-12 text-card lg:flex">
        <div>
          <p className="kicker text-[#9ddec8]">{step < 2 ? "What others can scan" : "Why this event exists"}</p>
          <div className="mt-8">
            {step < 2 ? (
              <LiveCard
                name={profile.name || "Your name"}
                line={[profile.title, profile.company].filter(Boolean).join(" · ") || "Title and company"}
                footer={profile.email || user?.email || "Email on the card"}
              />
            ) : (
              <LiveCard
                kicker="This event"
                name={eventName || "Your next event"}
                line={`${location || "Place"}${date ? ` · ${date}` : ""}`}
                footer={group ? "Seats attach here. They set the goal." : goalDetail || GOAL_LABELS[goal]}
              />
            )}
          </div>
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-white/55">
          {group
            ? "You will see counts. You will not see their contacts, notes, or drafts."
            : invited
              ? copy.neverSee
              : "Notes stay private. The card is the only thing another BilloAI user can scan."}
        </p>
      </aside>
    </div>
  );
}
