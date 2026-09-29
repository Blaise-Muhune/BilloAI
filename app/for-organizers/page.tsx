import type { Metadata } from "next";
import Link from "next/link";
import { SupportLink } from "@/components/support";
import { ORGANIZER_SEAT_USD, usd } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "For groups",
  description: "Pay for one event. They keep who they met. You see counts, never their contacts.",
};

const counts = [
  { label: "Seats used", value: "18" },
  { label: "Captured someone", value: "14" },
  { label: "Follow-ups done", value: "9" },
];

const chapters = [
  {
    n: "01",
    title: "Pay for the seats",
    body: `${usd(ORGANIZER_SEAT_USD)} each, once, for one named event. A company sending people to that event, or a host buying for a room. Unused seats stay with that event.`,
  },
  {
    n: "02",
    title: "Send one link",
    body: "They open it, create their own account, and keep who they met. Joining does not put their contacts on your account.",
  },
  {
    n: "03",
    title: "Watch whether it worked",
    body: "You see how many seats were used, how many people captured someone, and whether they followed through. You never see names, notes, or drafts.",
  },
];

export default function ForOrganizersPage() {
  return (
    <div className="landing-shell min-h-full">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-sm font-semibold text-accent-ink" aria-hidden>
              B
            </span>
            <span className="serif text-2xl leading-none">BilloAI</span>
          </Link>
          <nav className="flex items-center gap-2 text-sm font-semibold sm:gap-5">
            <Link href="/" className="hidden text-muted hover:text-foreground sm:inline">
              For individuals
            </Link>
            <Link href="/login?for=group" className="text-muted hover:text-foreground">
              Sign in
            </Link>
            <Link href="/signup?for=group" className="rounded-full bg-accent px-4 py-2 text-accent-ink shadow-[0_8px_20px_rgb(11_107_79/0.22)]">
              Set up a group
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-8 pt-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)] lg:gap-16 lg:pt-20">
          <div>
            <p className="kicker text-accent">For one event</p>
            <h1 className="serif mt-4 max-w-[16ch] text-[2.7rem] leading-[1.05] tracking-tight sm:text-6xl">
              Pay for the seats. Never see who they met.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
              You buy seats for one event. Your people leave knowing who from the room mattered. Their conversations stay on their accounts. You get counts that show the event worked. If they keep going, Individual is their plan.
            </p>
            <div className="mt-9 grid max-w-lg gap-3 sm:grid-cols-2">
              <Link href="/signup?for=company" className="rounded-[1.4rem] bg-accent px-5 py-4 text-accent-ink shadow-[0_10px_28px_rgb(11_107_79/0.28)]">
                <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-white/70">Paying for people</span>
                <span className="mt-2 block font-semibold">Company, this event</span>
              </Link>
              <Link href="/signup?for=event" className="rounded-[1.4rem] border border-line bg-card px-5 py-4">
                <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-muted">Hosting an event</span>
                <span className="mt-2 block font-semibold">Room or event</span>
              </Link>
            </div>
            <p className="mt-5 text-sm text-muted">
              Already in?{" "}
              <Link href="/login?for=group" className="font-semibold text-accent">
                Sign in, then switch to Group
              </Link>
              .
            </p>
          </div>

          <aside className="landing-frame overflow-hidden rounded-[1.6rem] border border-line bg-card" aria-label="Example of what a group sees">
            <div className="bg-foreground px-5 py-4 text-card">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9ddec8]">Group · counts only</p>
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
            <div className="border-t border-line px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Send this to your team</p>
              <p className="mt-2 truncate text-sm font-semibold">billoai.com/join?code=k4n2pq</p>
              <p className="mt-2 text-sm text-muted">No names. No notes. No drafts.</p>
            </div>
          </aside>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-8 lg:py-16">
          <div className="overflow-hidden rounded-[2rem] bg-foreground px-6 py-12 text-card sm:px-10 lg:px-14 lg:py-16">
            <p className="kicker text-[#9ddec8]">The split</p>
            <h2 className="serif mt-3 max-w-2xl text-4xl leading-[1.1] sm:text-5xl">They keep the people. You keep the proof it worked.</h2>
            <div className="mt-10 grid gap-8 lg:grid-cols-2 lg:gap-16">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#9ddec8]">What you see</p>
                <ul className="mt-4 space-y-3 text-lg">
                  <li>How many seats were used</li>
                  <li>How many people captured someone</li>
                  <li>How many follow-ups got done</li>
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-white/45">What you never see</p>
                <ul className="mt-4 space-y-3 text-lg text-white/75">
                  <li>Who joined by name</li>
                  <li>Who they met</li>
                  <li>Notes from the conversation</li>
                  <li>The draft they may send</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-8 lg:py-10">
          <p className="kicker text-accent">How a group works</p>
          <h2 className="serif mt-3 max-w-xl text-4xl leading-tight sm:text-5xl">One link. Their network. Your counts.</h2>
          <ol className="mt-10">
            {chapters.map((chapter) => (
              <li key={chapter.n} className="grid gap-3 border-t border-line py-8 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-10 sm:py-10">
                <p className="serif text-5xl leading-none text-accent/35">{chapter.n}</p>
                <div className="max-w-2xl">
                  <h3 className="serif text-2xl sm:text-3xl">{chapter.title}</h3>
                  <p className="mt-3 leading-relaxed text-muted">{chapter.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
          <div className="flex max-w-2xl flex-col items-start">
            <h2 className="serif text-4xl leading-[1.1] sm:text-5xl">Buy the seats. Stay out of the conversations.</h2>
            <p className="mt-5 text-lg leading-relaxed text-muted">
              {usd(ORGANIZER_SEAT_USD)} a seat, once, for one event. Same price here and at checkout. Unused seats stay with that event.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup?for=company"
                className="inline-flex rounded-full bg-accent px-7 py-3.5 text-base font-semibold text-accent-ink shadow-[0_10px_28px_rgb(11_107_79/0.28)]"
              >
                Set up for this event
              </Link>
              <Link href="/signup?for=event" className="inline-flex rounded-full border border-line bg-card px-6 py-3.5 text-base font-semibold">
                Set up for a room
              </Link>
            </div>
          </div>
        </section>

        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-10 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="serif text-2xl">BilloAI</p>
              <p className="mt-2 max-w-sm text-sm text-muted">
                Group seats are {usd(ORGANIZER_SEAT_USD)} each, once, for one event. You do not get a list of their contacts.
              </p>
            </div>
            <p className="text-sm">
              <Link href="/" className="font-semibold text-accent">
                For individuals
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
