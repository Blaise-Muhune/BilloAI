import { SITE_URL } from "@/lib/seo";

export const CARD_SCHEME = "billoai:";

const RESERVED_SLUGS = new Set([
  "c",
  "api",
  "www",
  "admin",
  "login",
  "signup",
  "card",
  "new",
  "help",
  "support",
  "profile",
  "settings",
  "onboarding",
  "capture",
  "home",
]);

export function isCardUid(uid: string) {
  return /^[A-Za-z0-9_-]{6,128}$/.test(uid);
}

export function isCardSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length >= 2 && value.length <= 64;
}

export function isCardKey(value: string) {
  return isCardUid(value) || isCardSlug(value);
}

export function slugFromName(name: string) {
  const slug = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug;
}

export function slugCandidates(name: string) {
  const base = slugFromName(name) || "card";
  const root = RESERVED_SLUGS.has(base) ? `${base}-card` : base;
  const list = [root];
  for (let n = 2; n <= 30; n += 1) list.push(`${root}-${n}`);
  return list;
}

export function cardPath(key: string) {
  return `/c/${encodeURIComponent(key)}`;
}

export function cardUrl(key: string) {
  return `${SITE_URL}${cardPath(key)}`;
}

export function parseCardScan(
  text: string,
): { kind: "billo"; uid: string } | { kind: "linkedin"; href: string } | { kind: "url"; href: string } | { kind: "unknown" } {
  const raw = text.trim();
  if (!raw) return { kind: "unknown" };
  if (raw.startsWith(CARD_SCHEME)) {
    const uid = raw.slice(CARD_SCHEME.length).trim();
    return isCardKey(uid) ? { kind: "billo", uid } : { kind: "unknown" };
  }
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    const match = url.pathname.match(/^\/c\/([^/]+)\/?$/);
    if (match?.[1]) {
      const key = decodeURIComponent(match[1]);
      if (isCardKey(key)) return { kind: "billo", uid: key };
    }
    if (url.hostname.includes("linkedin.com")) return { kind: "linkedin", href: url.href };
    return { kind: "url", href: url.href };
  } catch {
    return { kind: "unknown" };
  }
}
