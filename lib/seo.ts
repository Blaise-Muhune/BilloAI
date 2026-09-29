import type { Metadata } from "next";

export const SITE_URL = (process.env.NEXT_PUBLIC_APP_ORIGIN || process.env.APP_ORIGIN || "https://billoai.com").replace(
  /\/$/,
  "",
);

export const SITE_NAME = "BilloAI";
export const SITE_TAGLINE = "After you network, know who from the room is worth staying connected to.";
export const SITE_DESCRIPTION =
  "After you network, BilloAI shows who matched why you went, and a note so you can keep the conversation going. You send it. Card photos are read and discarded.";

/** Real content date — Google ignores lastmod when every request says “now”. */
export const SITE_CONTENT_UPDATED = new Date("2026-09-29T00:00:00.000Z");

export const OG_IMAGE = {
  url: "/brand/og.png",
  width: 1376,
  height: 768,
  alt: "BilloAI — who from the room is worth staying connected to",
};

/** Preview deploys must not compete with production URLs. */
export const SEO_INDEX = process.env.VERCEL_ENV !== "preview";

export function absoluteUrl(path = "/") {
  if (!path.startsWith("/")) return `${SITE_URL}/${path}`;
  return `${SITE_URL}${path}`;
}

export function pageMeta({
  title,
  description,
  path,
  index = true,
}: {
  title: string;
  description: string;
  path: string;
  index?: boolean;
}): Metadata {
  const url = absoluteUrl(path);
  const shouldIndex = index && SEO_INDEX;
  return {
    title: { absolute: `${title} · ${SITE_NAME}` },
    description,
    alternates: { canonical: url },
    robots: shouldIndex
      ? { index: true, follow: true }
      : { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false, noimageindex: true } },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      locale: "en_US",
      siteName: SITE_NAME,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE.url],
    },
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export const privatePageMeta = pageMeta({
  title: "Your account",
  description: "Signed-in BilloAI. This page is not for search engines.",
  path: "/home",
  index: false,
});
