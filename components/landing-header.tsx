import Link from "next/link";
import { BrandLockup } from "@/components/brand";

export function LandingCta({
  href,
  label,
  compact = false,
}: {
  href: string;
  label: string;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        compact
          ? "inline-flex min-h-11 max-w-[8.6rem] shrink-0 items-center justify-center rounded-full bg-accent px-3 py-2 text-center text-[0.72rem] font-semibold leading-tight text-accent-ink shadow-[0_8px_20px_rgb(11_107_79/0.22)] sm:max-w-none sm:px-4 sm:text-sm"
          : "inline-flex items-center justify-center rounded-full bg-accent px-7 py-3.5 text-base font-semibold text-accent-ink shadow-[0_10px_28px_rgb(11_107_79/0.28)]"
      }
    >
      {label}
    </Link>
  );
}

export function LandingHeader({
  links,
  signInHref,
  ctaHref,
  ctaLabel,
  compactCta = false,
}: {
  links: Array<{ href: string; label: string }>;
  signInHref: string;
  ctaHref: string;
  ctaLabel: string;
  compactCta?: boolean;
}) {
  function nav(className: string) {
    return (
      <nav aria-label="Primary" className={className}>
        {links.map((item) => (
          <Link key={`${item.href}-${item.label}`} href={item.href} className="text-muted hover:text-foreground">
            {item.label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl min-w-0">
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4">
          <Link href="/">
            <BrandLockup />
          </Link>
          <div className="flex min-w-0 items-center gap-2 sm:gap-5">
            {nav("hidden items-center gap-5 text-sm font-semibold lg:flex")}
            <Link href={signInHref} className="shrink-0 text-sm font-semibold text-muted hover:text-foreground">
              Sign in
            </Link>
            <LandingCta href={ctaHref} label={ctaLabel} compact={compactCta} />
          </div>
        </div>
        {nav("flex flex-wrap gap-x-4 gap-y-1 border-t border-line/70 px-4 py-2 text-sm font-semibold lg:hidden")}
      </div>
    </header>
  );
}
