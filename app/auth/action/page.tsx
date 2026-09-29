"use client";

import {
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BrandLockup } from "@/components/brand";
import { AuthSkeleton } from "@/components/loading";
import { Button, ErrorNote, Field } from "@/components/ui";
import { safeAuthNext } from "@/lib/auth-email";
import { firebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";

function ActionBody() {
  const router = useRouter();
  const params = useSearchParams();
  const mode = params.get("mode") ?? "";
  const code = params.get("oobCode") ?? "";
  const next = safeAuthNext(params.get("next") ?? params.get("continueUrl"));
  const [status, setStatus] = useState<"working" | "form" | "done" | "error">(code ? "working" : "done");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setStatus("error");
      setMessage("This app is not configured yet.");
      return;
    }
    if (!code) {
      setStatus("done");
      setMessage("You can go back into BilloAI.");
      return;
    }
    const auth = firebaseAuth();
    void (async () => {
      try {
        if (mode === "resetPassword") {
          const account = await verifyPasswordResetCode(auth, code);
          setEmail(account);
          setStatus("form");
          return;
        }
        if (mode === "verifyEmail" || mode === "recoverEmail" || mode === "verifyAndChangeEmail" || mode === "revertSecondFactorAddition") {
          await applyActionCode(auth, code);
          await auth.currentUser?.reload();
          setStatus("done");
          setMessage(mode === "verifyEmail" ? "Your email is verified." : "That email change is done.");
          return;
        }
        const info = await checkActionCode(auth, code);
        await applyActionCode(auth, code);
        await auth.currentUser?.reload();
        setStatus("done");
        setMessage(info.operation === "PASSWORD_RESET" ? "You can sign in with the new password." : "That is done.");
      } catch {
        setStatus("error");
        setMessage("That link is expired or already used. Sign in and send a new one.");
      }
    })();
  }, [code, mode]);

  async function savePassword(event: React.FormEvent) {
    event.preventDefault();
    if (!code || password.length < 8) {
      setMessage("Use at least 8 characters.");
      return;
    }
    setPending(true);
    setMessage("");
    try {
      await confirmPasswordReset(firebaseAuth(), code, password);
      setStatus("done");
      setMessage("Password updated. Sign in with it.");
    } catch {
      setMessage("Could not update that password. Send a new reset email.");
    } finally {
      setPending(false);
    }
  }

  const title =
    status === "working"
      ? "Opening that link"
      : status === "form"
        ? "Choose a new password"
        : status === "error"
          ? "That link did not work"
          : mode === "resetPassword"
            ? "Password updated"
            : "You are verified";

  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col px-6 py-8">
      <Link href="/" className="self-start">
        <BrandLockup />
      </Link>
      <div className="flex flex-1 flex-col justify-center py-12">
        <p className="kicker">BilloAI</p>
        <h1 className="serif mt-2 text-4xl leading-tight">{title}</h1>
        {email && status === "form" ? <p className="mt-3 text-muted">{email}</p> : null}
        {status === "error" ? <ErrorNote className="mt-3">{message}</ErrorNote> : message ? <p className="mt-3 text-muted">{message}</p> : null}
        {status === "form" ? (
          <form onSubmit={(event) => void savePassword(event)} className="mt-6 space-y-4">
            <Field
              label="New password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />
            <Button type="submit" busy={pending} className="w-full">
              {pending ? "Saving…" : "Save password"}
            </Button>
          </form>
        ) : null}
        {status === "done" ? (
          <Button type="button" className="mt-6" onClick={() => router.replace(mode === "resetPassword" ? "/login" : next)}>
            {mode === "resetPassword" ? "Sign in" : "Continue"}
          </Button>
        ) : null}
        {status === "error" ? (
          <Link href="/login" className="mt-6 inline-flex font-semibold text-accent">
            Back to sign in
          </Link>
        ) : null}
      </div>
    </main>
  );
}

export default function AuthActionPage() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <ActionBody />
    </Suspense>
  );
}
