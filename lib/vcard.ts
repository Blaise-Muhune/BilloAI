import { cardUrl } from "@/lib/card";
import { asHref } from "@/lib/links";
import { phoneDigits } from "@/lib/phone";
import { publicCardRows } from "@/lib/profile-links";
import type { PublicProfile } from "@/lib/types";

function escapeText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function fold(line: string) {
  const chunks: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    chunks.push(rest.slice(0, 75));
    rest = ` ${rest.slice(75)}`;
  }
  chunks.push(rest);
  return chunks.join("\r\n");
}

function nameParts(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { family: parts[0] || "", given: "" };
  return { family: parts.at(-1) || "", given: parts.slice(0, -1).join(" ") };
}

export function vcardFilename(name: string) {
  const slug = name
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${slug || "contact"}.vcf`;
}

export function buildVcard(uid: string, profile: PublicProfile) {
  const { family, given } = nameParts(profile.name);
  const rows = publicCardRows(profile);
  const phone = rows.find((row) => row.kind === "phone");
  const email = rows.find((row) => row.kind === "email");
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeText(profile.name)}`,
    `N:${escapeText(family)};${escapeText(given)};;;`,
  ];
  if (profile.company) lines.push(`ORG:${escapeText(profile.company)}`);
  if (profile.title) lines.push(`TITLE:${escapeText(profile.title)}`);
  if (phone) {
    const digits = phoneDigits(phone.display) || phoneDigits(phone.href);
    if (digits) lines.push(`TEL;TYPE=CELL:${digits}`);
  }
  if (email) lines.push(`EMAIL;TYPE=INTERNET:${escapeText(email.display)}`);
  for (const row of rows) {
    if (row.kind === "email" || row.kind === "phone") continue;
    lines.push(`URL:${asHref(row.href)}`);
  }
  lines.push(`URL:${cardUrl(profile.slug || uid)}`);
  lines.push("END:VCARD");
  return `${lines.map(fold).join("\r\n")}\r\n`;
}
