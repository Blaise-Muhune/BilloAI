import type { Metadata } from "next";
import Link from "next/link";
import { BrandLockup, BrandMark } from "@/components/brand";
import { JsonLd } from "@/components/json-ld";
import { SkipLink } from "@/components/skip-link";
import { Avatar, PriorityBadge } from "@/components/ui";
import { INDIVIDUAL_MONTHLY_USD, INDIVIDUAL_YEARLY_USD, ORGANIZER_SEAT_USD, TEAM_SEAT_MIN, TEAM_SEAT_YEARLY_USD, usd } from "@/lib/pricing";
import { SITE_NAME, SITE_TAGLINE, SITE_URL, pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Know who from the room is worth staying connected to",
  description:
    "After you network, BilloAI shows who matched why you went, and a note so you can keep the conversation going. You send it. Card photos are read and discarded.",
  path: "/",
});

const faqs = [
  {
    q: "Does BilloAI send follow-ups for me?",
    a: "No. It writes a note you can copy. You send it yourself.",
  },
  {
    q: "Does a company or host see who I met?",
    a: "No. They can see that you used a seat. They never see contacts, notes, or drafts.",
  },
  {
    q: "Do you store the card photo?",
    a: "No. The photo is read on the spot and discarded.",
  },
  {
    q: "What is included before I pay?",
    a: "Your first event includes matching people you met to why you went. After that it is Individual, a Team seat, or a Group seat for that event.",
  },
];

const people = [
  { name: "Maya Chen", detail: "Ops director, Northline", level: "high" as const },
  { name: "Priya Shah", detail: "Plant manager, Ford supplier", level: "medium" as const },
  { name: "Jon Park", detail: "Recruiter, Apex Talent", level: "low" as const },
];

const chapters = [
  {
    n: "01",
    title: "Name the event, and why you went",
    body: "Customers, partners, a hire, a check. That sentence is how a stranger becomes worth staying connected to — not a guess on the way home.",
  },
  {
    n: "02",
    title: "Keep the people you met",
    body: "Save a card, a name, or a LinkedIn, plus one line about the conversation — typed or spoken. The photo is read and discarded.",
  },
  {
    n: "03",
    title: "See who is worth staying connected to",
    body: "We look them up in public, match them to your goal, and write a note you can send. Nothing goes out on its own.",
  },
];

const voices = [
  {
    quote:
      "I had seven cards in my coat. In the car I typed the one line I still remembered. Tuesday I only wrote two people. The rest I left in the pile.",
    name: "Tom",
    detail: "Sells into plants · Cleveland",
  },
  {
    quote:
      "It put the recruiter at the bottom. I would have emailed him first because he was nice. That would have been my whole morning.",
    name: "Sana",
    detail: "Automation · Dearborn",
  },
  {
    quote:
      "Work bought the seats for that event. I still have who I met. They never got the names. I copied the note and sent it myself.",
    name: "Ken",
    detail: "On a company seat",
  },
];

