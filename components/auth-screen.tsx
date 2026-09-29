"use client";

import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getRedirectResult,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  updateProfile,
  type User,
} from "firebase/auth";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useId, useRef, useState } from "react";
import { AuthProvider, useAuth } from "@/components/auth-provider";
import { BrandLockup, BrandMark } from "@/components/brand";
import { AuthSkeleton, BootScreen } from "@/components/loading";
import { SupportLink } from "@/components/support";
import { Avatar, Button, ErrorNote, Field, PriorityBadge, SetupNotice, Steps } from "@/components/ui";
import { authEmailSettings } from "@/lib/auth-email";
import { ensureUser, getUser, saveConsent, saveWorkspace } from "@/lib/data";
import { firebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  groupCopy,
  groupKindFromIntent,
  isGroupIntent,
  isTeamIntent,
  pathAfterAuth,
  persistAuthContext,
  readStoredIntent,
  teamCopy,
} from "@/lib/workspace";

function messageFor(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
    return "That email and password do not match.";
  }
  if (code === "auth/email-already-in-use") return "That email already has an account. Sign in instead.";
  if (code === "auth/weak-password") return "Use at least 8 characters.";
  if (code === "auth/too-many-requests") return "Too many attempts. Wait a moment and try again.";
  if (code === "auth/popup-closed-by-user") return "Google sign-in was canceled.";
  if (code === "auth/account-exists-with-different-credential") {
    return "That email already uses a different sign-in method.";
  }
  if (code === "auth/unauthorized-domain") return "This site is not allowed to use Google sign-in yet.";
  if (code === "permission-denied") return "Could not open your account. Try again.";
  return error instanceof Error ? error.message : "Could not sign in.";
}

function GoogleMark() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.09A6.97 6.97 0 0 1 5.48 12c0-.72.12-1.43.36-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.16-3.16C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" />
    </svg>
  );
}

const previewPeople = [
  { name: "Maya Chen", detail: "Ops director, Northline", level: "high" as const },
  { name: "Priya Shah", detail: "Plant manager, Ford supplier", level: "medium" as const },
  { name: "Jon Park", detail: "Recruiter, Apex Talent", level: "low" as const },
];

