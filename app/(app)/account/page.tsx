"use client";

import { signOut } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { SupportLink } from "@/components/support";
import { Button, PageHeader, PageWrap } from "@/components/ui";
import { postJson } from "@/lib/api";
import { listContacts, listEvents, listTasks } from "@/lib/data";
import { firebaseAuth } from "@/lib/firebase/client";

export default function AccountPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function exportData() {
    if (!user) return;
    setError("");
    try {
      const [events, contacts, tasks] = await Promise.all([
        listEvents(user.uid, { all: true }),
        listContacts(user.uid),
        listTasks(user.uid),
      ]);
      const blob = new Blob([JSON.stringify({ events, contacts, tasks }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "billoai-export.json";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not export.");
    }
  }

  async function leave() {
    setError("");
    try {
      await signOut(firebaseAuth());
      router.replace("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign out.");
    }
  }

  async function removeAccount() {
    if (!user || !window.confirm("Delete your account, contacts, and notes?")) return;
    setPending(true);
    setError("");
    try {
      await postJson("/api/account/delete", {});
      await signOut(firebaseAuth());
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the account.");
      setPending(false);
    }
  }

  return (
    <PageWrap>
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
          ["/billing", "Plan", "Individual every event, or seats for one night"],
          ["/group", "Group", "Seats and counts for the people you pay for"],
          ["/join", "Join", "Enter a code a company or host sent you"],
        ].map(([href, title, body]) => (
          <Link key={href} href={href} className="surface block p-6 transition hover:bg-[#f7f3ea]">
            <span className="block font-semibold">{title}</span>
            <span className="mt-1 block text-sm text-muted">{body}</span>
          </Link>
        ))}
      </div>
      {error ? <p className="text-sm text-high">{error}</p> : null}
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
              Questions or a billing problem: email <SupportLink />.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" tone="ghost" onClick={() => void exportData()}>
              Export my data
            </Button>
            <Button type="button" tone="ghost" disabled={pending} onClick={() => void removeAccount()}>
              {pending ? "Deleting…" : "Delete account"}
            </Button>
          </div>
        </div>
      </div>
    </PageWrap>
  );
}
