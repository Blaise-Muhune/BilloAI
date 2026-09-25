import Link from "next/link";
import { SupportLink } from "@/components/support";
import { INDIVIDUAL_MONTHLY_USD, INDIVIDUAL_YEARLY_USD, ORGANIZER_SEAT_USD, usd } from "@/lib/pricing";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-lg space-y-4 px-5 py-12">
      <h1 className="serif text-4xl">Terms</h1>
      <p>
        BilloAI helps you remember who you met and decide who to follow up with. A free account can create events and
        enter contacts. Your first event includes card reading, transcription, public context, priority, and drafts.
        After that those tools require an individual subscription ({usd(INDIVIDUAL_MONTHLY_USD)} a month, or{" "}
        {usd(INDIVIDUAL_YEARLY_USD)} a year) or a seat on a paid organizer event ({usd(ORGANIZER_SEAT_USD)} a seat for
        that event).
      </p>
      <p>
        You review every draft and you send it yourself. You are responsible for the messages you send and for the
        contact details you store.
      </p>
      <p>
        Organizers pay {usd(ORGANIZER_SEAT_USD)} per seat once for that event. Buying seats does not give an organizer access to attendee contacts, notes, or
        follow-ups.
      </p>
      <p>Individual subscriptions renew until you cancel in the billing portal. Deleting your account removes your data from BilloAI.</p>
      <p>
        Questions about these terms: email <SupportLink />.
      </p>
      <Link href="/" className="text-accent">
        Back
      </Link>
    </main>
  );
}
