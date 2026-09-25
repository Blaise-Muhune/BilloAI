import Link from "next/link";
import { SupportLink } from "@/components/support";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-lg space-y-4 px-5 py-12">
      <h1 className="serif text-4xl">Privacy policy</h1>
      <p>
        BilloAI stores the account you create and the events, contacts, notes, and tasks you add. Card photos are
        used to read the contact fields and are not stored. That contact information belongs to other people. You are
        responsible for having a reason to keep it.
      </p>
      <p>
        Card photos, voice notes, and typed notes are sent to our AI provider to extract fields, transcribe speech,
        structure the conversation, and draft a follow-up. Public lookup, when you turn it on, is limited to company
        and professional role information. It is not used to collect private, family, health, or home details.
      </p>
      <p>
        Follow-up drafts stay in your account until you copy them. BilloAI does not email, text, or message anyone for
        you.
      </p>
      <p>
        If you join an organizer event, the organizer can see how many seats are used. They cannot read your contacts,
        notes, or drafts. Your QR card shows only the name, company, title, email, LinkedIn, and website you put on it.
      </p>
      <p>You can export or delete your account from the account page.</p>
      <p>
        Questions about your data: email <SupportLink />.
      </p>
      <Link href="/" className="text-accent">
        Back
      </Link>
    </main>
  );
}
