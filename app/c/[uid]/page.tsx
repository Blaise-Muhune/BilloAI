import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrandHomeLink } from "@/components/brand";
import { SkipLink } from "@/components/skip-link";
import { cardPath } from "@/lib/card";
import { readPublicCard } from "@/lib/card-server";
import { displayHref, profilePhotoHref, publicLinkRows } from "@/lib/profile-links";
import { pageMeta } from "@/lib/seo";
import { CardActions } from "./actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ uid: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const uid = decodeURIComponent((await params).uid);
  const card = await readPublicCard(uid);
  return pageMeta({
    title: card?.name || "Card",
    description: card ? [card.title, card.company].filter(Boolean).join(" · ") || `${card.name} on BilloAI` : "This BilloAI card was not found.",
    path: cardPath(uid),
    index: false,
  });
}

export default async function PublicCardPage({ params }: Props) {
  const uid = decodeURIComponent((await params).uid);
  const card = await readPublicCard(uid);
  if (!card) notFound();
  const line = [card.title, card.company].filter(Boolean).join(" · ");
  const links = publicLinkRows(card);

  return (
    <div className="landing-shell min-h-full">
      <SkipLink />
      <main id="main" className="mx-auto max-w-lg space-y-6 px-5 py-12">
        <BrandHomeLink />
        <article className="surface p-6">
          <p className="kicker text-accent">BilloAI card</p>
          {card.photoUpdatedAt || card.photoPath ? (
            <img src={profilePhotoHref(uid, card.photoUpdatedAt)} alt="" className="mt-4 h-20 w-20 rounded-full object-cover" />
          ) : null}
          <h1 className="serif mt-3 text-4xl">{card.name}</h1>
          {line ? <p className="mt-2 text-muted">{line}</p> : null}
          {links.length ? (
            <ul className="mt-6 divide-y divide-line">
              {links.map((item) => (
                <li key={item.href}>
                  <a className="flex items-baseline justify-between gap-4 py-3" href={item.href} rel="noreferrer">
                    <span className="text-sm text-muted">{item.label}</span>
                    <span className="min-w-0 truncate text-sm font-semibold text-accent">{displayHref(item.href)}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-6 text-sm text-muted">This is all the card shows.</p>
        </article>
        <CardActions uid={uid} />
      </main>
    </div>
  );
}
