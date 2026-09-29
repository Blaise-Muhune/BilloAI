import type { Metadata } from "next";
import Link from "next/link";
import { BrandLockup } from "@/components/brand";
import { JsonLd } from "@/components/json-ld";
import { LandingCta, LandingHeader } from "@/components/landing-header";
import { SkipLink } from "@/components/skip-link";
import { SupportLink } from "@/components/support";
import { ORGANIZER_SEAT_USD, TEAM_SEAT_MIN, TEAM_SEAT_MONTHLY_USD, TEAM_SEAT_YEARLY_USD, TEAM_YEARLY_FLOOR_USD, usd } from "@/lib/pricing";
import { breadcrumbJsonLd, pageMeta } from "@/lib/seo";

const SETUP_HREF = "/signup?for=team";
const SETUP_LABEL = "Set up a team";
const SETUP_NOTE = `From ${usd(TEAM_YEARLY_FLOOR_USD)} a year at ${TEAM_SEAT_MIN} seats.`;

export const metadata: Metadata = pageMeta({
  title: "Team seats for sales and BD",
  description:
    "Year-round seats for sales and BD. One hunt list. No two reps on the same live account. You see coverage, and you can move a seat.",
  path: "/for-teams",
});

const counts = [
  { label: "Seats used", value: "8" },
  { label: "Capture rate", value: "75%" },
  { label: "Follow-through", value: "62%" },
];

const steps = [
  {
    n: "1",
    title: "Pay by the seat",
    body: `${usd(TEAM_SEAT_YEARLY_USD)} per seat per year, or ${usd(TEAM_SEAT_MONTHLY_USD)} a month. Minimum ${TEAM_SEAT_MIN}. Move a seat when someone leaves.`,
  },
  {
    n: "2",
    title: "Set the hunt once",
    body: "Write the ICP and the companies you want. Scoring uses that next to each rep’s event goal.",
  },
  {
    n: "3",
    title: "Stay off the same account",
    body: "If a teammate already has a High or Medium at that company, the next person sees a badge.",
  },
];

const whoLinks = [
  { href: "/", label: "For individuals" },
  { href: "/for-organizers", label: "For groups" },
  { href: "/contact", label: "Contact" },
];

export default function ForTeamsPage() {
  return (
    <div className="landing-shell min-h-full">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "BilloAI", path: "/" },
          { name: "For teams", path: "/for-teams" },
        ])}
      />
      <SkipLink />
      <LandingHeader links={whoLinks} signInHref="/login?for=team" ctaHref={SETUP_HREF} ctaLabel={SETUP_LABEL} />

      <main id="main">
        <section className="mx-auto grid max-w-6xl items-center gap-6 px-5 pb-0 pt-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)] lg:gap-16 lg:pb-8 lg:pt-20">
          <div>
            <p className="text-sm font-semibold text-accent">Sales or BD, all year.</p>
            <h1 className="serif mt-3 max-w-[16ch] text-[2.15rem] leading-[1.08] tracking-tight sm:text-6xl sm:leading-[1.05]">
              One hunt. Seats you can move. No two reps on the same live account.
            </h1>
            <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted sm:mt-6">
              You set the companies. You see coverage. Teammates see when a company is already in play.
            </p>
            <div className="mt-7 sm:mt-9">
              <LandingCta href={SETUP_HREF} label={SETUP_LABEL} />
              <p className="mt-3 text-sm text-muted">{SETUP_NOTE}</p>
            </div>
          </div>
          <aside className="rounded-[1.6rem] bg-foreground p-6 text-card" aria-label="Example of what a team sees">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9ddec8]">Example · who has a seat</p>
            <p className="serif mt-3 text-3xl leading-tight">What you see</p>
            <dl className="mt-6 grid grid-cols-3 gap-3">
              {counts.map((item) => (
                <div key={item.label}>
                  <dt className="text-xs text-white/55">{item.label}</dt>
                  <dd className="serif mt-1 text-2xl">{item.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 text-sm leading-relaxed text-white/65">
              Capture rate and follow-through for a room — not a customer case study.
            </p>
          </aside>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-8 lg:py-16">
          <ol className="grid gap-4 lg:grid-cols-3">
            {steps.map((step) => (
              <li key={step.n} className="surface p-6">
                <p className="serif text-3xl text-accent/40">{step.n}</p>
                <h2 className="serif mt-2 text-2xl leading-tight">{step.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10">
            <LandingCta href={SETUP_HREF} label={SETUP_LABEL} />
            <p className="mt-3 text-sm text-muted">{SETUP_NOTE}</p>
            <p className="mt-3 max-w-xl text-sm text-muted">
              Paying for one mixer?{" "}
              <Link href="/for-organizers" className="font-semibold text-accent">
                Group seats are {usd(ORGANIZER_SEAT_USD)} once
              </Link>
              .
            </p>
          </div>
        </section>

        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-10 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <BrandLockup />
              <p className="mt-2 max-w-sm text-sm text-muted">
                Team is {usd(TEAM_SEAT_YEARLY_USD)} per seat per year, or {usd(TEAM_SEAT_MONTHLY_USD)} a month. Group seats stay a separate product.
              </p>
            </div>
            <p className="text-sm">
              <Link href="/" className="font-semibold text-accent">
                For individuals
              </Link>
              {" · "}
              <Link href="/for-organizers" className="font-semibold text-accent">
                For groups
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
