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
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { AuthProvider, useAuth } from "@/components/auth-provider";
import { SupportLink } from "@/components/support";
import { Button, Field, SetupNotice, Steps } from "@/components/ui";
import { ensureUser, getUser, saveConsent, saveWorkspace } from "@/lib/data";
import { INDIVIDUAL_MONTHLY_USD, usd } from "@/lib/pricing";
import { firebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  groupCopy,
  groupKindFromIntent,
  isGroupIntent,
  pathAfterAuth,
  persistAuthContext,
  readStoredIntent,
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
  return error instanceof Error ? error.message : "Could not sign in.";
}

function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const { user, ready } = useAuth();
  const forParam = params.get("for");
  const group = isGroupIntent(forParam);
  const copy = groupCopy(groupKindFromIntent(forParam || readStoredIntent()));
  const handingOff = useRef(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [signupStep, setSignupStep] = useState(0);
  const configured = isFirebaseConfigured();

  useEffect(() => {
    persistAuthContext({ for: forParam, code: params.get("code"), from: params.get("from") });
  }, [forParam, params]);

  useEffect(() => {
    if (!ready || !user || handingOff.current) return;
    handingOff.current = true;
    void (async () => {
      await ensureUser(user.uid, user.displayName || "You", user.email || "");
      const existing = await getUser(user.uid);
      const intent = readStoredIntent();
      if (isGroupIntent(intent)) {
        await saveWorkspace(user.uid, "group", existing?.groupKind || groupKindFromIntent(intent) || undefined);
      }
      router.replace(pathAfterAuth({ onboarded: Boolean(existing?.onboardedAt) }));
    })();
  }, [ready, user, router]);

  useEffect(() => {
    if (!configured) return;
    void getRedirectResult(firebaseAuth())
      .then(async (result) => {
        if (!result?.user) return;
        const accepted = sessionStorage.getItem("billo-consent") === "1";
        if (accepted) setConsent(true);
        await finishAccount(result.user, true, accepted);
      })
      .catch((err: unknown) => setError(messageFor(err)));
  }, [configured]);

  async function finishAccount(account: User, fromGoogle: boolean, accepted = consent) {
    handingOff.current = true;
    const displayName = account.displayName || name || "You";
    const accountEmail = account.email || email;
    await ensureUser(account.uid, displayName, accountEmail);
    const existing = await getUser(account.uid);
    if (!existing?.consentAt) {
      if (!accepted) {
        await signOut(firebaseAuth());
        setError("Accept the privacy terms to create an account.");
        setPending(false);
        return;
      }
      await saveConsent(account.uid);
    }
    if (!fromGoogle) await sendEmailVerification(account);
    const intent = readStoredIntent();
    if (isGroupIntent(intent)) {
      await saveWorkspace(account.uid, "group", existing?.groupKind || groupKindFromIntent(intent) || undefined);
    }
    router.replace(pathAfterAuth({ onboarded: Boolean(existing?.onboardedAt) }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (mode === "signup" && !consent) {
      setError("Accept the privacy terms to create an account.");
      return;
    }
    setPending(true);
    try {
      const auth = firebaseAuth();
      if (mode === "signup") {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(credential.user, { displayName: name });
        await finishAccount(credential.user, false);
        setNotice("Check your email to verify the account before using AI features.");
      } else {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        await ensureUser(credential.user.uid, credential.user.displayName || "You", credential.user.email || email);
      }
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setPending(false);
    }
  }

  async function google() {
    setError("");
    if (mode === "signup" && !consent) {
      setError("Accept the privacy terms to create an account.");
      return;
    }
    setPending(true);
    const auth = firebaseAuth();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      const result = await signInWithPopup(auth, provider);
      await finishAccount(result.user, true);
    } catch (err) {
      const code = typeof err === "object" && err && "code" in err ? String(err.code) : "";
      if (code === "auth/popup-blocked") {
        if (consent) sessionStorage.setItem("billo-consent", "1");
        await signInWithRedirect(auth, provider);
        return;
      }
      setError(messageFor(err));
      setPending(false);
    }
  }

  async function resetPassword() {
    setError("");
    setNotice("");
    if (!email) {
      setError("Enter your email first.");
      return;
    }
    try {
      await sendPasswordResetEmail(firebaseAuth(), email);
      setNotice("If that email has an account, a reset link is on its way.");
    } catch (err) {
      const code = typeof err === "object" && err && "code" in err ? String(err.code) : "";
      if (code === "auth/user-not-found") {
        setNotice("If that email has an account, a reset link is on its way.");
        return;
      }
      setError(messageFor(err));
    }
  }

  const flipQuery = new URLSearchParams();
  if (forParam) flipQuery.set("for", forParam);
  const joinCode = params.get("code");
  const fromKind = params.get("from");
  if (joinCode) flipQuery.set("code", joinCode);
  if (fromKind) flipQuery.set("from", fromKind);
  const flipSuffix = flipQuery.toString();
  const flipHref = `${mode === "signup" ? "/login" : "/signup"}${flipSuffix ? `?${flipSuffix}` : ""}`;

  return (
    <div className="min-h-full lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(22rem,30rem)]">
      <main className="mx-auto flex w-full max-w-lg flex-col justify-center px-5 py-12 lg:max-w-none lg:px-16">
        <div className="mx-auto w-full max-w-md">
      <p className="kicker text-accent">BilloAI</p>
      {mode === "signup" ? <Steps labels={["You", "Email"]} index={signupStep} /> : null}
      <h1 className="serif mt-2 text-4xl leading-tight xl:text-5xl">
        {mode === "login" ? "Welcome back" : signupStep === 0 ? "What should we call you?" : "Your email"}
      </h1>
      <p className="mt-3 text-muted">
        {mode === "login"
          ? group
            ? "Switch to Group after you sign in, or continue here if this account already pays for seats."
            : `Your first event shows who from the room is worth staying connected to. After that it is ${usd(INDIVIDUAL_MONTHLY_USD)} a month.`
          : signupStep === 0
            ? group
              ? "Next you will name the event or week, then buy seats. You will not see who they met."
              : "Then you will set up your card and the event, so you know who from the night is worth staying connected to."
            : "Use at least 8 characters. We will email a verification link."}
      </p>
      <div className="mt-8 space-y-4">
        {!configured ? <SetupNotice /> : null}
        {mode === "login" || signupStep === 0 ? (
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
            <span>
              I agree to the <Link href="/privacy" className="text-accent">privacy policy</Link> and{" "}
              <Link href="/terms" className="text-accent">terms</Link>. BilloAI may process my notes and card images so I can
              stay connected with people I met. Card photos are not stored. I send any message myself.
            </span>
          </label>
        ) : null}
        {mode === "login" || signupStep === 0 ? (
          <>
            <Button type="button" tone="ghost" className="w-full" disabled={!configured || pending} onClick={() => void google()}>
              Continue with Google
            </Button>
            <p className="text-center text-sm text-muted">or use email</p>
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
              if (!consent) {
                setError("Accept the privacy terms to create an account.");
                return;
              }
              setError("");
              setSignupStep(1);
              return;
            }
            void onSubmit(event);
          }}
          className="space-y-4"
        >
          {mode === "signup" && signupStep === 0 ? (
            <Field label="Name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required />
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
              />
              <Field
                label="Password"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />
            </>
          ) : null}
          {error ? <p className="text-sm text-high">{error}</p> : null}
          {notice ? <p className="text-sm text-accent">{notice}</p> : null}
          <div className="flex gap-3">
            {mode === "signup" && signupStep === 1 ? (
              <Button type="button" tone="ghost" onClick={() => setSignupStep(0)}>
                Back
              </Button>
            ) : null}
            <Button type="submit" disabled={!configured || pending} className="flex-1">
              {pending ? "Please wait…" : mode === "signup" && signupStep === 0 ? "Continue" : mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </div>
        </form>
        {mode === "login" ? (
          <button type="button" onClick={() => void resetPassword()} className="text-sm font-semibold text-accent">
            Forgot password
          </button>
        ) : null}
      </div>
      <p className="mt-6 text-sm text-muted">
        Need help signing in? Email <SupportLink />.
      </p>
      <p className="mt-3 text-sm text-muted">
        {mode === "signup" ? (
          <Link href={flipHref} className="font-semibold text-accent">
            Already have an account
          </Link>
        ) : (
          <Link href={flipHref} className="font-semibold text-accent">
            Create an account
          </Link>
        )}
      </p>
        </div>
      </main>
      <aside className="preview-pane hidden min-h-full flex-col justify-between px-10 py-12 text-card lg:flex">
        <div>
          <p className="kicker text-[#9ddec8]">{group ? copy.kicker : "After the room"}</p>
          <p className="serif mt-6 text-5xl leading-tight">
            {group ? copy.overviewTitle : "Leave knowing who was worth the conversation."}
          </p>
          <p className="mt-6 max-w-sm text-white/70">
            {group
              ? copy.overviewBody
              : "Say why you went. Keep who you met. Stay connected with the people who fit. You send every message."}
          </p>
        </div>
        <p className="max-w-sm text-sm text-white/45">
          Card photos are read and discarded. The group paying for seats never sees who you met.
        </p>
      </aside>
    </div>
  );
}

export function AuthScreen({ mode }: { mode: "login" | "signup" }) {
  return (
    <AuthProvider>
      <Suspense fallback={<p className="px-5 py-10 text-muted">Loading…</p>}>
        <AuthForm mode={mode} />
      </Suspense>
    </AuthProvider>
  );
}
