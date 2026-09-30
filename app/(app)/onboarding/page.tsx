"use client";

import { signOut } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { BrandLockup } from "@/components/brand";
import { BootScreen, OverlayStatus } from "@/components/loading";
import { ProfilePhotoField } from "@/components/profile-photo-field";
import { Button, ErrorNote, Field, LiveCard, SelectField, Steps } from "@/components/ui";
import { postJson } from "@/lib/api";
import { userMessage } from "@/lib/errors";
import { createEvent, getPublicProfile, getUser, markOnboarded, savePublicProfile, saveWorkspace } from "@/lib/data";
import { todayISO } from "@/lib/dates";
import { firebaseAuth } from "@/lib/firebase/client";
import { emptyProfile, profilePhotoHref } from "@/lib/profile-links";
import { GOAL_LABELS, NETWORKING_GOALS, type GroupKind, type NetworkingGoal, type PublicProfile } from "@/lib/types";
import {
  clearJoinCode,
  consumeNextPath,
  groupCopy,
  groupKindFromIntent,
  isGroupIntent,
  isTeamIntent,
  persistAuthContext,
  readJoinCode,
  readJoinFrom,
  readStoredIntent,
  teamCopy,
} from "@/lib/workspace";

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
  const [team, setTeam] = useState(isTeamIntent(params.get("for")));
  const [kind, setKind] = useState<GroupKind | "">(groupKindFromIntent(params.get("for")));
  const [invited, setInvited] = useState(params.get("join") === "1" || Boolean(params.get("code")));
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<PublicProfile>(emptyProfile());
  const [eventName, setEventName] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState(todayISO());
  const [goal, setGoal] = useState<NetworkingGoal>("customers");
  const [goalDetail, setGoalDetail] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [cardPart, setCardPart] = useState(0);
  const [eventPart, setEventPart] = useState(0);

  useEffect(() => {
    persistAuthContext({ for: params.get("for"), code: params.get("code"), from: params.get("from") });
    if (isTeamIntent(readStoredIntent()) || params.get("from") === "team") {
      setTeam(true);
    }
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
        router.replace(
          consumeNextPath() ||
            (team || isTeamIntent(readStoredIntent())
              ? "/team"
              : group || isGroupIntent(readStoredIntent())
                ? "/group"
                : invited || readJoinCode()
                  ? `/join?code=${readJoinCode()}`
                  : "/home"),
        );
        return;
      }
      setProfile({
        ...emptyProfile(),
        ...card,
        name: card?.name || user.displayName || "",
        email: card?.email || user.email || "",
      });
    })();
  }, [user, router, group, team, invited]);

  async function finish(nextHref: string) {
    if (!user) return;
    setPending(true);
    setError("");
    try {
      if (team && !invited) await saveWorkspace(user.uid, "team");
      if (group && !invited) await saveWorkspace(user.uid, "group", kind || undefined);
      const code = readJoinCode() || params.get("code")?.trim().toLowerCase() || "";
      if (code) {
        try {
          await postJson("/api/join", { code });
          clearJoinCode();
          await markOnboarded(user.uid);
          router.replace("/home");
          return;
        } catch {
          await markOnboarded(user.uid);
          router.replace(`/join?code=${encodeURIComponent(code)}`);
          return;
        }
      }
      await markOnboarded(user.uid);
      router.replace(consumeNextPath() || nextHref);
    } catch (err) {
      setError(userMessage(err, "Could not finish setup."));
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
      await savePublicProfile(user.uid, profile).then(setProfile);
      if (invited) {
        await finish("/home");
        return;
      }
      if (team) {
        await finish("/billing?plan=team");
        return;
      }
      setStep(1);
    } catch (err) {
      setError(userMessage(err, "Could not save your card."));
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
      if (group) {
        await finish(`/billing?plan=organizer&event=${id}`);
        return;
      }
      await finish("/home");
    } catch (err) {
      setError(userMessage(err, "Could not create the event."));
    } finally {
      setPending(false);
    }
  }

  const copy = team ? teamCopy() : groupCopy(kind);
  const progress = invited || team ? ["Your card"] : ["Your card", group ? "The event" : "First event"];

  return (
    <div className="min-h-full lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(24rem,32rem)]">
      {pending ? <OverlayStatus label="Saving your setup" /> : null}
      <div className="flex min-h-full flex-col px-5 py-8 sm:px-10 lg:px-14 lg:py-12">
        <div className="flex items-center justify-between gap-4">
          <BrandLockup />
          <div className="flex items-center gap-4">
            <p className="kicker">
              Step {step + 1} of {progress.length}
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
          {progress.map((label, index) => (
            <span key={label} className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-accent" : "bg-line"}`} />
          ))}
        </div>
        {error ? <ErrorNote className="mt-4">{error}</ErrorNote> : null}

        <div className="mt-8 flex flex-1 flex-col">
          {step === 0 ? (
            <section className="max-w-3xl space-y-5">
              <div className="lg:hidden">
                <Steps labels={["Who you are", "Email"]} index={cardPart} />
              </div>
              <h1 className="serif text-4xl xl:text-5xl">{cardPart === 0 ? "Your card" : "How they reach you"}</h1>
              <p className="text-muted">People who scan your QR see this. A photo is optional. Add LinkedIn if you have it. More links later on Your card.</p>
              <div className="form-grid">
                {cardPart === 0 ? (
                  <>
                    {user ? (
                      <div className="lg:col-span-2">
                        <ProfilePhotoField
                          uid={user.uid}
                          photoUpdatedAt={profile.photoUpdatedAt}
                          onChange={(next) => setProfile((current) => ({ ...current, ...next }))}
                        />
                      </div>
                    ) : null}
                    <Field label="Name" value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} required />
                    <Field label="Company" value={profile.company} onChange={(event) => setProfile({ ...profile, company: event.target.value })} />
                    <Field label="Title" value={profile.title} onChange={(event) => setProfile({ ...profile, title: event.target.value })} className="lg:col-span-2" />
                  </>
                ) : (
                  <>
                    <Field label="Email" type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} />
                    <Field label="Cell" type="tel" inputMode="tel" autoComplete="tel" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} />
                    <Field label="LinkedIn" value={profile.linkedin} placeholder="linkedin.com/in/…" onChange={(event) => setProfile({ ...profile, linkedin: event.target.value })} />
                    <Field label="Website" value={profile.website} placeholder="yoursite.com" onChange={(event) => setProfile({ ...profile, website: event.target.value })} />
                  </>
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

          {step === 1 ? (
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
                    ? "Name the event they are attending. They set why they went. You see who used a seat."
                    : "Skip this if you are not heading to one yet."
                  : "This sentence is how we tell who is worth your time."}
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
                  <button type="button" className="text-sm font-semibold text-muted" onClick={() => void finish("/home")}>
                    Skip for now
                  </button>
                )}
              </div>
            </section>
          ) : null}
        </div>
      </div>
      <aside className="preview-pane hidden min-h-full flex-col justify-between px-10 py-12 text-card lg:flex">
        <div>
          <p className="kicker text-[#9ddec8]">{step === 0 ? "What others can scan" : "Why this event exists"}</p>
          <div className="mt-8">
            {step === 0 ? (
              <LiveCard
                name={profile.name || "Your name"}
                line={[profile.title, profile.company].filter(Boolean).join(" · ") || "Title and company"}
                footer={profile.email || user?.email || "Email on the card"}
                photoSrc={user && profile.photoUpdatedAt ? profilePhotoHref(user.uid, profile.photoUpdatedAt) : ""}
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
          {team
            ? "You see who has a seat, coverage, and which teammate already has a live company."
            : group
              ? "You see who used a seat, who captured someone, and whether they followed through."
              : invited
                ? copy.neverSee
                : step === 0
                  ? "The card is what another person can scan."
                  : "People you meet are matched to why you went. Ranking can wait until morning."}
        </p>
      </aside>
    </div>
  );
}