function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const { user, ready } = useAuth();
  const forParam = params.get("for");
  const fromKind = params.get("from");
  const joinCode = params.get("code");
  const group = isGroupIntent(forParam);
  const team = isTeamIntent(forParam) || fromKind === "team" || isTeamIntent(readStoredIntent());
  const hosted = group || team;
  const copy = team ? teamCopy() : groupCopy(groupKindFromIntent(forParam || fromKind || readStoredIntent()));
  const handingOff = useRef(false);
  const signingIn = useRef(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [signupStep, setSignupStep] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const errorId = useId();
  const configured = isFirebaseConfigured();

  useEffect(() => {
    persistAuthContext({ for: forParam, code: params.get("code"), from: params.get("from"), next: params.get("next") });
  }, [forParam, params]);

  useEffect(() => {
    if (!ready || !user || handingOff.current || signingIn.current) return;
    handingOff.current = true;
    void (async () => {
      try {
        await user.getIdToken();
        await ensureUser(user.uid, user.displayName || "You", user.email || "");
        const existing = await getUser(user.uid);
        const intent = readStoredIntent();
        if (isTeamIntent(intent)) {
          await saveWorkspace(user.uid, "team");
        } else if (isGroupIntent(intent)) {
          await saveWorkspace(user.uid, "group", existing?.groupKind || groupKindFromIntent(intent) || undefined);
        }
        router.replace(pathAfterAuth({ onboarded: Boolean(existing?.onboardedAt) }));
      } catch (err) {
        handingOff.current = false;
        setError(messageFor(err));
      }
    })();
  }, [ready, user, router]);

  useEffect(() => {
    if (!configured) return;
    void getRedirectResult(firebaseAuth())
      .then(async (result) => {
        if (!result?.user) return;
        await finishAccount(result.user, true);
      })
      .catch((err: unknown) => setError(messageFor(err)));
  }, [configured]);

  async function finishAccount(account: User, fromGoogle: boolean) {
    handingOff.current = true;
    const displayName = account.displayName || name || "You";
    const accountEmail = account.email || email;
    await account.getIdToken();
    await ensureUser(account.uid, displayName, accountEmail);
    const existing = await getUser(account.uid);
    if (!existing?.consentAt) await saveConsent(account.uid);
    if (!fromGoogle) await sendEmailVerification(account, authEmailSettings("/onboarding"));
    const intent = readStoredIntent();
    if (isTeamIntent(intent)) {
      await saveWorkspace(account.uid, "team");
    } else if (isGroupIntent(intent)) {
      await saveWorkspace(account.uid, "group", existing?.groupKind || groupKindFromIntent(intent) || undefined);
    }
    router.replace(pathAfterAuth({ onboarded: Boolean(existing?.onboardedAt) }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (mode === "signup" && !agreed) {
      setError("Agree to the privacy policy and terms first.");
      return;
    }
    setPending(true);
    signingIn.current = true;
    try {
      const auth = firebaseAuth();
      if (mode === "signup") {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(credential.user, { displayName: name });
        await finishAccount(credential.user, false);
        setNotice("Check your inbox for a BilloAI link. That is how we verify the account.");
      } else {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        await credential.user.getIdToken();
        await ensureUser(credential.user.uid, credential.user.displayName || "You", credential.user.email || email);
      }
    } catch (err) {
      handingOff.current = false;
      signingIn.current = false;
      setError(messageFor(err));
    } finally {
      setPending(false);
    }
  }

  async function google() {
    if (mode === "signup" && !agreed) {
      setError("Agree to the privacy policy and terms first.");
      return;
    }
    setError("");
    setPending(true);
    signingIn.current = true;
    const auth = firebaseAuth();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      const result = await signInWithPopup(auth, provider);
      await result.user.getIdToken();
      await finishAccount(result.user, true);
    } catch (err) {
      const code = errorCode(err);
      if (code === "auth/popup-blocked") {
        await signInWithRedirect(auth, provider);
        return;
      }
      handingOff.current = false;
      signingIn.current = false;
      setError(messageFor(err));
      setPending(false);
    }
  }

  function errorCode(err: unknown) {
    return typeof err === "object" && err && "code" in err ? String(err.code) : "";
  }

  async function resetPassword() {
    setError("");
    setNotice("");
    if (!email) {
      setError("Enter your email first.");
      return;
    }
    try {
      await sendPasswordResetEmail(firebaseAuth(), email, authEmailSettings("/login"));
      setNotice("If that email has an account, a reset link is on its way.");
    } catch (err) {
      const code = errorCode(err);
      if (code === "auth/user-not-found") {
        setNotice("If that email has an account, a reset link is on its way.");
        return;
      }
      setError(messageFor(err));
    }
  }

  const flipQuery = new URLSearchParams();
  if (forParam) flipQuery.set("for", forParam);
  if (joinCode) flipQuery.set("code", joinCode);
  if (fromKind) flipQuery.set("from", fromKind);
  const flipSuffix = flipQuery.toString();
  const flipHref = `${mode === "signup" ? "/login" : "/signup"}${flipSuffix ? `?${flipSuffix}` : ""}`;

  const joining = Boolean(joinCode);
  const title =
    mode === "login" ? "Sign in" : signupStep === 0 ? "Create your account" : "Your email";
  const body =
    mode === "login"
      ? group
        ? "Then switch to Group, or stay here if this account already pays for seats."
        : team
          ? "Then switch to Team, or stay here if this account already has seats."
          : "Your network stays on this account."
      : signupStep === 0
        ? joining
          ? "Then you join the seat they paid for."
          : group
            ? "You are setting up the group. You will see who used a seat and whether they followed through."
            : team
              ? "You are setting up the team. You will see coverage, and you can move a seat."
              : "Then we set up your card and the event you are walking into."
        : "At least 8 characters. We send a verification link from BilloAI.";

  if (!ready) return <AuthSkeleton />;
  if (user && !error) return <BootScreen label="Opening your account" />;

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex min-h-svh flex-col px-6 py-6 sm:px-10">
        <Link href="/" className="self-start">
          <BrandLockup />
        </Link>

        <div className="flex flex-1 items-center py-10">
          <div className="mx-auto w-full max-w-[22.5rem]">
            {mode === "signup" ? <Steps labels={["You", "Email"]} index={signupStep} /> : null}
            <h1 className="serif text-[2.35rem] leading-[1.08] tracking-tight">{title}</h1>
            <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">{body}</p>

            <div className="mt-8 space-y-4">
              {!configured ? <SetupNotice /> : null}

              {mode === "signup" ? (
                <label className="flex items-start gap-2.5 text-xs leading-relaxed text-muted">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={agreed}
                    onChange={(event) => setAgreed(event.target.checked)}
                  />
                  <span>
                    I am 18 or older and agree to the{" "}
                    <Link href="/privacy" className="font-semibold text-foreground">
                      privacy policy
                    </Link>{" "}
                    and{" "}
                    <Link href="/terms" className="font-semibold text-foreground">
                      terms
                    </Link>
                    .
                  </span>
                </label>
              ) : null}

              {mode === "login" || signupStep === 0 ? (
                <>
                  <Button
                    type="button"
                    tone="ghost"
                    className="flex w-full items-center justify-center gap-2.5 py-3"
                    busy={pending}
                    disabled={!configured || (mode === "signup" && !agreed)}
                    onClick={() => void google()}
                  >
                    <GoogleMark />
                    Continue with Google
                  </Button>
                  <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                    <span className="h-px flex-1 bg-line" />
                    or
                    <span className="h-px flex-1 bg-line" />
                  </div>
                </>
              ) : null}

              <form
                onSubmit={(event) => {
                  if (mode === "signup" && signupStep === 0) {
                    event.preventDefault();
                    if (!name.trim()) {
                      setError("Add your name.");
                      return;
                    }
                    setError("");
                    setSignupStep(1);
                    return;
                  }
                  void onSubmit(event);
                }}
                className="space-y-3.5"
              >
                {mode === "signup" && signupStep === 0 ? (
                  <Field
                    label="Name"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    invalid={Boolean(error)}
                    errorId={error ? errorId : undefined}
                  />
                ) : null}
                {mode === "login" || signupStep === 1 ? (
                  <>
                    <Field
                      label="Email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      invalid={Boolean(error)}
                      errorId={error ? errorId : undefined}
                    />
                    <Field
                      label="Password"
                      type="password"
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      minLength={8}
                      required
                      invalid={Boolean(error)}
                      errorId={error ? errorId : undefined}
                    />
                  </>
                ) : null}
                <ErrorNote id={errorId}>{error}</ErrorNote>
                {notice ? <p className="text-sm text-accent">{notice}</p> : null}
                <div className="flex gap-3 pt-1">
                  {mode === "signup" && signupStep === 1 ? (
                    <Button type="button" tone="ghost" onClick={() => setSignupStep(0)}>
                      Back
                    </Button>
                  ) : null}
                  <Button type="submit" busy={pending} disabled={!configured || (mode === "signup" && !agreed)} className="flex-1">
                    {pending
                      ? "Please wait…"
                      : mode === "signup" && signupStep === 0
                        ? "Continue"
                        : mode === "signup"
                          ? "Create account"
                          : "Sign in"}
                  </Button>
                </div>
              </form>

              {mode === "login" ? (
                <button type="button" onClick={() => void resetPassword()} className="text-sm font-semibold text-accent">
                  Forgot password
                </button>
              ) : null}

              <p className="text-xs leading-relaxed text-muted">
                By continuing you agree to the{" "}
                <Link href="/privacy" className="font-semibold text-foreground">
                  privacy policy
                </Link>{" "}
                and{" "}
                <Link href="/terms" className="font-semibold text-foreground">
                  terms
                </Link>
                . Card photos are not stored. You send every message.
              </p>
            </div>
          </div>
        </div>

        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          {mode === "signup" ? (
            <Link href={flipHref} className="font-semibold text-foreground hover:text-accent">
              Already have an account? Sign in
            </Link>
          ) : (
            <Link href={flipHref} className="font-semibold text-foreground hover:text-accent">
              New here? Create an account
            </Link>
          )}
          <span aria-hidden>·</span>
          <span>
            Help:{" "}
            <Link href="/contact" className="font-semibold text-foreground">
              Contact
            </Link>
            {" · "}
            <SupportLink />
          </span>
        </p>
      </div>

      <aside className="preview-pane relative hidden min-h-svh flex-col justify-between overflow-hidden px-10 py-10 text-card lg:flex xl:px-14 xl:py-12">
        <div>
          <div className="flex items-center gap-2.5">
            <BrandMark className="h-8 w-8" />
            <p className="kicker text-[#9ddec8]">{joining ? "Your seat" : hosted ? copy.kicker : "After the room"}</p>
          </div>
          <p className="serif mt-4 max-w-[14ch] text-5xl leading-[1.05] xl:text-[3.35rem]">
            {joining ? copy.joinTitle : hosted ? copy.overviewTitle : "Leave knowing who was worth the conversation."}
          </p>
          <p className="mt-5 max-w-md text-[0.95rem] leading-relaxed text-white/65">
            {joining
              ? copy.joinBody
              : hosted
                ? copy.overviewBody
                : "Say why you went. Keep who you met. Stay connected with the people who fit."}
          </p>
        </div>

        {joining ? (
          <div className="mt-10 max-w-md rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-6">
            <p className="text-sm leading-relaxed text-white/75">{copy.neverSee}</p>
            <p className="mt-4 text-sm text-white/45">They see that you used a seat. You keep capturing on your account.</p>
          </div>
        ) : hosted ? (
          <div className="mt-10 max-w-md rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9ddec8]">
              {team ? "Team · what you see" : "Group · what you see"}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-white/75">
              {team
                ? "Who has a seat, coverage, and when a company is already in play."
                : "Who used a seat, who captured someone, and whether they followed through."}
            </p>
          </div>
        ) : (
          <div className="landing-frame mt-10 w-full max-w-md overflow-hidden rounded-[1.5rem] border border-white/10 bg-card text-foreground">
            <div className="bg-foreground px-5 py-4 text-card">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[#9ddec8]">This event</p>
              <p className="serif mt-1 text-2xl">Chamber mixer</p>
              <p className="mt-1 text-sm text-white/65">Find operators who need automation</p>
            </div>
            <div className="space-y-1 p-2">
              {previewPeople.map((person) => (
                <div
                  key={person.name}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${person.level === "high" ? "bg-[#f7f3ea]" : ""}`}
                >
                  <Avatar name={person.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{person.name}</span>
                    <span className="block truncate text-sm text-muted">{person.detail}</span>
                  </span>
                  <PriorityBadge level={person.level} />
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

export function AuthScreen({ mode }: { mode: "login" | "signup" }) {
  return (
    <AuthProvider>
      <Suspense fallback={<AuthSkeleton />}>
        <AuthForm mode={mode} />
      </Suspense>
    </AuthProvider>
  );
}
