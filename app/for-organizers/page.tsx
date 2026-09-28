import type { Metadata } from "next";
import Link from "next/link";
import { SupportLink } from "@/components/support";
import { ORGANIZER_SEAT_USD, usd } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "For groups",
  description: "Pay for a company, a sales team, or a room. They keep who they met. You see counts, never their contacts.",
};

const steps = [
  { n: "1", title: "Create the group account", body: "Same sign-up. After you are in, switch to Group, or start from this page so you land there." },
  { n: "2", title: "Say who you are paying for", body: "A company or sales team, or a room you are hosting. The product is the same. The copy is not." },
  { n: "3", title: "Name the event or week", body: "Seats attach to that. Then pay once." },
  { n: "4", title: "Send one link", body: `${usd(ORGANIZER_SEAT_USD)} a seat. Your people open the link, create their own account, and keep who they met.` },
  { n: "5", title: "Watch counts, never names", body: "You see who joined and whether they stayed connected. You never see the contacts." },
];

export default function ForOrganizersPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-14">
      <p className="kicker text-accent">For a company, a team, or a room</p>
      <h1 className="serif mt-3 text-5xl leading-[1.05]">Pay for the seats. Never see who they met.</h1>
      <p className="mt-4 text-lg text-muted">
        Sales teams, company offsites, chambers, hosts. One join link. Their conversations stay on their accounts.
      </p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link href="/signup?for=company" className="rounded-[1.4rem] bg-accent px-6 py-5 text-accent-ink">
          <span className="block text-sm font-semibold uppercase tracking-wide">Paying for people</span>
          <span className="mt-2 block font-semibold">A company or sales team</span>
        </Link>
        <Link href="/signup?for=event" className="rounded-[1.4rem] border border-line bg-card px-6 py-5">
          <span className="block text-sm font-semibold uppercase tracking-wide text-muted">Hosting a night</span>
          <span className="mt-2 block font-semibold">A room or event</span>
        </Link>
      </div>
      <p className="mt-4 text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login?for=group" className="font-semibold text-accent">
          Sign in and switch to Group
        </Link>
        .
      </p>

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
        {usd(ORGANIZER_SEAT_USD)} a seat, once. You do not get a list of their contacts, notes, or drafts.
      </p>
      <p className="mt-3 text-sm">
        <Link href="/" className="font-semibold text-accent">BilloAI for individuals</Link>
        {" · "}
        <SupportLink />
      </p>
    </main>
  );
}
