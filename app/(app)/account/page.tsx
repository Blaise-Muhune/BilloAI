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

export default function AccountPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [unsubscribed, setUnsubscribed] = useState(false);
  const [savingMail, setSavingMail] = useState(false);

  useEffect(() => {
    if (!user) return;
    void getJson<{ unsubscribed: boolean }>("/api/email/prefs")
      .then((next) => setUnsubscribed(next.unsubscribed))
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

  return (
    <PageWrap>
      {pending ? <OverlayStatus label="Deleting your account" /> : null}
      {exporting ? <OverlayStatus label="Preparing your export" /> : null}
      <PageHeader
        kicker="Account"
        title="You and your data"
        body="Sign out on this device. Export is a copy of your events, contacts, and tasks. Delete also removes your login."
        action={
          <Button type="button" tone="ghost" onClick={() => void leave()}>
            Sign out
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          ["/profile", "Your card", "The QR other BilloAI users can scan"],
          ["/billing", "Plan", "Individual, Team seats, or Group seats for one event"],
          ["/team", "Team", "Year-round seats, the hunt list, and coverage counts"],
          ["/group", "Group", "Seats and counts for the people you pay for"],
          ["/join", "Join", "Enter a code a company or host sent you"],
        ].map(([href, title, body]) => (
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
