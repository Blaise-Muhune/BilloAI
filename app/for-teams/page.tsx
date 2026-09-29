import type { Metadata } from "next";
import Link from "next/link";
import { BrandLockup } from "@/components/brand";
import { SupportLink } from "@/components/support";
import { ORGANIZER_SEAT_USD, TEAM_SEAT_MIN, TEAM_SEAT_MONTHLY_USD, TEAM_SEAT_YEARLY_USD, TEAM_YEARLY_FLOOR_USD, usd } from "@/lib/pricing";
import { JsonLd } from "@/components/json-ld";
import { SkipLink } from "@/components/skip-link";
import { breadcrumbJsonLd, pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Team seats for sales and BD",
  description:
    "Year-round seats for sales and BD. One hunt list. No two reps on the same live account. The admin sees who has a seat, never who they met.",
  path: "/for-teams",
});

const counts = [
  { label: "Seats used", value: "8" },
  { label: "Capture rate", value: "75%" },
  { label: "Follow-through", value: "62%" },
];

const chapters = [
  {
    n: "01",
    title: "Pay by the seat",
    body: `${usd(TEAM_SEAT_YEARLY_USD)} per seat per year, or ${usd(TEAM_SEAT_MONTHLY_USD)} a month. Minimum ${TEAM_SEAT_MIN} — from ${usd(TEAM_YEARLY_FLOOR_USD)} a year. One bill. Move a seat when someone leaves. This is not the ${usd(ORGANIZER_SEAT_USD)} Group seat for one event.`,
  },
  {
    n: "02",
    title: "Set the hunt once",
    body: "Write the ICP and the companies you want. Scoring uses that next to each rep’s event goal. They still keep their own notes.",
  },
  {
    n: "03",
    title: "Stay off the same account",
    body: "If a teammate already has a High or Medium at that company, the next person sees a badge. No teammate name. No contact name. No note. No draft.",
  },
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
      <header className="sticky top-0 z-30 border-b border-line/80 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl min-w-0 items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-5 sm:py-4">
          <Link href="/">
            <BrandLockup />
          </Link>
          <nav aria-label="Primary" className="flex items-center gap-2 text-sm font-semibold sm:gap-5">
            <Link href="/" className="hidden text-muted hover:text-foreground sm:inline">
              For individuals
            </Link>
            <Link href="/for-organizers" className="hidden text-muted hover:text-foreground sm:inline">
              For groups
            </Link>
            <Link href="/login?for=team" className="text-muted hover:text-foreground">
              Sign in
            </Link>
            <Link href="/signup?for=team" className="rounded-full bg-accent px-4 py-2 text-accent-ink shadow-[0_8px_20px_rgb(11_107_79/0.22)]">
              Set up a team
            </Link>
          </nav>
        </div>
      </header>

      <main id="main">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-8 pt-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)] lg:gap-16 lg:pt-20">
          <div>
            <p className="kicker text-accent">For sales and BD</p>
            <h1 className="serif mt-4 max-w-[16ch] text-[2.7rem] leading-[1.05] tracking-tight sm:text-6xl">
              One hunt. Seats you can move. No two reps on the same live account.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
              Team is year-round AI for your people — not a cheaper Individual, and not Group’s one-event seats. You set the companies. They keep their books. You see coverage counts, never names.
            </p>
            <div className="mt-9">
              <Link href="/signup?for=team" className="inline-flex rounded-full bg-accent px-7 py-3.5 text-base font-semibold text-accent-ink shadow-[0_10px_28px_rgb(11_107_79/0.28)]">
                Start Team at {usd(TEAM_SEAT_YEARLY_USD)} a seat / year
              </Link>
            </div>
            <p className="mt-5 text-sm text-muted">
              From {usd(TEAM_YEARLY_FLOOR_USD)} a year at {TEAM_SEAT_MIN} seats, or {usd(TEAM_SEAT_MONTHLY_USD)} a seat / month. Paying for one mixer?{" "}
              <Link href="/for-organizers" className="font-semibold text-accent">
                Group seats are {usd(ORGANIZER_SEAT_USD)} once, for that event
              </Link>
              .
            </p>
          </div>
          <aside className="rounded-[1.6rem] bg-foreground p-6 text-card">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9ddec8]">Team · who has a seat</p>
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
              You see who has a seat. No company list from other books. No contact names, notes, or drafts.
            </p>
          </aside>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-12">
          <div className="grid gap-4 lg:grid-cols-3">
            {chapters.map((chapter) => (
              <article key={chapter.n} className="surface p-6">
                <p className="kicker text-accent">{chapter.n}</p>
                <h2 className="serif mt-3 text-3xl leading-tight">{chapter.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted">{chapter.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
          <div className="flex max-w-2xl flex-col items-start">
            <h2 className="serif text-4xl leading-[1.1] sm:text-5xl">Pay for the year. Stay out of their notebooks.</h2>
            <p className="mt-5 text-lg leading-relaxed text-muted">
              {usd(TEAM_SEAT_YEARLY_USD)} a seat / year, or {usd(TEAM_SEAT_MONTHLY_USD)} a month. From {usd(TEAM_YEARLY_FLOOR_USD)} a year at {TEAM_SEAT_MIN} seats. Same price here and at checkout. Revoking a seat does not delete their book.
            </p>
            <Link
              href="/signup?for=team"
              className="mt-8 inline-flex rounded-full bg-accent px-7 py-3.5 text-base font-semibold text-accent-ink shadow-[0_10px_28px_rgb(11_107_79/0.28)]"
            >
              Set up Team
            </Link>
          </div>
        </section>

        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-10 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <BrandLockup />
              <p className="mt-2 max-w-sm text-sm text-muted">
                Team is {usd(TEAM_SEAT_YEARLY_USD)} per seat per year, or {usd(TEAM_SEAT_MONTHLY_USD)} a month, from {usd(TEAM_YEARLY_FLOOR_USD)} a year. Group seats stay a separate product.
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
