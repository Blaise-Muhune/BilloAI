import type { Metadata } from "next";
import Link from "next/link";
import { BrandLockup } from "@/components/brand";
import { JsonLd } from "@/components/json-ld";
import { LandingCta, LandingHeader } from "@/components/landing-header";
import { SkipLink } from "@/components/skip-link";
import { Avatar, PriorityBadge } from "@/components/ui";
import {
  INDIVIDUAL_MONTHLY_USD,
  INDIVIDUAL_YEARLY_USD,
  ORGANIZER_SEAT_USD,
  TEAM_SEAT_MIN,
  TEAM_SEAT_YEARLY_USD,
  TEAM_YEARLY_FLOOR_USD,
  usd,
} from "@/lib/pricing";
import { SITE_NAME, SITE_TAGLINE, SITE_URL, pageMeta } from "@/lib/seo";

const START_HREF = "/signup";
const START_LABEL = "Start with your first event";
const START_NOTE = "First event includes matching. No payment to start.";

const whoLinks = [
  { href: "/for-organizers", label: "For groups" },
  { href: "/for-teams", label: "For teams" },
  { href: "#pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
];

export const metadata: Metadata = pageMeta({
  title: "Know who from the room is worth staying connected to",
  description: "Say why you went. Keep who you met before ranking. In the morning, see who matched that. Send the note yourself. First event includes matching. No payment to start.",
  path: "/",
});

const faqs = [
  {
    q: "Does it send the follow-up for me?",
    a: "No. It writes a note you copy. You send it.",
  },
  {
    q: "What is included before I pay?",
    a: "Matching on your first event. No payment to start. After that: Individual, a Team seat, or a Group seat for another named event.",
  },
  {
    q: "Does scoring wait until I leave the room?",
    a: "Yes. Save the person and the line while they are still there. Ranking can wait until you have a connection.",
  },
  {
    q: "Group or Team?",
    a: `Group is ${usd(ORGANIZER_SEAT_USD)} once per seat for one event — you see who used a seat and whether they followed through. Team is year-round for sales, from ${usd(TEAM_YEARLY_FLOOR_USD)} a year.`,
  },
];

const people = [
  { name: "Maya Chen", detail: "Ops director, Northline", level: "high" as const },
  { name: "Priya Shah", detail: "Plant manager, Ford supplier", level: "medium" as const },
  { name: "Jon Park", detail: "Recruiter, Apex Talent", level: "low" as const },
];

const steps = [
  { n: "1", title: "Why you went", body: "Customers, a hire, a check — that sentence is the filter." },
  { n: "2", title: "Who you met", body: "Photo or a name, plus one spoken line. The contact is kept before ranking." },
  { n: "3", title: "Who fits", body: "In the morning: the two or three High matches, the line you said, and a draft you copy." },
];

const voices = [
  {
    quote: "I saved eight people. In the morning I knew the two who matched why I went.",
    name: "Tom",
    detail: "Sells into plants · Cleveland",
  },
  {
    quote: "I would have written the recruiter first. It put the plant manager at the top.",
    name: "Sana",
    detail: "Automation · Dearborn",
  },
  {
    quote: "Eight names in my notes. Two were actually why I bought the ticket.",
    name: "Lena",
    detail: "OEM sales · Toledo",
  },
];

const landingGraph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/brand/mark.png`,
      description: SITE_TAGLINE,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#site`,
      url: SITE_URL,
      name: SITE_NAME,
      publisher: { "@id": `${SITE_URL}/#org` },
      inLanguage: "en-US",
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#app`,
      name: SITE_NAME,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: SITE_URL,
      description: SITE_TAGLINE,
      publisher: { "@id": `${SITE_URL}/#org` },
      offers: [
        {
          "@type": "Offer",
          name: "Individual",
          price: String(INDIVIDUAL_MONTHLY_USD),
          priceCurrency: "USD",
          description: "Monthly after the first included event",
        },
        {
          "@type": "Offer",
          name: "Individual yearly",
          price: String(INDIVIDUAL_YEARLY_USD),
          priceCurrency: "USD",
          description: "Yearly after the first included event",
        },
        {
          "@type": "Offer",
          name: "Team",
          price: String(TEAM_SEAT_YEARLY_USD),
          priceCurrency: "USD",
          description: `Per seat per year, minimum ${TEAM_SEAT_MIN} seats`,
        },
        {
          "@type": "Offer",
          name: "Group",
          price: String(ORGANIZER_SEAT_USD),
          priceCurrency: "USD",
          description: "Per seat, once, for one named event",
        },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: faqs.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
  ],
};

