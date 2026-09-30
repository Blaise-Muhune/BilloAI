"use client";

import Link from "next/link";
import { AuthProvider, useAuth } from "@/components/auth-provider";

function Actions({ uid, name }: { uid: string; name: string }) {
  const { user } = useAuth();
  const vcfHref = `/api/profile/vcf/${encodeURIComponent(uid)}`;
  const first = name.split(" ")[0] || "them";

  return (
    <div className="border-t border-line bg-[color-mix(in_srgb,var(--card)_92%,transparent)] px-5 pb-[max(1rem,var(--safe-bottom))] pt-4 backdrop-blur">
      <a
        href={vcfHref}
        className="flex min-h-12 cursor-pointer items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink"
      >
        Save to phone
      </a>
      {!user ? (
        <p className="mt-3 text-center text-sm text-muted">
          Need a card they can scan?{" "}
          <Link href="/signup" className="font-semibold text-accent">
            Make yours
          </Link>
        </p>
      ) : (
        <Link
          href={`/capture?card=${encodeURIComponent(uid)}`}
          className="mt-3 flex min-h-11 cursor-pointer items-center justify-center text-sm font-semibold text-accent"
        >
          Save {first} in BilloAI
        </Link>
      )}
    </div>
  );
}

export function CardActions({ uid, name }: { uid: string; name: string }) {
  return (
    <AuthProvider>
      <Actions uid={uid} name={name} />
    </AuthProvider>
  );
}
