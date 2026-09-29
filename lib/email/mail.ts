import { createHmac, timingSafeEqual } from "crypto";
import { Resend } from "resend";
import { appOrigin } from "@/lib/stripe";

export function mailOrigin(request?: Request) {
  if (process.env.APP_ORIGIN) return process.env.APP_ORIGIN.replace(/\/$/, "");
  if (process.env.NEXT_PUBLIC_APP_ORIGIN) return process.env.NEXT_PUBLIC_APP_ORIGIN.replace(/\/$/, "");
  if (request) return appOrigin(request);
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "";
}

function unsubSecret() {
  return process.env.CRON_SECRET || process.env.RESEND_API_KEY || "billoai-unsub";
}

export function signUnsub(uid: string) {
  const sig = createHmac("sha256", unsubSecret()).update(uid).digest("base64url");
  return `${uid}.${sig}`;
}

export function verifyUnsub(token: string) {
  const cut = token.lastIndexOf(".");
  if (cut < 1) return "";
  const uid = token.slice(0, cut);
  const sig = token.slice(cut + 1);
  const expected = createHmac("sha256", unsubSecret()).update(uid).digest("base64url");
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return "";
  return uid;
}

export function fromAddress() {
  const raw = process.env.RESEND_FROM_EMAIL?.trim();
  if (!raw) return "";
  return raw.includes("<") ? raw : `BilloAI <${raw}>`;
}

export type MailPayload = {
  to: string;
  subject: string;
  text: string;
  html: string;
  unsubscribeUrl?: string;
};

export async function sendMail(payload: MailPayload) {
  const key = process.env.RESEND_API_KEY;
  const from = fromAddress();
  if (!key || !from || !payload.to.includes("@")) return false;
  const resend = new Resend(key);
  const headers: Record<string, string> = {};
  if (payload.unsubscribeUrl) {
    headers["List-Unsubscribe"] = `<${payload.unsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }
  const result = await resend.emails.send({
    from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
    headers,
  });
  return !result.error;
}

export function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function firstName(value: string) {
  const piece = value.trim().split(/\s+/)[0] || "";
  return piece || "Someone";
}

export function hoursSince(iso: string) {
  if (!iso) return Number.POSITIVE_INFINITY;
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms)) return Number.POSITIVE_INFINITY;
  return ms / 3_600_000;
}

export function renderNotice(input: {
  origin: string;
  heading: string;
  intro: string;
  lines: string[];
  href: string;
  action: string;
  unsubscribeUrl?: string;
}) {
  const items = input.lines.map((line) => `• ${line}`).join("\n");
  const text = [
    input.heading,
    "",
    input.intro,
    items ? `\n${items}` : "",
    "",
    `${input.action}: ${input.origin}${input.href}`,
    "",
    "This is about your BilloAI account. We never email the people you met.",
    input.unsubscribeUrl ? `Stop these emails: ${input.unsubscribeUrl}` : "",
  ]
    .filter((line) => line !== "")
    .join("\n");

  const htmlItems = input.lines
    .map((line) => `<li style="margin:0 0 8px">${esc(line)}</li>`)
    .join("");
  const html = `<!doctype html>
<html><body style="margin:0;background:#f4efe6;color:#1a1612;font-family:Georgia,serif">
  <div style="max-width:36rem;margin:0 auto;padding:32px 20px">
    <p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#5e564c;font-family:system-ui,sans-serif">BilloAI</p>
    <h1 style="font-size:28px;line-height:1.2;margin:12px 0 16px">${esc(input.heading)}</h1>
    <p style="font-size:16px;line-height:1.5;color:#5e564c">${esc(input.intro)}</p>
    ${htmlItems ? `<ul style="padding-left:1.2rem;margin:20px 0;font-size:16px;line-height:1.45">${htmlItems}</ul>` : ""}
    <p style="margin:28px 0">
      <a href="${esc(input.origin + input.href)}" style="display:inline-block;background:#0b6b4f;color:#f4fff9;text-decoration:none;padding:12px 20px;border-radius:999px;font-family:system-ui,sans-serif;font-size:14px;font-weight:600">${esc(input.action)}</a>
    </p>
    <p style="font-size:13px;line-height:1.5;color:#5e564c">This is about your account. We never email the people you met.</p>
    ${
      input.unsubscribeUrl
        ? `<p style="font-size:13px"><a href="${esc(input.unsubscribeUrl)}" style="color:#0b6b4f">Stop these emails</a></p>`
        : ""
    }
  </div>
</body></html>`;

  return { text, html };
}