const plans = [
  {
    name: "Free",
    price: usd(0),
    unit: "to start",
    body: "Events and typed contacts. Matching who you met to your goal on your first event.",
    href: "/signup",
    action: "Start free",
    featured: false,
  },
  {
    name: "Individual",
    price: usd(INDIVIDUAL_MONTHLY_USD),
    unit: "per month",
    body: `Keep seeing who is worth staying connected to on every event after the first. ${usd(INDIVIDUAL_YEARLY_USD)} a year if you keep going.`,
    href: "/signup",
    action: "Get Individual",
    featured: true,
  },
  {
    name: "Group",
    price: usd(ORGANIZER_SEAT_USD),
    unit: "per seat, once, for one event",
    body: "Pay for one named event. You see who used a seat. People you pay for keep who they met. Unused seats stay with that event.",
    href: "/signup?for=group",
    action: "Set up a group",
    featured: false,
  },
  {
    name: "Team",
    price: usd(TEAM_SEAT_YEARLY_USD),
    unit: `per seat / year, min ${TEAM_SEAT_MIN}`,
    body: "Year-round seats for sales and BD. One hunt list. A nameless already-in-play signal. Not Group’s one-event seat.",
    href: "/signup?for=team",
    action: "Set up a team",
    featured: false,
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
          name: "Team",
          price: String(TEAM_SEAT_YEARLY_USD),
          priceCurrency: "USD",
          description: `Per seat per year, minimum ${TEAM_SEAT_MIN}`,
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
      <header className="sticky top-0 z-30 border-b border-line/80 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl min-w-0 items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-5 sm:py-4">
          <Link href="/">
            <BrandLockup />
          </Link>
          <nav aria-label="Primary" className="flex items-center gap-2 text-sm font-semibold sm:gap-5">
            <Link href="/for-organizers" className="hidden text-muted hover:text-foreground sm:inline">
              For groups
            </Link>
            <Link href="/for-teams" className="hidden text-muted hover:text-foreground sm:inline">
              For teams
            </Link>
            <Link href="#pricing" className="hidden text-muted hover:text-foreground sm:inline">
              Pricing
            </Link>
            <Link href="/login" className="text-muted hover:text-foreground">
              Sign in
            </Link>
            <Link href="/signup" className="rounded-full bg-accent px-4 py-2 text-accent-ink shadow-[0_8px_20px_rgb(11_107_79/0.22)]">
              Start free
            </Link>
          </nav>
        </div>
      </header>

      <main id="main">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-8 pt-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)] lg:gap-16 lg:pt-20">
          <div>
            <p className="kicker text-accent">After the handshake</p>
            <h1 className="serif mt-4 max-w-[16ch] text-[2.7rem] leading-[1.05] tracking-tight sm:text-6xl">
              Leave knowing who from the room is worth staying connected to.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
              You say why you came. BilloAI keeps who you met, marks who fits that, and gives you a note to continue the conversation. You send it.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="inline-flex rounded-full bg-accent px-7 py-3.5 text-base font-semibold text-accent-ink shadow-[0_10px_28px_rgb(11_107_79/0.28)]"
              >
                Set up your next event
              </Link>
              <Link href="#how" className="inline-flex rounded-full border border-line bg-card px-6 py-3.5 text-base font-semibold">
                See how it works
              </Link>
            </div>
            <ul className="mt-8 flex max-w-lg flex-col gap-2 text-sm text-muted sm:flex-row sm:flex-wrap sm:gap-x-6">
              <li>First event includes AI</li>
              <li>You send every message</li>
              <li>Card photos are not stored</li>
            </ul>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
            <div className="absolute -left-5 top-8 hidden w-44 -rotate-6 rounded-2xl border border-line bg-card p-3.5 text-xs shadow-[0_16px_40px_rgb(40_28_12/0.12)] lg:block">
              <p className="text-[0.65rem] font-bold tracking-[0.14em] text-muted">NORTHLINE</p>
              <p className="mt-2 font-semibold">Maya Chen</p>
              <p className="text-muted">Operations director</p>
              <p className="mt-2 text-muted">maya@northline.co</p>
            </div>
            <aside className="landing-frame relative overflow-hidden rounded-[1.6rem] border border-line bg-card" aria-label="Example of a scored event">
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
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Draft · not sent</p>
                <p className="mt-2 text-sm leading-relaxed">
                  Maya — good to meet you at the expo. You mentioned the night shift still logs downtime on paper. I can send the one-page version of how we automate that. Want it this week?
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-8 lg:py-16">
          <div className="overflow-hidden rounded-[2rem] bg-foreground px-6 py-12 text-card sm:px-10 lg:px-14 lg:py-16">
            <div className="flex items-center gap-2.5">
              <BrandMark className="h-8 w-8" />
              <p className="kicker text-[#9ddec8]">The morning after</p>
            </div>
            <h2 className="serif mt-3 max-w-2xl text-4xl leading-[1.1] sm:text-5xl">Forty names. No idea who mattered.</h2>
            <div className="mt-10 grid gap-8 lg:grid-cols-2 lg:gap-16">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-white/45">What people leave with</p>
                <ul className="mt-4 space-y-3 text-lg text-white/75">
                  <li>A stack of cards in a jacket</li>
                  <li>First names in Notes</li>
                  <li>A LinkedIn request you never finish</li>
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#9ddec8]">What you leave with</p>
                <ul className="mt-4 space-y-3 text-lg">
                  <li>Who matched the reason you went</li>
                  <li>Enough context to pick the conversation back up</li>
                  <li>A note you send when you sit down</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-8 lg:py-10">
          <p className="kicker text-accent">The loop</p>
          <h2 className="serif mt-3 max-w-xl text-4xl leading-tight sm:text-5xl">Meet people. Keep the ones who fit.</h2>
          <ol className="mt-10">
            {chapters.map((chapter) => (
              <li key={chapter.n} className="grid gap-3 border-t border-line py-8 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-10 sm:py-10">
                <p className="serif text-5xl leading-none text-accent/35">{chapter.n}</p>
                <div className="max-w-2xl">
                  <h3 className="serif text-2xl sm:text-3xl">{chapter.title}</h3>
                  <p className="mt-3 text-muted leading-relaxed">{chapter.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-8 lg:py-16" aria-labelledby="voices-title">
          <p className="kicker text-accent">Tuesday</p>
          <h2 id="voices-title" className="serif mt-3 max-w-2xl text-4xl leading-[1.1] sm:text-5xl">
            They sat down. They knew who to write.
          </h2>
          <p className="mt-4 max-w-xl text-muted">
            Same loop as above. A note they copied. Nothing left the account on its own. These are composites that show
            the product — not reviews from named customers.
          </p>
          <div className="mt-10 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <blockquote className="surface p-6 lg:p-8">
              <p className="serif text-2xl leading-snug lg:text-3xl">“{voices[0]!.quote}”</p>
              <footer className="mt-6 flex items-center gap-3">
                <Avatar name={voices[0]!.name} />
                <cite className="not-italic">
                  <span className="block font-semibold">{voices[0]!.name}</span>
                  <span className="block text-sm text-muted">{voices[0]!.detail}</span>
                </cite>
              </footer>
            </blockquote>
            <div className="grid gap-4">
              {voices.slice(1).map((voice) => (
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
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-8 lg:pb-6">
          <p className="kicker text-accent">Pricing</p>
          <h2 className="serif mt-3 text-4xl leading-tight sm:text-5xl">Same prices here and at checkout.</h2>
          <p className="mt-4 max-w-xl text-muted">
            Your first event is included. Individual is for every event after that. Team is {usd(TEAM_SEAT_YEARLY_USD)} a seat for the year. Group seats are {usd(ORGANIZER_SEAT_USD)} once, for one named event.
          </p>
          <div className="mt-10 grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={
                  plan.featured
                    ? "flex flex-col rounded-[1.6rem] bg-foreground p-6 text-card shadow-[0_24px_50px_rgb(40_28_12/0.18)] lg:-translate-y-2 lg:p-7"
                    : "surface flex flex-col p-6"
                }
              >
                {plan.featured ? <p className="kicker text-[#9ddec8]">Most people</p> : null}
                <h3 className={`font-semibold ${plan.featured ? "mt-2" : ""}`}>{plan.name}</h3>
                <p className="serif mt-4 text-5xl leading-none">{plan.price}</p>
                <p className={`mt-2 text-sm ${plan.featured ? "text-white/65" : "text-muted"}`}>{plan.unit}</p>
                <p className={`mt-5 flex-1 text-sm leading-relaxed ${plan.featured ? "text-white/80" : "text-muted"}`}>{plan.body}</p>
                <Link
                  href={plan.href}
                  className={
                    plan.featured
                      ? "mt-8 inline-flex justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-ink"
                      : "mt-8 inline-flex justify-center rounded-full border border-line px-5 py-3 text-sm font-semibold"
                  }
                >
                  {plan.action}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
          <div className="flex max-w-2xl flex-col items-start">
            <h2 className="serif text-4xl leading-[1.1] sm:text-5xl">The names fade. The right connections should not.</h2>
            <p className="mt-5 text-lg leading-relaxed text-muted">
              Most people leave with a stack of cards and no order. BilloAI is the order: who matched why you went, and how to stay in touch.
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-flex rounded-full bg-accent px-7 py-3.5 text-base font-semibold text-accent-ink shadow-[0_10px_28px_rgb(11_107_79/0.28)]"
            >
              Set up your next event
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-16 lg:pb-24" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="serif text-4xl leading-[1.1] sm:text-5xl">
            Straight answers
          </h2>
          <dl className="mt-10 grid gap-8 lg:grid-cols-2">
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
              <p className="mt-2 max-w-sm text-sm text-muted">
                First event included. Individual is {usd(INDIVIDUAL_MONTHLY_USD)} a month. Team is {usd(TEAM_SEAT_YEARLY_USD)} a seat / year. Group seats are {usd(ORGANIZER_SEAT_USD)} each for one event.
              </p>
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
