"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button, Field } from "@/components/ui";
import { postJson } from "@/lib/api";

function JoinForm() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [code, setCode] = useState(params.get("code") ?? "");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function join(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    setPending(true);
    setError("");
    try {
      const result = await postJson<{ eventId: string }>("/api/join", { code });
      router.push(`/events/${result.eventId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={join} className="space-y-4">
      <h1 className="serif text-4xl">Join an event</h1>
      <p className="text-muted">Use the code from the organizer. Your contacts stay visible only to you.</p>
      <Field label="Join code" value={code} onChange={(event) => setCode(event.target.value)} required />
      {error ? <p className="text-sm text-high">{error}</p> : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Joining…" : "Join"}
      </Button>
    </form>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <JoinForm />
    </Suspense>
  );
}
