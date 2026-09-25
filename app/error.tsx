"use client";

import Link from "next/link";
import { SupportLink } from "@/components/support";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-lg px-5 py-16">
      <h1 className="serif text-4xl">Something went wrong</h1>
      <p className="mt-3 text-muted">The page failed to load. Your notes were not shown here.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="rounded-full bg-accent px-4 py-3 text-sm font-semibold text-accent-ink">
          Try again
        </button>
        <Link href="/" className="rounded-full border border-line bg-card px-4 py-3 text-sm font-semibold">
          Back home
        </Link>
      </div>
      <p className="mt-6 text-sm text-muted">
        If this keeps happening, email <SupportLink />.
      </p>
    </main>
  );
}
