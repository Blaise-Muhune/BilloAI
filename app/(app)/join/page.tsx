"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { BrandLockup } from "@/components/brand";
import { BusyBar, JoinBodySkeleton, JoinSkeleton, OverlayStatus } from "@/components/loading";
import { Avatar, Button, ErrorNote, Field, PageHeader, PageWrap } from "@/components/ui";
import { cardFaceSrc } from "@/lib/profile-links";
import { getJson, getPublicJson, postJson } from "@/lib/api";
import { userMessage } from "@/lib/errors";
import { persistAuthContext, clearJoinCode, groupCopy, readJoinFrom, teamCopy } from "@/lib/workspace";
import { formatDay } from "@/lib/dates";
import type { GroupKind } from "@/lib/types";

type Preview = { name: string; open: boolean; kind?: GroupKind | ""; own?: boolean; date?: string; location?: string; team?: boolean; hostUid?: string };

function JoinForm() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [code, setCode] = useState(params.get("code") ?? "");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [looking, setLooking] = useState(false);
  const fromParam = params.get("from");
  const kind: GroupKind | "" =
    preview?.kind || (fromParam === "company" || fromParam === "event" ? fromParam : readJoinFrom());
  const isTeam = Boolean(preview?.team || fromParam === "team");
  const copy = isTeam ? teamCopy() : groupCopy(kind);

  useEffect(() => {
    persistAuthContext({ code, from: fromParam });
  }, [code, fromParam]);

  useEffect(() => {
    const next = code.trim().toLowerCase();
    if (!next || next.length < 4) {
      setPreview(null);
      setLooking(false);
      return;
    }
    let cancel = false;
    setLooking(true);
    const timer = window.setTimeout(() => {
      const path = `/api/join?code=${encodeURIComponent(next)}`;
      const request = user ? getJson<Preview>(path) : getPublicJson<Preview>(path);
      void request
        .then((result) => {
          if (!cancel) {
            setPreview(result);
            setError("");
          }
        })
        .catch((err: unknown) => {
          if (!cancel) {
            setPreview(null);
            setError(userMessage(err, "That invite was not found."));
          }
        })
        .finally(() => {
          if (!cancel) setLooking(false);
        });
    }, 280);
    return () => {
      cancel = true;
      window.clearTimeout(timer);
    };
  }, [code, user]);

  const signupHref = useMemo(() => {
    const query = new URLSearchParams();
    if (code.trim()) query.set("code", code.trim().toLowerCase());
    if (isTeam) query.set("from", "team");
    else if (kind) query.set("from", kind);
    const suffix = query.toString();
    return suffix ? `/signup?${suffix}` : "/signup";
  }, [code, kind, isTeam]);

  const loginHref = useMemo(() => {
    const query = new URLSearchParams();
    if (code.trim()) query.set("code", code.trim().toLowerCase());
    if (isTeam) query.set("from", "team");
    else if (kind) query.set("from", kind);
    const suffix = query.toString();
    return suffix ? `/login?${suffix}` : "/login";
  }, [code, kind, isTeam]);

  async function join(event: React.FormEvent) {
    event.preventDefault();
    if (!user) {
      router.push(signupHref);
      return;
    }
    setPending(true);
    setError("");
    try {
      const result = await postJson<{ eventId?: string; team?: boolean }>("/api/join", { code });
      clearJoinCode();
      router.push(result.team ? "/home" : `/events/${result.eventId}`);
    } catch (err) {
      setError(userMessage(err, "Could not join."));
      setPending(false);
    }
  }

  const form = (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <form onSubmit={join} className="surface space-y-5 p-6 lg:p-8">
        <PageHeader
          kicker={preview?.name || copy.kicker}
          title={preview?.own ? (isTeam ? "This is your team" : "This is your group") : copy.joinTitle}
          body={
            preview?.own
              ? isTeam
                ? "Invite people by email, then send them this link. Joining it yourself would use a seat."
                : "Send the link to the people you are paying for. Joining it yourself would use a seat."
              : copy.joinBody
          }
        />
        <Field label="Join code" value={code} onChange={(event) => setCode(event.target.value)} required />
        {looking ? (
          <p className="flex items-center gap-3 text-sm text-muted">
            <BusyBar className="w-24" />
            Checking that code
          </p>
        ) : null}
        {preview && !preview.own ? (
          <div className="flex items-center gap-3 text-sm text-muted">
            {preview.hostUid ? <Avatar name={preview.name} photoSrc={cardFaceSrc(preview.hostUid)} /> : null}
            <p>
            {preview.name}
            {preview.date ? ` · ${formatDay(preview.date)}` : ""}
            {preview.location ? ` · ${preview.location}` : ""}
            {isTeam
              ? preview.open
                ? " · use the email that was invited"
                : " · this invite is not for your email"
              : preview.open
                ? " · seats open for this event"
                : " · no seats left for this event"}
            </p>
          </div>
        ) : null}
        {error ? <ErrorNote>{error}</ErrorNote> : null}
        {preview?.own ? (
          <Link href={isTeam ? "/team" : "/group"} className="inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink">
            {isTeam ? "Open team overview" : "Open group overview"}
          </Link>
        ) : user ? (
          <Button type="submit" busy={pending} disabled={preview ? !preview.open : false} className="min-w-40">
            {pending ? "Joining…" : preview ? `Join ${preview.name}` : "Join"}
          </Button>
        ) : (
          <div className="flex flex-wrap gap-3">
            <Link href={signupHref} className="inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink">
              Create an account
            </Link>
            <Link href={loginHref} className="inline-flex rounded-full border border-line px-5 py-2.5 text-sm font-semibold">
              I already have an account
            </Link>
          </div>
        )}
      </form>
      <aside className="rounded-[1.6rem] bg-foreground p-6 text-card">
        <p className="kicker text-[#9ddec8]">Your account</p>
        <p className="serif mt-3 text-3xl leading-tight">{copy.neverSee}</p>
        <p className="mt-4 text-sm leading-relaxed text-white/65">
          {isTeam
            ? "They see that you used a seat. Scoring uses the hunt they set. You keep capturing on your account."
            : "They see that you used a seat. You keep capturing and following up on your account. This seat is only for this event."}
        </p>
      </aside>
    </div>
  );

  if (!ready) {
    if (!user) {
      return (
        <div className="min-h-full">
          <header className="flex items-center justify-between px-5 py-5">
            <Link href="/">
              <BrandLockup />
            </Link>
          </header>
          <div className="mx-auto max-w-5xl px-5 pb-16">
            <JoinBodySkeleton />
          </div>
        </div>
      );
    }
    return (
      <PageWrap>
        <JoinBodySkeleton />
      </PageWrap>
    );
  }

  if (!user) {
    return (
      <div className="min-h-full">
        <header className="flex items-center justify-between px-5 py-5">
          <Link href="/">
            <BrandLockup />
          </Link>
          <Link href={loginHref} className="text-sm font-semibold text-accent">
            Sign in
          </Link>
        </header>
        <div className="mx-auto max-w-5xl px-5 pb-16">{form}</div>
      </div>
    );
  }

  return (
    <PageWrap>
      {pending ? <OverlayStatus label="Joining this event" /> : null}
      {form}
    </PageWrap>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<JoinSkeleton />}>
      <JoinForm />
    </Suspense>
  );
}
