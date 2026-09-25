import type { Metadata } from "next";
import Link from "next/link";
import { SupportLink } from "@/components/support";
import { INDIVIDUAL_MONTHLY_USD, INDIVIDUAL_YEARLY_USD, ORGANIZER_SEAT_USD, usd } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Know who to follow up with",
  description: "Set the goal for your event. BilloAI shows who matches it and drafts the follow-up. You send it.",
};

const steps = [
  {
    title: "Say why you are going",
    body: "Customers, partners, a job, or something else. That goal is how a contact gets marked high, medium, or low.",
  },
  {
    title: "Keep the person while you remember them",
    body: "Scan a card or type a name, then add what you talked about. We look them up in public and score them against your goal. The photo is not stored.",
  },
  {
    title: "Leave with the one follow-up that matters",
    body: "You get a draft for the people who fit the goal. You copy it and send it yourself.",
  },
];

const plans = [
  {
    name: "Free",
    price: usd(0),
    unit: "to start",
    body: "Create events and type contacts. Card reading and drafts on your first event.",
    href: "/signup",
    action: "Start free",
  },
  {
    name: "Individual",
    price: usd(INDIVIDUAL_MONTHLY_USD),
    unit: "per month",
    body: `After the first event, keep those tools on every event. ${usd(INDIVIDUAL_YEARLY_USD)} if you pay the year.`,
    href: "/signup",
    action: "Get Individual",
  },
  {
    name: "Organizer",
    price: usd(ORGANIZER_SEAT_USD),
    unit: "per seat, once, for that event",
    body: "Attendees get the paid tools for that event. You never see their contacts.",
    href: "/signup",
    action: "Get Organizer",
  },
];

export default function LandingPage() {
  return (
    <div className="mx-auto min-h-full max-w-5xl px-5">
      <header className="flex items-center justify-between py-5">
        <p className="serif text-2xl">BilloAI</p>
        <nav className="flex items-center gap-4 text-sm font-semibold">
          <Link href="/for-organizers" className="text-muted">
            For organizers
          </Link>
          <Link href="#pricing" className="text-muted">
            Pricing
          </Link>
          <Link href="/login" className="text-muted">
            Sign in
          </Link>
          <Link href="/signup" className="rounded-full bg-accent px-4 py-2 text-accent-ink">
            Start free
          </Link>
        </nav>
      </header>

      <main className="pb-20">
        <section className="grid items-center gap-10 py-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(16rem,0.9fr)]">
          <div>
            <p className="kicker text-accent">After the handshake</p>
            <h1 className="serif mt-3 max-w-xl text-5xl leading-[1.05]">Know who to follow up with before the night is over.</h1>
            <p className="mt-4 max-w-xl text-lg text-muted">
              You tell BilloAI why you came. It keeps who you met, marks who fits that goal, and writes the note. You send it.
            </p>
            <div className="mt-8">
              <Link
                href="/signup"
                className="inline-block rounded-full bg-accent px-6 py-3.5 text-base font-semibold text-accent-ink shadow-[0_8px_20px_rgb(11_107_79/0.25)]"
              >
                Set up your next event
              </Link>
              <p className="mt-3 max-w-sm text-sm text-muted">
                Your first event includes card reading and drafts. After that, {usd(INDIVIDUAL_MONTHLY_USD)} a month. You send every message yourself.
              </p>
            </div>
          </div>

          <aside className="surface p-5" aria-label="Example follow-up">
            <p className="kicker">Example draft</p>
            <div className="mt-4 flex items-start justify-between gap-3">
              <span>
                <span className="block font-semibold">Maya Chen</span>
                <span className="text-sm text-muted">Operations director, Northline</span>
              </span>
              <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-high">High</span>
            </div>
            <p className="mt-4 rounded-2xl bg-[#f7f3ea] px-3 py-3 text-sm leading-relaxed">
              Maya — good to meet you at the expo. You mentioned the night shift still logs downtime on paper. I can send the one-page version of how we automate that. Want it this week?
            </p>
            <p className="mt-3 text-sm text-muted">You copy this and send it. BilloAI does not send it for you.</p>
          </aside>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <article key={step.title} className="surface p-5">
              <p className="serif text-3xl text-accent">{index + 1}</p>
              <h2 className="mt-3 font-semibold">{step.title}</h2>
              <p className="mt-2 text-sm text-muted">{step.body}</p>
            </article>
          ))}
        </section>

        <section id="pricing" className="mt-16 scroll-mt-8">
          <h2 className="serif text-4xl leading-tight">What it costs</h2>
          <p className="mt-3 max-w-xl text-muted">
            Same prices here and at checkout. Your first event is included. Individual bills monthly or yearly. Organizer is once per event.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <article key={plan.name} className="surface flex flex-col p-5">
                <h3 className="font-semibold">{plan.name}</h3>
                <p className="serif mt-3 text-4xl leading-none">{plan.price}</p>
                <p className="mt-1 text-sm text-muted">{plan.unit}</p>
                <p className="mt-4 flex-1 text-sm text-muted">{plan.body}</p>
                <Link href={plan.href} className="mt-5 inline-block text-sm font-semibold text-accent">
                  {plan.action}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-16 max-w-xl">
          <h2 className="serif text-4xl leading-tight">The names fade. The follow-up should not.</h2>
          <p className="mt-3 text-muted">
            Most people leave an event with a stack of cards and no order. BilloAI is the order: who matched your goal, and what to say next.
          </p>
          <Link
            href="/signup"
            className="mt-6 inline-block rounded-full bg-accent px-6 py-3.5 text-base font-semibold text-accent-ink shadow-[0_8px_20px_rgb(11_107_79/0.25)]"
          >
            Set up your next event
          </Link>
        </section>

        <footer className="mt-16 border-t border-line pt-6 text-sm">
          <p className="text-muted">
            First event included. Individual is {usd(INDIVIDUAL_MONTHLY_USD)} a month. Organizer is {usd(ORGANIZER_SEAT_USD)} a seat for that event.
          </p>
          <p className="mt-3">
            <Link href="/privacy" className="font-semibold text-accent">Privacy</Link>
            {" · "}
            <Link href="/terms" className="font-semibold text-accent">Terms</Link>
            {" · "}
            <SupportLink />
          </p>
        </footer>
      </main>
    </div>
  );
}
