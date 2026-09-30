import { isCardUid } from "@/lib/card";
import { asHref } from "@/lib/links";
import { phoneDigits, telHref, whatsappDigits } from "@/lib/phone";
import type { ContactFields, PublicProfile } from "@/lib/types";

export interface ProfileLink {
  label: string;
  url: string;
}

export type CardRowKind = "phone" | "email" | "linkedin" | "website" | "x" | "instagram" | "github" | "youtube" | "calendly" | "link";

export interface CardRow {
  kind: CardRowKind;
  label: string;
  href: string;
  display: string;
}

export const EXTRA_LINK_KINDS = [
  { id: "x", label: "X", hint: "x.com/…" },
  { id: "instagram", label: "Instagram", hint: "instagram.com/…" },
  { id: "calendly", label: "Calendly", hint: "calendly.com/…" },
  { id: "github", label: "GitHub", hint: "github.com/…" },
  { id: "youtube", label: "YouTube", hint: "youtube.com/…" },
  { id: "other", label: "Other", hint: "Any link that matters" },
] as const;

const HOST_LABELS: Array<{ test: RegExp; label: string; kind: CardRowKind }> = [
  { test: /linkedin\.com/i, label: "LinkedIn", kind: "linkedin" },
  { test: /(^|\.)x\.com$|(^|\.)twitter\.com$/i, label: "X", kind: "x" },
  { test: /instagram\.com/i, label: "Instagram", kind: "instagram" },
  { test: /calendly\.com/i, label: "Calendly", kind: "calendly" },
  { test: /github\.com/i, label: "GitHub", kind: "github" },
  { test: /youtube\.com|youtu\.be/i, label: "YouTube", kind: "youtube" },
];

export function emptyProfile(): PublicProfile {
  return { name: "", company: "", title: "", email: "", phone: "", linkedin: "", website: "", links: [], slug: "", photoPath: "", photoUpdatedAt: "" };
}

export function labelFromUrl(url: string) {
  try {
    const host = new URL(asHref(url)).hostname.replace(/^www\./, "");
    return HOST_LABELS.find((item) => item.test.test(host))?.label || "Link";
  } catch {
    return "Link";
  }
}

function kindFromUrl(url: string, label: string): CardRowKind {
  if (url.startsWith("mailto:")) return "email";
  if (url.startsWith("tel:")) return "phone";
  try {
    const host = new URL(asHref(url)).hostname.replace(/^www\./, "");
    const match = HOST_LABELS.find((item) => item.test.test(host));
    if (match) return match.kind;
  } catch {
    /* keep going */
  }
  if (/linkedin/i.test(label)) return "linkedin";
  return "link";
}

export function displayHref(href: string) {
  return href
    .replace(/^mailto:/i, "")
    .replace(/^tel:/i, "")
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "");
}

export function normalizeLinkUrl(label: string, raw: string) {
  const text = raw.trim();
  if (!text) return "";
  if (/phone|cell|mobile|whatsapp/i.test(label) && /^\+?[\d\s().-]+$/.test(text)) {
    return telHref(text);
  }
  if (/wa\.me|whatsapp/i.test(text)) {
    const digits = whatsappDigits(text);
    return digits ? telHref(digits) : asHref(text);
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

function liftPhone(links: ProfileLink[], existing: string) {
  let phone = phoneDigits(existing) ? existing.trim() : "";
  const kept: ProfileLink[] = [];
  for (const item of links) {
    const fromTel = item.url.startsWith("tel:") ? phoneDigits(item.url) : "";
    const fromWa = whatsappDigits(item.url);
    const candidate = fromTel || fromWa;
    const phoneLike = /phone|cell|mobile|whatsapp/i.test(item.label);
    if (candidate && phoneLike) {
      if (!phone) phone = candidate;
      continue;
    }
    kept.push(item);
  }
  return { phone, links: kept };
}

export function normalizeProfile(data: Partial<PublicProfile> | null | undefined): PublicProfile {
  const lifted = liftPhone(sanitizeLinks(data?.links), String(data?.phone ?? "").trim());
  return {
    name: String(data?.name ?? "").trim(),
    company: String(data?.company ?? "").trim(),
    title: String(data?.title ?? "").trim(),
    email: String(data?.email ?? "").trim(),
    phone: lifted.phone,
    linkedin: String(data?.linkedin ?? "").trim(),
    website: String(data?.website ?? "").trim(),
    links: lifted.links,
    slug: String(data?.slug ?? "").trim().toLowerCase(),
    photoPath: String(data?.photoPath ?? "").trim(),
    photoUpdatedAt: String(data?.photoUpdatedAt ?? "").trim(),
  };
}

export function saveReadyProfile(profile: PublicProfile): PublicProfile {
  const next = normalizeProfile(profile);
  next.slug = "";
  const skip = new Set(
    [next.linkedin, next.website]
      .filter(Boolean)
      .map((value) => normalizeLinkUrl("Link", value).toLowerCase()),
  );
  next.links = next.links.filter((item) => !skip.has(item.url.toLowerCase()));
  return next;
}

export const PROFILE_PHOTO_EVENT = "billo-profile-photo";

export function profilePhotoHref(uid: string, updatedAt?: string) {
  const version = updatedAt?.trim() ? `?v=${encodeURIComponent(updatedAt.trim())}` : "";
  return `/api/profile/photo/${encodeURIComponent(uid)}${version}`;
}

export function announceProfilePhoto(photoUpdatedAt: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PROFILE_PHOTO_EVENT, { detail: { photoUpdatedAt } }));
}

export function cardFaceSrc(uid?: string | null) {
  const id = String(uid ?? "").trim();
  return id && isCardUid(id) ? profilePhotoHref(id) : "";
}

export function publicCardRows(profile: PublicProfile): CardRow[] {
  const rows: CardRow[] = [];
  const seen = new Set<string>();
  function add(kind: CardRowKind, label: string, href: string, display = displayHref(href)) {
    const key = href.toLowerCase();
    if (!href || seen.has(key)) return;
    seen.add(key);
    rows.push({ kind, label, href, display });
  }

  const cell = telHref(profile.phone);
  if (cell) add("phone", "Cell", cell, profile.phone.trim() || displayHref(cell));
  if (profile.email) add("email", "Email", `mailto:${profile.email}`, profile.email);
  if (profile.linkedin) add("linkedin", "LinkedIn", asHref(profile.linkedin));
  if (profile.website) add("website", "Website", asHref(profile.website));
  for (const item of profile.links ?? []) {
    const kind = kindFromUrl(item.url, item.label);
    const label = kind === "phone" ? "Cell" : item.label.trim() || labelFromUrl(item.url);
    add(kind, label, item.url);
  }
  return rows;
}

export function publicLinkRows(profile: PublicProfile) {
  return publicCardRows(profile).map((item) => ({ label: item.label, href: item.href }));
}

export function contactFromProfile(profile: PublicProfile): ContactFields {
  return {
    name: profile.name,
    company: profile.company,
    title: profile.title,
    email: profile.email,
    phone: profile.phone,
    website: profile.website,
    linkedin: profile.linkedin,
    location: "",
    otherContact: (profile.links ?? []).map((item) => `${item.label}: ${item.url}`).join("\n"),
  };
}
