import Link from "next/link";
import { BrandHomeLink } from "@/components/brand";
import { SupportLink } from "@/components/support";
import { INDIVIDUAL_MONTHLY_USD, INDIVIDUAL_YEARLY_USD, ORGANIZER_SEAT_USD, usd } from "@/lib/pricing";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-lg space-y-4 px-5 py-12">
      <BrandHomeLink />
      <h1 className="serif pt-4 text-4xl">Terms</h1>
      <p>
        BilloAI helps you remember who you met and decide who is worth staying connected to. A free account can create events and
        enter contacts. Your first event includes card reading, transcription, public context, priority, and drafts.
        After that those tools require an individual subscription ({usd(INDIVIDUAL_MONTHLY_USD)} a month, or{" "}
        {usd(INDIVIDUAL_YEARLY_USD)} a year) or a seat a company or host paid for ({usd(ORGANIZER_SEAT_USD)} a seat for
        that named event).
      </p>
      <p>
        You review every draft and you send it yourself. You are responsible for the messages you send and for the
        contact details you store.
      </p>
      <p>
        Groups pay {usd(ORGANIZER_SEAT_USD)} per seat once for one event. Unused seats stay with that event. They do not
        move to a later event. Buying seats does not give the company or host access to contacts, notes, or drafts, and
        it does not cover the payer’s own matching. A seat is for that event only. Later events are Individual, or another
        seat purchase for that later event.
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
