import type { Metadata } from "next";
import Link from "next/link";
import { BrandHomeLink } from "@/components/brand";
import { SupportLink } from "@/components/support";
import { JsonLd } from "@/components/json-ld";
import { SkipLink } from "@/components/skip-link";
import { breadcrumbJsonLd, pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Privacy policy",
  description:
    "What BilloAI stores, who sees it, which companies process it, and that we never email the people you met. Card photos are not kept.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <>
      <SkipLink />
      <main id="main" className="mx-auto max-w-lg space-y-4 px-5 py-12">
        <JsonLd
          data={breadcrumbJsonLd([
            { name: "BilloAI", path: "/" },
            { name: "Privacy", path: "/privacy" },
          ])}
        />
        <BrandHomeLink />
        <h1 className="serif pt-4 text-4xl">Privacy policy</h1>
        <p className="text-sm text-muted">Effective September 29, 2026. BilloAI is the service at billoai.com.</p>

        <h2 className="serif pt-4 text-2xl">What we store</h2>
        <p>
          We store the account you create (name, email, plan) and the events, contacts, notes, drafts, and tasks you
          add. Your QR card stores only the name, company, title, email, LinkedIn, and website you put on it. Another
          signed-in BilloAI user who scans that card sees those fields. They do not see your notes or who else you met.
        </p>
        <p>
          Card photos are read on the spot and discarded. They are not saved to your account. Voice notes are sent to
          transcribe the line you spoke, then discarded. We keep the text you confirm.
        </p>

        <h2 className="serif pt-4 text-2xl">Who we send data to</h2>
        <p>
          Card photos, voice, notes, and public-page text go to our AI providers (OpenAI, and OpenRouter when Jev
          scores a fit) so we can extract fields, transcribe, look up public professional context, and draft a note.
          After a capture we look up public company and role context unless you turn that off on that person. That
          lookup is not used to collect private, family, health, or home details.
        </p>
        <p>
          Google Firebase holds your login and the records above. Stripe handles cards, invoices, and tax when you pay.
          Resend sends email to you. If you write us from the contact form, we store that message and email it to our
          support inbox so we can reply. Vercel hosts the site. We do not sell your personal information, and we do not
          email, text, or message the people you met.
        </p>

        <h2 className="serif pt-4 text-2xl">Email and sign-in</h2>
        <p>
          We may email you — not the people you met — when a follow-up is due, a seat is unused, or a Team invite is
          waiting. Stop those emails from Account, or from the link in the message. Firebase Auth keeps you signed in
          on this browser. We do not use advertising cookies or a tracker.
        </p>

        <h2 className="serif pt-4 text-2xl">Who else can see something</h2>
        <p>
          If you join a group a company or host paid for, that seat is for that event only. They can see that you used
          a seat (your name and email) and whether you captured or followed through. They cannot read your contacts,
          notes, or drafts, or see who you met. A Team admin can see who has a seat the same way, plus counts. A
          teammate may see that a company is already in play — never a contact name.
        </p>

        <h2 className="serif pt-4 text-2xl">Your choices</h2>
        <p>
          Export or delete from Account. Delete cancels open subscriptions, removes your contacts and notes, and
          deletes the login. You can turn off public lookup for a person when you save them, or when you score them
          again. Questions, or if someone under 18 has an account: use{" "}
          <Link href="/contact" className="font-semibold text-accent">
            Contact
          </Link>{" "}
          or email <SupportLink />. This service is for people 18 or older.
        </p>
        <p>
          We keep your data until you delete the account. If we change this policy we will update this page. The
          current version is the one that applies.
        </p>
        <Link href="/" className="text-accent">
          Back
        </Link>
      </main>
    </>
  );
}
