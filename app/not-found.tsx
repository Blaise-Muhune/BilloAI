import Link from "next/link";
import { SupportLink } from "@/components/support";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-col justify-center px-5 py-16">
      <p className="kicker text-accent">404</p>
      <h1 className="serif mt-2 text-4xl">That page is not here.</h1>
      <p className="mt-3 text-muted">The link may be old, or the page was never added. Your contacts were not opened.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/" className="rounded-full bg-accent px-4 py-3 text-sm font-semibold text-accent-ink">
          Back home
        </Link>
        <Link href="/login" className="rounded-full border border-line bg-card px-4 py-3 text-sm font-semibold">
          Sign in
        </Link>
      </div>
      <p className="mt-6 text-sm text-muted">
        Need help? Email <SupportLink />.
      </p>
    </main>
  );
}
