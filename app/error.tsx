"use client";

import { useEffect } from "react";
import Link from "next/link";
import { BrandHomeLink } from "@/components/brand";
import { SupportLink } from "@/components/support";
import { reportClientError } from "@/lib/errors";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportClientError(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-lg px-5 py-16">
      <BrandHomeLink />
      <h1 className="serif mt-8 text-4xl">Something went wrong</h1>
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
        If this keeps happening,{" "}
        <Link href="/contact" className="font-semibold text-accent">
          write us
        </Link>{" "}
        or email <SupportLink />
        {error.digest ? ` and include ${error.digest}.` : "."}
      </p>
    </main>
  );
}
