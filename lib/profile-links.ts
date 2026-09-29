import { isCardUid } from "@/lib/card";
import { asHref } from "@/lib/links";
import type { ContactFields, PublicProfile } from "@/lib/types";

export interface ProfileLink {
  label: string;
  url: string;
}

export const EXTRA_LINK_KINDS = [
  { id: "x", label: "X", hint: "x.com/…" },
  { id: "instagram", label: "Instagram", hint: "instagram.com/…" },
  { id: "whatsapp", label: "WhatsApp", hint: "Number or wa.me" },
  { id: "calendly", label: "Calendly", hint: "calendly.com/…" },
  { id: "github", label: "GitHub", hint: "github.com/…" },
  { id: "youtube", label: "YouTube", hint: "youtube.com/…" },
  { id: "other", label: "Other", hint: "Any link that matters" },
] as const;

const HOST_LABELS: Array<{ test: RegExp; label: string }> = [
  { test: /linkedin\.com/i, label: "LinkedIn" },
  { test: /(^|\.)x\.com$|(^|\.)twitter\.com$/i, label: "X" },
  { test: /instagram\.com/i, label: "Instagram" },
  { test: /wa\.me$|whatsapp\.com/i, label: "WhatsApp" },
  { test: /calendly\.com/i, label: "Calendly" },
  { test: /github\.com/i, label: "GitHub" },
  { test: /youtube\.com|youtu\.be/i, label: "YouTube" },
  { test: /t\.me$|telegram\.me/i, label: "Telegram" },
];

export function emptyProfile(): PublicProfile {
  return { name: "", company: "", title: "", email: "", linkedin: "", website: "", links: [], photoPath: "", photoUpdatedAt: "" };
}

export function labelFromUrl(url: string) {
  try {
    const host = new URL(asHref(url)).hostname.replace(/^www\./, "");
    return HOST_LABELS.find((item) => item.test.test(host))?.label || "Link";
  } catch {
    return "Link";
  }
}

export function displayHref(href: string) {
  return href.replace(/^mailto:/, "").replace(/^https?:\/\//, "").replace(/^www\./, "");
}

export function normalizeLinkUrl(label: string, raw: string) {
  const text = raw.trim();
  if (!text) return "";
  if (/whatsapp/i.test(label) && /^\+?[\d\s()-]+$/.test(text)) {
    const digits = text.replace(/\D/g, "");
    return digits ? `https://wa.me/${digits}` : "";
  }
  return asHref(text);
}

export function sanitizeLinks(links: ProfileLink[] | undefined) {
  const seen = new Set<string>();
  const next: ProfileLink[] = [];
  for (const item of links ?? []) {
    if (next.length >= 8) break;
    const url = normalizeLinkUrl(item.label, item.url);
    if (!url) continue;
    const key = url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    next.push({ label: item.label.trim() || labelFromUrl(url), url });
  }
  return next;
}

export function normalizeProfile(data: Partial<PublicProfile> | null | undefined): PublicProfile {
  return {
    name: String(data?.name ?? "").trim(),
    company: String(data?.company ?? "").trim(),
    title: String(data?.title ?? "").trim(),
    email: String(data?.email ?? "").trim(),
    linkedin: String(data?.linkedin ?? "").trim(),
    website: String(data?.website ?? "").trim(),
    links: sanitizeLinks(data?.links),
    photoPath: String(data?.photoPath ?? "").trim(),
    photoUpdatedAt: String(data?.photoUpdatedAt ?? "").trim(),
  };
}

export function saveReadyProfile(profile: PublicProfile): PublicProfile {
  const next = normalizeProfile(profile);
  const skip = new Set(
    [next.linkedin, next.website]
      .filter(Boolean)
      .map((value) => normalizeLinkUrl("Link", value).toLowerCase()),
  );
  next.links = next.links.filter((item) => !skip.has(item.url.toLowerCase()));
  return next;
}

export function profilePhotoHref(uid: string, updatedAt?: string) {
  const version = updatedAt?.trim() ? `?v=${encodeURIComponent(updatedAt.trim())}` : "";
  return `/api/profile/photo/${encodeURIComponent(uid)}${version}`;
}

export function cardFaceSrc(uid?: string | null) {
  const id = String(uid ?? "").trim();
  return id && isCardUid(id) ? profilePhotoHref(id) : "";
}

export function publicLinkRows(profile: PublicProfile) {
  const rows: { label: string; href: string }[] = [];
  if (profile.email) rows.push({ label: "Email", href: `mailto:${profile.email}` });
  if (profile.linkedin) rows.push({ label: "LinkedIn", href: asHref(profile.linkedin) });
  if (profile.website) rows.push({ label: "Website", href: asHref(profile.website) });
  for (const item of profile.links ?? []) rows.push({ label: item.label, href: item.url });
  return rows;
}

export function contactFromProfile(profile: PublicProfile): ContactFields {
  return {
    name: profile.name,
    company: profile.company,
    title: profile.title,
    email: profile.email,
    phone: "",
    website: profile.website,
    linkedin: profile.linkedin,
    location: "",
    otherContact: (profile.links ?? []).map((item) => `${item.label}: ${item.url}`).join("\n"),
  };
}