export default function LandingPage() {
  return (
    <div className="landing-shell min-h-full">
      <JsonLd data={landingGraph} />
      <SkipLink />
      <LandingHeader
        links={whoLinks}
        signInHref="/login"
        ctaHref={START_HREF}
        ctaLabel={START_LABEL}
        compactCta
      />

      <main id="main">
        <section className="mx-auto grid max-w-6xl items-center gap-6 px-5 pb-0 pt-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)] lg:gap-16 lg:pb-8 lg:pt-20">
          <div>
            <p className="text-sm font-semibold text-accent">You went to the room. Not the person who paid for it.</p>
            <h1 className="serif mt-3 max-w-[16ch] text-[2.15rem] leading-[1.08] tracking-tight sm:text-6xl sm:leading-[1.05]">
              Leave knowing who from the room is worth staying connected to.
            </h1>
            <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted sm:mt-6">
              Say why you went. Keep who you met before the moment passes. In the morning, see who matched that. Send the note yourself.
            </p>
            <div className="mt-7 sm:mt-9">
              <LandingCta href={START_HREF} label={START_LABEL} />
              <p className="mt-3 text-sm text-muted">{START_NOTE}</p>
            </div>
          </div>

          <aside className="landing-frame overflow-hidden rounded-[1.6rem] border border-line bg-card" aria-label="Example of a scored event">
            <div className="bg-foreground px-5 py-4 text-card">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9ddec8]">This event</p>
              <p className="serif mt-1 text-2xl">Chamber mixer</p>
              <p className="mt-1 text-sm text-white/70">Find operators who need automation</p>
            </div>
            <div className="space-y-1 p-3">
              {people.map((person) => (
                <div
                  key={person.name}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-3 ${person.level === "high" ? "bg-[#f7f3ea]" : ""}`}
                >
                  <Avatar name={person.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{person.name}</span>
                    <span className="block truncate text-sm text-muted">{person.detail}</span>
                  </span>
                  <PriorityBadge level={person.level} />
                </div>
              ))}
            </div>
            <div className="border-t border-line px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">The line · then a draft</p>
              <p className="mt-2 text-sm leading-relaxed">Promised the pricing note. Works the late shift at the plant.</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Maya — good to meet you at the mixer. You mentioned downtime still gets logged on paper. Want the one-pager this week?
              </p>
            </div>
          </aside>
        </section>

        <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-8 lg:py-16">
          <ol className="grid gap-4 sm:grid-cols-3">
            {steps.map((step) => (
              <li key={step.n} className="surface p-6">
                <p className="serif text-3xl text-accent/40">{step.n}</p>
                <h2 className="serif mt-2 text-2xl">{step.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-8 lg:py-16" aria-labelledby="voices-title">
          <h2 id="voices-title" className="serif max-w-xl text-4xl leading-[1.1] sm:text-5xl">
            They knew who to write next.
          </h2>
          <p className="mt-3 text-sm text-muted">Composites that show the product — not named customer reviews.</p>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {voices.map((voice) => (
              <blockquote key={voice.name} className="surface p-6">
                <p className="leading-relaxed">“{voice.quote}”</p>
                <footer className="mt-5 flex items-center gap-3">
                  <Avatar name={voice.name} />
                  <cite className="not-italic">
                    <span className="block font-semibold">{voice.name}</span>
                    <span className="block text-sm text-muted">{voice.detail}</span>
                  </cite>
                </footer>
              </blockquote>
            ))}
          </div>
          <div className="mt-10">
            <LandingCta href={START_HREF} label={START_LABEL} />
            <p className="mt-3 text-sm text-muted">{START_NOTE}</p>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-8 lg:py-16">
          <h2 className="serif text-4xl leading-tight sm:text-5xl">First event included.</h2>
          <p className="mt-3 max-w-xl text-muted">Then Individual if you keep going. Groups and teams have their own pages.</p>
          <article className="mt-10 max-w-xl rounded-[1.6rem] bg-foreground p-6 text-card shadow-[0_24px_50px_rgb(40_28_12/0.18)] sm:p-7">
            <p className="kicker text-[#9ddec8]">Most people</p>
            <h3 className="mt-2 font-semibold">Individual</h3>
            <p className="serif mt-4 text-5xl leading-none">{usd(INDIVIDUAL_MONTHLY_USD)}</p>
            <p className="mt-2 text-sm text-white/65">a month after your first event</p>
            <p className="mt-5 text-sm leading-relaxed text-white/80">
              First event included. Or {usd(INDIVIDUAL_YEARLY_USD)} a year. No payment to start.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-white/80">
              <li>Who matched why you went</li>
              <li>Matching on every event after</li>
            </ul>
            <Link
              href={START_HREF}
              className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-ink"
            >
              {START_LABEL}
            </Link>
          </article>
          <p className="mt-8 max-w-xl text-sm leading-relaxed text-muted">
            Paying for one event?{" "}
            <Link href="/for-organizers" className="font-semibold text-accent">
              For groups
            </Link>
            <span className="text-line"> · </span>
            Sales or BD all year?{" "}
            <Link href="/for-teams" className="font-semibold text-accent">
              For teams
            </Link>
          </p>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-16 lg:pb-24" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="serif text-4xl leading-[1.1] sm:text-5xl">
            Straight answers
          </h2>
          <dl className="mt-10 grid gap-8 lg:grid-cols-3">
            {faqs.map((item) => (
              <div key={item.q}>
                <dt className="font-semibold">{item.q}</dt>
                <dd className="mt-2 text-muted">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-10 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <BrandLockup />
              <p className="mt-2 max-w-sm text-sm text-muted">First event included. You send every message.</p>
            </div>
            <p className="text-sm">
              <Link href="/for-organizers" className="font-semibold text-accent">
                For groups
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
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
