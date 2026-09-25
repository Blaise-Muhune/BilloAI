"use client";

import { signOut } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { SupportLink } from "@/components/support";
import { Button } from "@/components/ui";
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
        listEvents(user.uid),
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
    <div className="space-y-5">
      <h1 className="serif text-4xl">Account</h1>
      <div className="grid gap-2">
        {[
          ["/profile", "Your card", "The QR other BilloAI users can scan"],
          ["/billing", "Plan", "Individual or organizer billing"],
          ["/organizer", "Seats", "How many seats an event has used"],
          ["/join", "Join", "Enter an organizer code"],
        ].map(([href, title, body]) => (
          <Link key={href} href={href} className="surface block p-4">
            <span className="block font-semibold">{title}</span>
            <span className="text-sm text-muted">{body}</span>
          </Link>
        ))}
      </div>
      <p className="text-muted">Export is a copy of your events, contacts, and tasks. Delete also removes your login.</p>
      {error ? <p className="text-sm text-high">{error}</p> : null}
      <Button type="button" tone="ghost" onClick={() => void exportData()}>
        Export my data
      </Button>
      <Button type="button" disabled={pending} onClick={() => void removeAccount()}>
        {pending ? "Deleting…" : "Delete account"}
      </Button>
      <p className="text-sm text-muted">
        Questions or a billing problem: email <SupportLink />.
      </p>
    </div>
  );
}
