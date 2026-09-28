"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { EventForm } from "@/components/event-form";
import { createEvent, getUser } from "@/lib/data";

function NewEventForm() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [forGroup, setForGroup] = useState(params.get("for") === "group");

  useEffect(() => {
    if (params.get("for") === "group" || !user) return;
    void getUser(user.uid).then((account) => {
      if (account?.workspace === "group") setForGroup(true);
    });
  }, [user, params]);

  return (
    <EventForm
      key={forGroup ? "seats" : "network"}
      variant={forGroup ? "seats" : "network"}
      onSave={async (input) => {
        if (!user) return;
        const id = await createEvent(user.uid, input, forGroup ? { forSeats: true } : undefined);
        router.push(forGroup ? `/billing?plan=organizer&event=${id}` : `/events/${id}`);
      }}
    />
  );
}

export default function NewEventPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <NewEventForm />
    </Suspense>
  );
}
