import Link from "next/link";
import { SupportLink } from "@/components/support";

const steps = [
  { n: "01", title: "Meet", body: "Capture a card, a photo, or a name while the conversation is still fresh." },
  { n: "02", title: "Understand", body: "See who matches the reason you came, from high to low." },
  { n: "03", title: "Follow up", body: "Leave with a draft you copy and send yourself." },
];

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-14">
      <p className="kicker text-accent">BilloAI</p>
      <h1 className="serif mt-3 max-w-2xl text-5xl leading-[1.05]">Turn every networking event into relationships that go somewhere.</h1>
      <p className="mt-4 max-w-xl text-lg text-muted">
        Remember who you met, understand who matters, and know exactly who to follow up with.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/signup" className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-ink shadow-[0_8px_20px_rgb(11_107_79/0.25)]">
          Create account
        </Link>
        <Link href="/login" className="rounded-full border border-line bg-card px-5 py-3 text-sm font-semibold shadow-sm">
          Sign in
        </Link>
      </div>

      <ol className="mt-10 grid gap-3 sm:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.n} className={index === 0 ? "surface bg-foreground p-4 text-card sm:col-span-1" : "rounded-3xl border border-dashed border-line p-4"}>
            <span className={`serif text-3xl ${index === 0 ? "text-[#9ddec8]" : "text-accent"}`}>{step.n}</span>
            <span className="mt-3 block font-semibold">{step.title}</span>
            <span className={`mt-1 block text-sm ${index === 0 ? "text-white/75" : "text-muted"}`}>{step.body}</span>
          </li>
        ))}
      </ol>

      <p className="mt-8 text-sm text-muted">
        Free to capture contacts by hand. Individual and organizer plans add card reading, priority, and follow-up drafts.
      </p>
      <p className="mt-3 text-sm">
        <Link href="/privacy" className="font-semibold text-accent">Privacy</Link>
        {" · "}
        <Link href="/terms" className="font-semibold text-accent">Terms</Link>
        {" · "}
        <SupportLink />
      </p>
    </main>
  );
}
