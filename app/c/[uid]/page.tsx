import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BrandMark } from "@/components/brand";
import { ChannelMark } from "@/components/channel-mark";
import { SkipLink } from "@/components/skip-link";
import { cardPath } from "@/lib/card";
import { readPublicCard, readPublicCardOrRedirect } from "@/lib/card-server";
import { profilePhotoHref, publicCardRows } from "@/lib/profile-links";
import { pageMeta } from "@/lib/seo";
import { CardActions } from "./actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ uid: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const key = decodeURIComponent((await params).uid);
  const card = await readPublicCard(key);
  const pathKey = card?.profile.slug || card?.uid || key;
  return pageMeta({
    title: card?.profile.name || "Card",
    description: card ? [card.profile.title, card.profile.company].filter(Boolean).join(" · ") || card.profile.name : "This BilloAI card was not found.",
    path: cardPath(pathKey),
    index: false,
  });
}

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}

export default async function PublicCardPage({ params }: Props) {
  const key = decodeURIComponent((await params).uid);
  const card = await readPublicCardOrRedirect(key);
  if (!card) notFound();
  const { uid, profile } = card;
  const rows = publicCardRows(profile);
  const photo = profile.photoUpdatedAt || profile.photoPath ? profilePhotoHref(uid, profile.photoUpdatedAt) : "";

  return (
    <div className="landing-shell flex min-h-dvh flex-col overscroll-contain [touch-action:manipulation]">
      <SkipLink />
      <header className="flex items-center justify-between px-5 pt-[max(1rem,var(--safe-top))]">
        <a href="/" className="inline-flex min-h-11 items-center" aria-label="BilloAI">
          <BrandMark className="h-8 w-8" />
        </a>
      </header>
      <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-6 pt-6">
        <article className="surface overflow-hidden px-6 pb-2 pt-8">
          <div className="flex flex-col items-center text-center">
            <span className="relative grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-[#e5f4ee] text-2xl font-semibold text-accent">
              {initials(profile.name)}
              {photo ? (
                <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : null}
            </span>
            <h1 className="serif mt-5 text-[2.15rem] leading-[1.1]">{profile.name}</h1>
            {profile.title ? <p className="mt-2 text-base text-foreground">{profile.title}</p> : null}
            {profile.company ? <p className="mt-1 text-sm font-semibold text-muted">{profile.company}</p> : null}
          </div>
          {rows.length ? (
            <ul className="mt-8 divide-y divide-line">
              {rows.map((row) => (
                <li key={row.href}>
                  <a
                    href={row.href}
                    rel={row.kind === "email" || row.kind === "phone" ? undefined : "noreferrer"}
                    className="flex min-h-14 cursor-pointer items-center gap-3 py-3"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f7f3ea]">
                      <ChannelMark kind={row.kind} />
                    </span>
                    <span className="min-w-0 text-left">
                      <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-muted">{row.label}</span>
                      <span className="block truncate text-sm font-semibold text-foreground">{row.display}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </article>
      </main>
      <div className="sticky bottom-0 z-10 mx-auto w-full max-w-md">
        <CardActions uid={uid} name={profile.name} />
      </div>
    </div>
  );
}
