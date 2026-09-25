"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/components/auth-provider";
import { IconCalendar, IconHome, IconPeople, IconPlus, IconTasks } from "@/components/icons";
import { getUser, listEvents, markOnboarded } from "@/lib/data";
import { isFirebaseConfigured } from "@/lib/firebase/client";

const links = [
  { href: "/home", label: "Home", icon: IconHome },
  { href: "/events", label: "Events", icon: IconCalendar },
  { href: "/capture", label: "Capture", icon: IconPlus },
  { href: "/people", label: "People", icon: IconPeople },
  { href: "/tasks", label: "Tasks", icon: IconTasks },
];

const accountLinks = [
  { href: "/profile", label: "Card" },
  { href: "/billing", label: "Plan" },
  { href: "/organizer", label: "Seats" },
  { href: "/join", label: "Join" },
];

function Shell({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (ready && isFirebaseConfigured() && !user) router.replace("/login");
  }, [ready, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancel = false;
    void (async () => {
      const account = await getUser(user.uid);
      if (account?.onboardedAt || pathname.startsWith("/onboarding")) {
        if (!cancel) setAllowed(true);
        return;
      }
      const events = await listEvents(user.uid);
      if (events.length > 0) {
        await markOnboarded(user.uid).catch(() => undefined);
        if (!cancel) setAllowed(true);
        return;
      }
      router.replace("/onboarding");
      if (!cancel) setAllowed(true);
    })().catch(() => {
      if (!cancel) setAllowed(true);
    });
    return () => {
      cancel = true;
    };
  }, [user, pathname, router]);

  if (!ready || (isFirebaseConfigured() && !user) || (user && !allowed && !pathname.startsWith("/onboarding"))) {
    return <p className="px-5 py-10 text-muted">Loading…</p>;
  }

  const initial = (user?.displayName || user?.email || "You").slice(0, 1).toUpperCase();

  return (
    <div className="min-h-full md:grid md:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="hidden border-r border-line bg-card/70 px-4 py-6 md:flex md:flex-col md:gap-6">
        <Link href="/home" className="serif px-2 text-2xl">
          BilloAI
        </Link>
        <div className="space-y-1">
          {links.map((link) => {
            const active = pathname === link.href || (link.href !== "/home" && pathname.startsWith(`${link.href}/`));
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold ${
                  active ? "bg-foreground text-card" : "text-muted hover:bg-white"
                }`}
              >
                <Icon />
                {link.label}
              </Link>
            );
          })}
        </div>
        <div className="mt-auto space-y-1 border-t border-line pt-4">
          {accountLinks.map((link) => (
            <Link key={link.href} href={link.href} className={`block rounded-xl px-3 py-2 text-sm font-semibold ${pathname === link.href ? "text-foreground" : "text-muted"}`}>
              {link.label}
            </Link>
          ))}
          <Link href="/account" className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-foreground text-xs text-card">{initial}</span>
            Account
          </Link>
        </div>
      </aside>
      <div className="mx-auto w-full max-w-5xl pb-28 md:pb-10">
      <header className="flex items-center justify-between gap-3 px-5 pt-5 md:hidden">
        <Link href="/home" className="serif text-2xl">
          BilloAI
        </Link>
        <Link
          href="/account"
          className="grid h-10 w-10 place-items-center rounded-full bg-foreground text-sm font-semibold text-card"
          aria-label="Account"
        >
          {initial}
        </Link>
      </header>
      <div className="flex gap-2 overflow-x-auto px-5 pt-3 md:hidden">
        {accountLinks.map((link) => (
          <Link key={link.href} href={link.href} className="shrink-0 rounded-full border border-line bg-card px-3 py-1.5 text-sm font-semibold">
            {link.label}
          </Link>
        ))}
      </div>
      <main className="px-5 py-6">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 border-t border-line bg-[#f7f3ea]/95 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5 px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1">
          {links.map((link) => {
            const active = pathname === link.href || (link.href !== "/home" && pathname.startsWith(`${link.href}/`));
            const Icon = link.icon;
            const capture = link.href === "/capture";
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-semibold ${
                  active ? "text-foreground" : "text-muted"
                }`}
              >
                <span
                  className={`grid h-9 w-9 place-items-center rounded-full ${
                    capture
                      ? active
                        ? "bg-foreground text-card"
                        : "bg-accent text-accent-ink"
                      : active
                        ? "bg-white text-foreground shadow-sm"
                        : ""
                  }`}
                >
                  <Icon />
                </span>
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Shell>{children}</Shell>
    </AuthProvider>
  );
}
