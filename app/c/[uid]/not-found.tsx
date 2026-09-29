import Link from "next/link";
import { BrandHomeLink } from "@/components/brand";
import { SkipLink } from "@/components/skip-link";

export default function CardNotFound() {
  return (
    <div className="landing-shell min-h-full">
      <SkipLink />
      <main id="main" className="mx-auto max-w-lg space-y-6 px-5 py-12">
        <BrandHomeLink />
        <h1 className="serif text-4xl">No card here</h1>
        <p className="text-muted">That QR is not a saved BilloAI card, or they have not filled it in yet.</p>
        <Link href="/signup" className="inline-flex rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-ink">
          Make your own card
        </Link>
      </main>
    </div>
  );
}
