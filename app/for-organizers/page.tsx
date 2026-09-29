import type { Metadata } from "next";
import Link from "next/link";
import { BrandLockup } from "@/components/brand";
import { JsonLd } from "@/components/json-ld";
import { LandingCta, LandingHeader } from "@/components/landing-header";
import { SkipLink } from "@/components/skip-link";
import { SupportLink } from "@/components/support";
import { ORGANIZER_SEAT_USD, TEAM_SEAT_YEARLY_USD, TEAM_YEARLY_FLOOR_USD, usd } from "@/lib/pricing";
import { breadcrumbJsonLd, pageMeta } from "@/lib/seo";

const SETUP_HREF = "/signup?for=group";
const SETUP_LABEL = "Set up a group";
const SETUP_NOTE = `${usd(ORGANIZER_SEAT_USD)} a seat, once, for one named event.`;

export const metadata: Metadata = pageMeta({
  title: "Group seats for one event",
  description: "Pay for one named event. See who used a seat, who captured someone, and whether they followed through.",
  path: "/for-organizers",
});

const counts = [
  { label: "Seats used", value: "18" },
  { label: "Captured someone", value: "14" },
  { label: "Follow-ups done", value: "9" },
];

const roster = [
  { name: "Ken Walsh", detail: "Used the seat · 4 saved" },
  { name: "Priya Shah", detail: "Used the seat · nothing saved yet" },
];

const steps = [
  { n: "1", title: "Pay for the seats", body: `${usd(ORGANIZER_SEAT_USD)} each, once. Unused seats stay with that event.` },
  { n: "2", title: "Send one link", body: "They open it, create their own account, and start capturing." },
  { n: "3", title: "See if it worked", body: "Who used a seat, who captured someone, and whether they followed through." },
];

const whoLinks = [
  { href: "/", label: "For individuals" },
  { href: "/for-teams", label: "For teams" },
  { href: "/contact", label: "Contact" },
];

export default function ForOrganizersPage() {
  return (
    <div className="landing-shell min-h-full">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "BilloAI", path: "/" },
          { name: "For groups", path: "/for-organizers" },
        ])}
      />
      <SkipLink />
      <LandingHeader links={whoLinks} signInHref="/login?for=group" ctaHref={SETUP_HREF} ctaLabel={SETUP_LABEL} />

      <main id="main">
        <section className="mx-auto grid max-w-6xl items-center gap-6 px-5 pb-0 pt-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)] lg:gap-16 lg:pb-8 lg:pt-20">
          <div>
            <p className="text-sm font-semibold text-accent">You paid for the room. Not the people who went.</p>
            <h1 className="serif mt-3 max-w-[16ch] text-[2.15rem] leading-[1.08] tracking-tight sm:text-6xl sm:leading-[1.05]">
              Pay for the seats. See if they used them.
            </h1>
            <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted sm:mt-6">
              You see who went, who captured someone, and whether they followed through.
            </p>
            <div className="mt-7 sm:mt-9">
              <LandingCta href={SETUP_HREF} label={SETUP_LABEL} />
              <p className="mt-3 text-sm text-muted">{SETUP_NOTE}</p>
              <p className="mt-3 text-sm text-muted">
                Paying for people?{" "}
                <Link href="/signup?for=company" className="font-semibold text-accent">
                  Company, this event
                </Link>
                {" · "}
                Hosting the room?{" "}
                <Link href="/signup?for=event" className="font-semibold text-accent">
                  Room or event
                </Link>
              </p>
            </div>
          </div>

          <aside className="landing-frame overflow-hidden rounded-[1.6rem] border border-line bg-card" aria-label="Example of what a group sees">
            <div className="bg-foreground px-5 py-4 text-card">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9ddec8]">Example · who used a seat</p>
              <p className="serif mt-1 text-2xl">Detroit supplier night</p>
              <p className="mt-1 text-sm text-white/70">18 of 25 seats used</p>
            </div>
            <div className="grid grid-cols-3 gap-2 p-3">
              {counts.map((item) => (
                <div key={item.label} className="rounded-2xl bg-[#f7f3ea] px-3 py-3">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted">{item.label}</p>
                  <p className="serif mt-1 text-3xl">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2 border-t border-line px-5 py-4">
              {roster.map((person) => (
                <div key={person.name} className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold">{person.name}</span>
                  <span className="text-muted">{person.detail}</span>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-8 lg:py-16">
          <ol className="grid gap-4 sm:grid-cols-3">
            {steps.map((step) => (
              <li key={step.n} className="surface p-6">
                <p className="serif text-3xl text-accent/40">{step.n}</p>
                <h2 className="serif mt-2 text-2xl">{step.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10">
            <LandingCta href={SETUP_HREF} label={SETUP_LABEL} />
            <p className="mt-3 text-sm text-muted">{SETUP_NOTE}</p>
            <p className="mt-3 max-w-xl text-sm text-muted">
              Sales or BD all year?{" "}
              <Link href="/for-teams" className="font-semibold text-accent">
                Team is from {usd(TEAM_YEARLY_FLOOR_USD)} a year
              </Link>
              — not these one-event seats.
            </p>
          </div>
        </section>

        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-10 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <BrandLockup />
              <p className="mt-2 max-w-sm text-sm text-muted">
                Group seats are {usd(ORGANIZER_SEAT_USD)} each, once. Team is {usd(TEAM_SEAT_YEARLY_USD)} a seat / year.
              </p>
            </div>
            <p className="text-sm">
              <Link href="/" className="font-semibold text-accent">
                For individuals
              </Link>
              {" · "}
              <Link href="/for-teams" className="font-semibold text-accent">
                For teams
              </Link>
              {" · "}
              <Link href="/contact" className="font-semibold text-accent">
                Contact
              </Link>
              {" · "}
              <Link href="/privacy" className="font-semibold text-accent">
                Privacy
              </Link>
              {" · "}
              <Link href="/terms" className="font-semibold text-accent">
                Terms
              </Link>
              {" · "}
              <SupportLink />
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
