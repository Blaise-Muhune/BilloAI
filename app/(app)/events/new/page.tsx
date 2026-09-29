"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { FormSplitSkeleton } from "@/components/loading";
import { EventForm } from "@/components/event-form";
import { postJson } from "@/lib/api";
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
      onSave={async (input, extras) => {
        if (!user) return;
        const id = await createEvent(user.uid, input, forGroup ? { forSeats: true } : undefined);
        if (!forGroup) {
          router.push(`/events/${id}`);
          return;
        }
        const checkout = await postJson<{ url: string }>("/api/stripe/checkout", {
          plan: "organizer",
          eventId: id,
          seats: extras?.seats ?? 25,
        });
        window.location.href = checkout.url;
      }}
    />
  );
}

export default function NewEventPage() {
  return (
    <Suspense fallback={<FormSplitSkeleton />}>
      <NewEventForm />
    </Suspense>
  );
}
