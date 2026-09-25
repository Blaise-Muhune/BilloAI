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
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/components/auth-provider";
import { SupportLink } from "@/components/support";
import { Button, Field, SetupNotice, Steps } from "@/components/ui";
import { ensureUser, getUser, saveConsent } from "@/lib/data";
import { firebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";

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
  const { user, ready } = useAuth();
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
    if (ready && user) router.replace("/home");
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
    router.replace("/onboarding");
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
        router.replace("/home");
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

  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-col justify-center px-5 py-12">
      <p className="kicker text-accent">BilloAI</p>
      {mode === "signup" ? <Steps labels={["You", "Email"]} index={signupStep} /> : null}
      <h1 className="serif mt-2 text-4xl leading-tight">
        {mode === "login" ? "Welcome back" : signupStep === 0 ? "What should we call you?" : "Your email"}
      </h1>
      <p className="mt-3 text-muted">
        {mode === "login"
          ? "Free accounts can create events and enter contacts. Card reading, scoring, and follow-up drafts are on a paid plan."
          : signupStep === 0
            ? "Then you will set up your card and your first event."
            : "Use at least 8 characters. We will email a verification link."}
      </p>
      <div className="mt-8 space-y-4">
        {!configured ? <SetupNotice /> : null}
        {mode === "login" || signupStep === 0 ? (
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
            <span>
              I agree to the <Link href="/privacy" className="text-accent">privacy policy</Link> and{" "}
              <Link href="/terms" className="text-accent">terms</Link>. BilloAI may process my notes and card images to
              suggest follow-ups. Card photos are not stored. I send any message myself.
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
          <Link href="/login" className="font-semibold text-accent">
            Already have an account
          </Link>
        ) : (
          <Link href="/signup" className="font-semibold text-accent">
            Create an account
          </Link>
        )}
      </p>
    </main>
  );
}

export function AuthScreen({ mode }: { mode: "login" | "signup" }) {
  return (
    <AuthProvider>
      <AuthForm mode={mode} />
    </AuthProvider>
  );
}
