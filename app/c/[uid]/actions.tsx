"use client";

import Link from "next/link";

export function CardActions({ uid }: { uid: string }) {
  const saveHref = `/capture?card=${encodeURIComponent(uid)}`;
  return (
    <div className="space-y-3">
      <Link href={saveHref} className="flex min-h-12 items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-ink">
        Save this person in BilloAI
      </Link>
      <Link href="/profile" className="flex min-h-12 items-center justify-center rounded-full border border-line bg-card px-5 py-3 text-sm font-semibold">
        Show your own card
      </Link>
      <p className="text-sm text-muted">Phone cameras open this page. In BilloAI, scan the same QR while you add someone you met.</p>
    </div>
  );
}
