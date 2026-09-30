import type { Metadata } from "next";
import Link from "next/link";
import { BrandHomeLink } from "@/components/brand";
import { SupportLink } from "@/components/support";
import { JsonLd } from "@/components/json-ld";
import { SkipLink } from "@/components/skip-link";
import { breadcrumbJsonLd, pageMeta } from "@/lib/seo";
import { INDIVIDUAL_MONTHLY_USD, INDIVIDUAL_YEARLY_USD, ORGANIZER_SEAT_USD, TEAM_SEAT_MIN, TEAM_SEAT_MONTHLY_USD, TEAM_SEAT_YEARLY_USD, usd } from "@/lib/pricing";

export const metadata: Metadata = pageMeta({
  title: "Terms",
  description:
    "BilloAI terms: first event included, Individual, Team seats, and Group seats for one event. You send every message.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <>
      <SkipLink />
      <main id="main" className="mx-auto max-w-lg space-y-4 px-5 py-12">
        <JsonLd
          data={breadcrumbJsonLd([
            { name: "BilloAI", path: "/" },
            { name: "Terms", path: "/terms" },
          ])}
        />
        <BrandHomeLink />
        <h1 className="serif pt-4 text-4xl">Terms</h1>
        <p className="text-sm text-muted">Effective September 29, 2026. By creating an account you agree to these terms and the privacy policy.</p>

        <h2 className="serif pt-4 text-2xl">The service</h2>
        <p>
          BilloAI helps you remember who you met and decide who is worth staying connected to. You must be 18 or older.
          A free account can create events and enter contacts. Your first event includes card reading, transcription,
          public context, priority, and drafts. After that those tools require an individual subscription (
          {usd(INDIVIDUAL_MONTHLY_USD)} a month, or {usd(INDIVIDUAL_YEARLY_USD)} a year), a Team seat (
          {usd(TEAM_SEAT_YEARLY_USD)} a seat a year, or {usd(TEAM_SEAT_MONTHLY_USD)} a month, minimum {TEAM_SEAT_MIN}),
          or a seat a company or host paid for ({usd(ORGANIZER_SEAT_USD)} a seat for that named event).
        </p>
        <p>
          You review every draft and you send it yourself. Scores and drafts can be wrong. You are responsible for the
          messages you send and for having a reason to keep someone else’s contact details. We may email you about due
          follow-ups, unused seats, or a Team invite. We do not email the people you met. You can stop those emails from
          Account.
        </p>

        <h2 className="serif pt-4 text-2xl">Plans</h2>
        <p>
          Groups pay {usd(ORGANIZER_SEAT_USD)} per seat once for one event. Unused seats stay with that event. They do
          not move to a later event. The payer can see who used a seat. Buying seats does not give them access to
          contacts, notes, or drafts, and it does not cover the payer’s own matching. A seat is for that event only.
          Later events are Individual, or another seat purchase for that later event.
        </p>
        <p>
          Team seats are a separate subscription from Group seats. Quantity is the seat count. The admin assigns emails,
          sees who has a seat, and can move a seat. Teammates never see another book’s names, notes, or drafts. They may
          see that a company is already in play, and which teammate has it. Coverage shown to the payer is who used a
          seat plus counts — never who they met. Revoking a seat does not delete that
          person’s book. Team and Individual subscriptions renew until you cancel in the billing portal. Group seats
          are a one-time charge. Unused seats are not refunded automatically. If a charge looks wrong, email{" "}
          <SupportLink />.
        </p>
        <p>
          Tax may be added at checkout from the address Stripe collects. Deleting your account cancels open
          subscriptions and removes your data from BilloAI.
        </p>

        <h2 className="serif pt-4 text-2xl">Use of the service</h2>
        <p>
          Do not use BilloAI to impersonate someone, to collect contacts you have no right to keep, or to try to read
          another person’s book. Quotes on the marketing site are composites that show the product, not verified
          reviews. We can update these terms on this page. The current version is the one that applies.
        </p>
        <p>
          Questions: use{" "}
          <Link href="/contact" className="font-semibold text-accent">
            Contact
          </Link>{" "}
          or email <SupportLink />.
        </p>
        <Link href="/" className="text-accent">
          Back
        </Link>
      </main>
    </>
  );
}
