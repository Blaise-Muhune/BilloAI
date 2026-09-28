"use client";

import { signOut } from "firebase/auth";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/components/auth-provider";
import { IconCalendar, IconGroup, IconHome, IconPeople, IconPlus, IconTasks } from "@/components/icons";
import { getUser, listEvents, markOnboarded, saveWorkspace } from "@/lib/data";
import { firebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import type { GroupKind, UserDoc, Workspace } from "@/lib/types";
import { groupSeatsHref, readWorkspace } from "@/lib/workspace";

const networkLinks = [
  { href: "/home", label: "Home", icon: IconHome },
  { href: "/events", label: "Events", icon: IconCalendar },
  { href: "/capture", label: "Capture", icon: IconPlus },
  { href: "/people", label: "People", icon: IconPeople },
  { href: "/tasks", label: "Tasks", icon: IconTasks },
];

const groupLinks = [
  { href: "/group", label: "Overview", icon: IconGroup },
  { href: groupSeatsHref(), label: "Seats", icon: IconCalendar },
];

const networkAccount = [
  { href: "/profile", label: "Your card" },
  { href: "/billing", label: "Plan" },
  { href: "/join", label: "Join with a code" },
];

const groupAccount: { href: string; label: string }[] = [];

function pageLabel(pathname: string, workspace: Workspace) {
  if (pathname.startsWith("/home")) return "Home";
  if (pathname.startsWith("/events/new")) return "New event";
  if (pathname.startsWith("/events/")) return "Event";
  if (pathname.startsWith("/events")) return "Events";
  if (pathname.startsWith("/capture")) return "Add someone";
  if (pathname.startsWith("/people/")) return "Person";
  if (pathname.startsWith("/people")) return "People";
  if (pathname.startsWith("/tasks")) return "Tasks";
  if (pathname.startsWith("/profile")) return "Your card";
  if (pathname.startsWith("/billing")) return workspace === "group" ? "Seats" : "Plan";
  if (pathname.startsWith("/group") || pathname.startsWith("/organizer")) return "Overview";
  if (pathname.startsWith("/join")) return "Join";
  if (pathname.startsWith("/account")) return "Account";
  return "BilloAI";
}

function pathWorkspace(pathname: string): Workspace | null {
  if (pathname.startsWith("/group") || pathname.startsWith("/organizer")) return "group";
  if (pathname.startsWith("/events/new")) return null;
  if (
    pathname.startsWith("/home") ||
    pathname.startsWith("/events") ||
    pathname.startsWith("/capture") ||
    pathname.startsWith("/people") ||
    pathname.startsWith("/tasks") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/join")
  ) {
    return "network";
  }
  return null;
}

function Shell({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);
  const [account, setAccount] = useState<UserDoc | null>(null);
  const setup = pathname.startsWith("/onboarding");
  const joining = pathname.startsWith("/join");
  const fromPath = pathWorkspace(pathname);
  const workspace: Workspace = fromPath ?? readWorkspace(account?.workspace);

  useEffect(() => {
    if (ready && isFirebaseConfigured() && !user && !joining) router.replace("/login");
  }, [ready, user, router, joining]);

  useEffect(() => {
    if (!user) return;
    let cancel = false;
    void (async () => {
      const next = await getUser(user.uid);
      if (!cancel) setAccount(next);
      if (joining) {
        if (!cancel) setAllowed(true);
        return;
      }
      if (next?.onboardedAt || pathname.startsWith("/onboarding")) {
        if (!cancel) setAllowed(true);
        return;
      }
      const events = await listEvents(user.uid, { all: true });
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
  }, [user, pathname, router, joining]);

  async function switchWorkspace(next: Workspace, kind?: GroupKind | "") {
    if (!user) return;
    await saveWorkspace(user.uid, next, kind);
    setAccount((current) => (current ? { ...current, workspace: next, groupKind: kind ?? current.groupKind } : current));
    router.push(next === "group" ? "/group" : "/home");
  }

  useEffect(() => {
    if (!user || !account || !fromPath) return;
    if (readWorkspace(account.workspace) === fromPath) return;
    void saveWorkspace(user.uid, fromPath).then(() => {
      setAccount((current) => (current ? { ...current, workspace: fromPath } : current));
    });
  }, [user, account, fromPath]);

  if (!ready) {
    return (
      <div className="grid min-h-full place-items-center">
        <p className="text-muted">Loading…</p>
      </div>
    );
  }

  if (joining && !user) {
    return <div className="min-h-full">{children}</div>;
  }

  if ((isFirebaseConfigured() && !user) || (user && !allowed && !setup && !joining)) {
    return (
      <div className="grid min-h-full place-items-center">
        <p className="text-muted">Loading…</p>
      </div>
    );
  }

  const initial = (user?.displayName || user?.email || "You").slice(0, 1).toUpperCase();

  async function leave() {
    await signOut(firebaseAuth());
    router.replace("/login");
  }

  if (setup || (joining && !user)) {
    return <div className="min-h-full">{children}</div>;
  }

  const links = workspace === "group" ? groupLinks : networkLinks;
  const accountLinks = workspace === "group" ? groupAccount : networkAccount;

  return (
    <div className="min-h-full md:grid md:grid-cols-[17.5rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-card md:flex">
        <Link href={workspace === "group" ? "/group" : "/home"} className="flex items-center gap-2.5 px-5 pt-6">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-sm font-semibold text-accent-ink" aria-hidden>
            B
          </span>
          <span className="serif text-2xl leading-none">BilloAI</span>
        </Link>
        <div className="mx-4 mt-6 grid grid-cols-2 rounded-full bg-[#f7f3ea] p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => void switchWorkspace("network")}
            className={`rounded-full px-2 py-1.5 ${workspace === "network" ? "bg-card text-foreground shadow-sm" : "text-muted"}`}
          >
            My network
          </button>
          <button
            type="button"
            onClick={() => void switchWorkspace("group")}
            className={`rounded-full px-2 py-1.5 ${workspace === "group" ? "bg-card text-foreground shadow-sm" : "text-muted"}`}
          >
            Group
          </button>
        </div>
        {workspace === "network" ? (
          <div className="mt-5 px-4">
            <Link
              href="/capture"
              className="flex items-center justify-center rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink shadow-[0_8px_20px_rgb(11_107_79/0.22)] hover:brightness-110"
            >
              Add someone you met
            </Link>
          </div>
        ) : (
          <div className="mt-5 px-4">
            <Link
              href={groupSeatsHref()}
              className="flex items-center justify-center rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink shadow-[0_8px_20px_rgb(11_107_79/0.22)] hover:brightness-110"
            >
              Add seats
            </Link>
          </div>
        )}
        <p className="kicker mt-7 px-7">{workspace === "group" ? "The group" : "Tonight"}</p>
        <nav className="mt-2 space-y-1 px-3">
          {links.map((link) => {
            const hrefPath = link.href.split("?")[0] ?? link.href;
            const active =
              pathname === hrefPath ||
              (hrefPath !== "/home" && hrefPath !== "/group" && pathname.startsWith(`${hrefPath}/`));
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold ${
                  active ? "bg-foreground text-card" : "text-muted hover:bg-[#f7f3ea] hover:text-foreground"
                }`}
              >
                <Icon />
                {link.label}
              </Link>
            );
          })}
        </nav>
        {accountLinks.length > 0 ? (
          <>
            <p className="kicker mt-8 px-7">Account</p>
            <nav className="mt-2 space-y-0.5 px-3">
              {accountLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={pathname === link.href.split("?")[0] ? "page" : undefined}
                  className={`block rounded-xl px-3 py-2 text-sm font-semibold ${
                    pathname === link.href.split("?")[0] ? "bg-[#f7f3ea] text-foreground" : "text-muted hover:bg-[#f7f3ea] hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </>
        ) : null}
        <div className="mx-3 mb-4 mt-auto space-y-1">
          <Link href="/account" className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold hover:bg-[#f7f3ea]">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-foreground text-xs text-card">{initial}</span>
            <span className="min-w-0">
              <span className="block truncate">{user?.displayName || "Account"}</span>
              <span className="block truncate text-xs font-medium text-muted">{user?.email}</span>
            </span>
          </Link>
          <button type="button" onClick={() => void leave()} className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-muted hover:bg-[#f7f3ea] hover:text-foreground">
            Sign out
          </button>
        </div>
      </aside>
      <div className="flex min-h-full flex-col pb-28 md:pb-0">
        <header className="flex items-center justify-between gap-3 px-5 pt-5 md:hidden">
          <Link href={workspace === "group" ? "/group" : "/home"} className="serif text-2xl">
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
          <button type="button" onClick={() => void switchWorkspace("network")} className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${workspace === "network" ? "bg-foreground text-card" : "border border-line bg-card"}`}>
            My network
          </button>
          <button type="button" onClick={() => void switchWorkspace("group")} className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${workspace === "group" ? "bg-foreground text-card" : "border border-line bg-card"}`}>
            Group
          </button>
          {accountLinks.map((link) => (
            <Link key={link.href} href={link.href} className="shrink-0 rounded-full border border-line bg-card px-3 py-1.5 text-sm font-semibold">
              {link.label}
            </Link>
          ))}
          <button type="button" onClick={() => void leave()} className="shrink-0 rounded-full border border-line bg-card px-3 py-1.5 text-sm font-semibold">
            Sign out
          </button>
        </div>
        <div className="hidden h-16 items-center justify-between border-b border-line bg-card/80 px-8 backdrop-blur xl:px-12 md:flex">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{pageLabel(pathname, workspace)}</p>
            <p className="truncate text-xs text-muted">{workspace === "group" ? "Group view · counts only" : user?.email}</p>
          </div>
          {workspace === "network" && !pathname.startsWith("/capture") ? (
            <Link href="/capture" className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink">
              Add someone you met
            </Link>
          ) : null}
          {workspace === "group" ? (
            <Link href={groupSeatsHref()} className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink">
              Add seats
            </Link>
          ) : null}
        </div>
        <main className="app-canvas flex-1 px-5 py-6 md:px-8 md:py-8 xl:px-12 xl:py-10">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 border-t border-line bg-[#f7f3ea]/95 backdrop-blur md:hidden">
          <div className={`mx-auto grid max-w-lg px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1 ${workspace === "group" ? "grid-cols-2" : "grid-cols-5"}`}>
            {links.map((link) => {
              const hrefPath = link.href.split("?")[0] ?? link.href;
              const active =
                pathname === hrefPath ||
                (hrefPath !== "/home" && hrefPath !== "/group" && pathname.startsWith(`${hrefPath}/`));
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
