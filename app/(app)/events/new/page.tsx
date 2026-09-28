"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { EventForm } from "@/components/event-form";
import { createEvent } from "@/lib/data";

export default function NewEventPage() {
  const { user } = useAuth();
  const router = useRouter();

  return (
    <EventForm
      onSave={async (input) => {
        if (!user) return;
        const id = await createEvent(user.uid, input);
        router.push(`/events/${id}`);
      }}
    />
  );
}
