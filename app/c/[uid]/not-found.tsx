import Link from "next/link";
import { BrandMark } from "@/components/brand";
import { SkipLink } from "@/components/skip-link";

export default function CardNotFound() {
  return (
    <div className="landing-shell flex min-h-dvh flex-col">
      <SkipLink />
      <header className="px-5 pt-[max(1rem,var(--safe-top))]">
        <a href="/" className="inline-flex min-h-11 items-center" aria-label="BilloAI">
          <BrandMark className="h-8 w-8" />
        </a>
      </header>
      <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 pb-16">
        <h1 className="serif text-4xl">No card here</h1>
        <p className="mt-3 text-muted">That QR is empty, or they have not saved a name yet.</p>
        <Link href="/signup" className="mt-8 inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink">
          Make yours
        </Link>
      </main>
    </div>
  );
}
