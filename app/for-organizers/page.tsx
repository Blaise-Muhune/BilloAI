import type { Metadata } from "next";
import Link from "next/link";
import { SupportLink } from "@/components/support";
import { ORGANIZER_SEAT_USD, usd } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "For organizers",
  description: "Pay for seats once. Attendees get follow-up tools. You see counts, not their contacts.",
};

const steps = [
  { n: "1", title: "Create your account", body: "Use the same sign-up. You are setting up the event, not scanning cards." },
  { n: "2", title: "Name the event", body: "Date, place, and what a good night looks like. Seats attach to this event." },
  { n: "3", title: "Pay for seats", body: `${usd(ORGANIZER_SEAT_USD)} a seat, once. That is what unlocks card reading and drafts for people who join.` },
  { n: "4", title: "Share the join code", body: "Put it on a slide, a badge table, or a QR to /join. They keep their own contacts." },
  { n: "5", title: "Watch the room, not the names", body: "Seats shows how many joined, captured someone, and finished a follow-up. You never see who they met." },
];

export default function ForOrganizersPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-14">
      <p className="kicker text-accent">The link to send a chamber or host</p>
      <h1 className="serif mt-3 text-5xl leading-[1.05]">Give the room a follow-up. Keep none of their contacts.</h1>
      <p className="mt-4 text-lg text-muted">
        You pay once for seats. Attendees leave knowing who mattered. You get counts that show the event worked.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/signup?for=organizer" className="rounded-full bg-accent px-6 py-3.5 text-base font-semibold text-accent-ink">
          Set up seats
        </Link>
        <Link href="/login?for=organizer" className="rounded-full border border-line bg-card px-6 py-3.5 text-base font-semibold">
          I already have an account
        </Link>
      </div>

      <ol className="mt-12 space-y-3">
        {steps.map((step, index) => (
          <li key={step.n} className={index === 0 ? "surface bg-foreground p-5 text-card" : "rounded-3xl border border-dashed border-line p-5"}>
            <p className={`serif text-3xl ${index === 0 ? "text-[#9ddec8]" : "text-accent"}`}>{step.n}</p>
            <h2 className="mt-2 font-semibold">{step.title}</h2>
            <p className={`mt-1 text-sm ${index === 0 ? "text-white/75" : "text-muted"}`}>{step.body}</p>
          </li>
        ))}
      </ol>

      <p className="mt-10 text-sm text-muted">
        {usd(ORGANIZER_SEAT_USD)} a seat for that event. You do not get a list of attendees’ contacts, notes, or drafts.
      </p>
      <p className="mt-3 text-sm">
        <Link href="/" className="font-semibold text-accent">BilloAI for individuals</Link>
        {" · "}
        <SupportLink />
      </p>
    </main>
  );
}
