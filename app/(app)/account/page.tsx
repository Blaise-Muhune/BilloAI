"use client";

import { signOut } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { OverlayStatus } from "@/components/loading";
import { SupportLink } from "@/components/support";
import { Button, ErrorNote, PageHeader, PageWrap } from "@/components/ui";
import { getJson, patchJson, postJson } from "@/lib/api";
import { getPublicProfile, getUser, listContacts, listEvents, listTasks } from "@/lib/data";
import { userMessage } from "@/lib/errors";
import { firebaseAuth } from "@/lib/firebase/client";
import type { UserDoc } from "@/lib/types";
import { isInboxOwner } from "@/lib/support";
import { hasGroupWorkspace, hasTeamWorkspace, readWorkspace, workspaceChoices } from "@/lib/workspace";

export default function AccountPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [unsubscribed, setUnsubscribed] = useState(false);
  const [savingMail, setSavingMail] = useState(false);
  const [account, setAccount] = useState<UserDoc | null>(null);

  useEffect(() => {
    if (!user) return;
    void Promise.all([getJson<{ unsubscribed: boolean }>("/api/email/prefs").catch(() => null), getUser(user.uid)])
      .then(([prefs, next]) => {
        if (prefs) setUnsubscribed(prefs.unsubscribed);
        setAccount(next);
      })
      .catch(() => undefined);
  }, [user]);

  async function toggleMail() {
    setSavingMail(true);
    setError("");
    try {
      const next = !unsubscribed;
      await patchJson("/api/email/prefs", { unsubscribed: next });
      setUnsubscribed(next);
    } catch (err) {
      setError(userMessage(err, "Could not update email settings."));
    } finally {
      setSavingMail(false);
    }
  }

  async function exportData() {
    if (!user) return;
    setError("");
    setExporting(true);
    try {
      const [account, profile, events, contacts, tasks] = await Promise.all([
        getUser(user.uid),
        getPublicProfile(user.uid),
        listEvents(user.uid, { all: true }),
        listContacts(user.uid),
        listTasks(user.uid),
      ]);
      const blob = new Blob(
        [JSON.stringify({ exportedAt: new Date().toISOString(), account, profile, events, contacts, tasks }, null, 2)],
        { type: "application/json" },
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `billoai-export-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(userMessage(err, "Could not export."));
    } finally {
      setExporting(false);
    }
  }

  async function leave() {
    setError("");
    try {
      await signOut(firebaseAuth());
      router.replace("/login");
    } catch (err) {
      setError(userMessage(err, "Could not sign out."));
    }
  }

  async function removeAccount() {
    if (
      !user ||
      !window.confirm("This cancels open subscriptions, deletes your contacts and notes, and removes your login. This cannot be undone.")
    ) {
      return;
    }
    setPending(true);
    setError("");
    try {
      await postJson("/api/account/delete", {});
      await signOut(firebaseAuth());
      router.replace("/");
    } catch (err) {
      setError(userMessage(err, "Could not delete the account."));
      setPending(false);
    }
  }

  const workspaces = workspaceChoices(account);
  const currentWorkspace = readWorkspace(account?.workspace);
  const canAddGroup = !hasGroupWorkspace(account);
  const canAddTeam = !hasTeamWorkspace(account);

  return (
    <PageWrap>
      {pending ? <OverlayStatus label="Deleting your account" /> : null}
      {exporting ? <OverlayStatus label="Preparing your export" /> : null}
      <PageHeader
        kicker="Account"
        title="You and your data"
        body={
          workspaces.length > 1
            ? "Your card, plan, and sign out. Switch below for the job you are doing on this login."
            : "Your card, plan, and sign out. Same login if you later host a room, send people as a company, or run sales seats."
        }
        action={
          <Button type="button" tone="ghost" onClick={() => void leave()}>
            Sign out
          </Button>
        }
      />
      {canAddGroup || canAddTeam ? (
        <p className="text-sm leading-relaxed text-muted">
          {canAddGroup ? (
            <>
              <Link href="/group?for=event" className="font-semibold text-accent">
                Host an event
              </Link>
              {" — or "}
              <Link href="/group?for=company" className="font-semibold text-accent">
                send people as a company
              </Link>
              {". Same login."}
            </>
          ) : null}
          {canAddGroup && canAddTeam ? (
            <>
              <br />
            </>
          ) : null}
          {canAddTeam ? (
            <>
              <Link href="/team" className="font-semibold text-accent">
                Set up a sales team
              </Link>
              {" — year-round seats and one hunt."}
            </>
          ) : null}
        </p>
      ) : null}
      {workspaces.length > 1 ? (
        <section>
          <h2 className="serif text-3xl">Switch who you are acting as</h2>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Same login. You are not opening another account. One is you in the room. One is you paying for seats — as the host, or as a company sending people.
          </p>
          <div className="mt-5 grid gap-3" role="list">
            {workspaces.map((item) => {
              const here = item.id === currentWorkspace;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  role="listitem"
                  aria-current={here ? "page" : undefined}
                  className={`flex flex-col gap-3 p-5 transition sm:flex-row sm:items-center sm:justify-between ${
                    here ? "rounded-[1.6rem] bg-foreground text-card shadow-[0_16px_40px_rgb(40_28_12/0.14)]" : "surface hover:bg-[#f7f3ea]"
                  }`}
                >
                  <span className="min-w-0">
                    <span className={`kicker ${here ? "text-[#9ddec8]" : "text-accent"}`}>{here ? "Using this now" : "Switch to"}</span>
                    <span className="serif mt-2 block text-2xl leading-tight">{item.role}</span>
                    <span className={`mt-1 block text-sm ${here ? "text-white/70" : "text-muted"}`}>
                      {item.label} · {item.body}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-4 py-2 text-center text-sm font-semibold ${
                      here ? "bg-white/10 text-card" : "bg-accent text-accent-ink"
                    }`}
                  >
                    {here ? "You’re here" : "Switch"}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {(
          [
            ["/profile", "Your card", "The QR their phone camera can scan."],
            ["/billing", "Plan", "Individual, Team seats, or Group seats for one event"],
            ["/join", "Join", "Enter a code a company or host sent you"],
            isInboxOwner(user?.email) ? ["/admin", "Ops", "Accounts, seats, and contact messages"] : null,
          ] as ([string, string, string] | null)[]
        )
          .filter((item): item is [string, string, string] => Boolean(item))
          .map(([href, title, body]) => (
          <Link key={href} href={href} className="surface block p-6 transition hover:bg-[#f7f3ea]">
            <span className="block font-semibold">{title}</span>
            <span className="mt-1 block text-sm text-muted">{body}</span>
          </Link>
        ))}
      </div>
      {error ? <ErrorNote>{error}</ErrorNote> : null}
      <div className="surface flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">What matters emails</p>
          <p className="mt-1 text-sm text-muted">
            At most one a day, and only if something is due, leftover from last night, or a seat is sitting unused. We
            never email the people you met.
          </p>
        </div>
        <Button type="button" tone="ghost" busy={savingMail} onClick={() => void toggleMail()}>
          {unsubscribed ? "Turn emails back on" : "Stop these emails"}
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">This device</p>
            <p className="mt-1 text-sm text-muted">Sign out here. Your contacts stay on the account.</p>
          </div>
          <Button type="button" onClick={() => void leave()}>
            Sign out
          </Button>
        </div>
        <div className="surface flex flex-col gap-4 p-6">
          <div>
            <p className="font-semibold">Export or delete</p>
            <p className="mt-1 text-sm text-muted">
              Questions or a billing problem:{" "}
              <Link href="/contact" className="font-semibold text-accent">
                Contact
              </Link>
              {" · "}
              email <SupportLink />.{" "}
              <Link href="/privacy" className="font-semibold text-accent">
                Privacy
              </Link>
              {" · "}
              <Link href="/terms" className="font-semibold text-accent">
                Terms
              </Link>
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" tone="ghost" busy={exporting} onClick={() => void exportData()}>
              {exporting ? "Exporting…" : "Export my data"}
            </Button>
            <Button type="button" tone="ghost" busy={pending} onClick={() => void removeAccount()}>
              {pending ? "Deleting…" : "Delete account"}
            </Button>
          </div>
        </div>
      </div>
    </PageWrap>
  );
}
