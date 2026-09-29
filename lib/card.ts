import { SITE_URL } from "@/lib/seo";

export const CARD_SCHEME = "billoai:";

export function isCardUid(uid: string) {
  return /^[A-Za-z0-9_-]{6,128}$/.test(uid);
}

export function cardPath(uid: string) {
  return `/c/${encodeURIComponent(uid)}`;
}

export function cardUrl(uid: string) {
  return `${SITE_URL}${cardPath(uid)}`;
}

export function parseCardScan(text: string): { kind: "billo"; uid: string } | { kind: "linkedin"; href: string } | { kind: "url"; href: string } | { kind: "unknown" } {
  const raw = text.trim();
  if (!raw) return { kind: "unknown" };
  if (raw.startsWith(CARD_SCHEME)) {
    const uid = raw.slice(CARD_SCHEME.length).trim();
    return isCardUid(uid) ? { kind: "billo", uid } : { kind: "unknown" };
  }
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    const match = url.pathname.match(/^\/c\/([^/]+)\/?$/);
    if (match?.[1]) {
      const uid = decodeURIComponent(match[1]);
      if (isCardUid(uid)) return { kind: "billo", uid };
    }
    if (url.hostname.includes("linkedin.com")) return { kind: "linkedin", href: url.href };
    return { kind: "url", href: url.href };
  } catch {
    return { kind: "unknown" };
  }
}
