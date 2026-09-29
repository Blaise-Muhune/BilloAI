import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { esc, sendMail } from "@/lib/email/mail";
import { reportServerError } from "@/lib/errors";
import { adminDb, sessionFromRequest } from "@/lib/firebase/admin";
import { supportEmail } from "@/lib/support";

export const runtime = "nodejs";

const WINDOW_MS = 60 * 60 * 1000;
const LIMIT = 5;

function clientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  return `contact:${createHash("sha256").update(ip).digest("hex").slice(0, 32)}`;
}

async function assertContactLimit(key: string) {
  const ref = adminDb().collection("rateLimits").doc(key);
  const now = Date.now();
  await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const start = Number(snap.data()?.windowStart ?? 0);
    const count = Number(snap.data()?.count ?? 0);
    if (now - start > WINDOW_MS) {
      tx.set(ref, { windowStart: now, count: 1 });
      return;
    }
    if (count >= LIMIT) throw new Error("Too many messages. Try again in an hour.");
    tx.set(ref, { windowStart: start, count: count + 1 });
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    email?: string;
    message?: string;
    company?: string;
  };
  if (body.company?.trim()) return NextResponse.json({ ok: true });

  const name = String(body.name ?? "").trim().slice(0, 80);
  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 120);
  const message = String(body.message ?? "").trim().slice(0, 4000);
  if (name.length < 2) return NextResponse.json({ error: "Add your name." }, { status: 400 });
  if (!email.includes("@") || !email.includes(".")) return NextResponse.json({ error: "Add a real email." }, { status: 400 });
  if (message.length < 10) return NextResponse.json({ error: "Write a little more so we can help." }, { status: 400 });

  try {
    await assertContactLimit(clientKey(request));
    const session = await sessionFromRequest(request);
    const createdAt = new Date().toISOString();
    const saved = await adminDb().collection("contactMessages").add({
      name,
      email,
      message,
      createdAt,
      mailedAt: "",
      uid: session?.uid ?? "",
    });

    const text = [
      `${name} wrote from the BilloAI contact form.`,
      `Reply to: ${email}`,
      "",
      message,
    ].join("\n");
    const html = `<!doctype html>
<html><body style="margin:0;background:#f4efe6;color:#1a1612;font-family:Georgia,serif">
  <div style="max-width:36rem;margin:0 auto;padding:32px 20px">
    <p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#5e564c;font-family:system-ui,sans-serif">BilloAI contact</p>
    <h1 style="font-size:28px;line-height:1.2;margin:12px 0 16px">${esc(name)}</h1>
    <p style="font-size:16px;line-height:1.5;color:#5e564c">Reply goes to ${esc(email)}.</p>
    <p style="font-size:16px;line-height:1.5;white-space:pre-wrap;margin-top:24px">${esc(message)}</p>
  </div>
</body></html>`;

    const mailed = await sendMail({
      to: supportEmail,
      replyTo: email,
      subject: `Contact: ${name}`,
      text,
      html,
    });
    if (mailed) await saved.set({ mailedAt: new Date().toISOString() }, { merge: true });
    return NextResponse.json({ ok: true, mailed });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "";
    if (messageText.startsWith("Too many messages")) {
      return NextResponse.json({ error: messageText }, { status: 429 });
    }
    reportServerError("contact", error);
    return NextResponse.json({ error: "Could not send that. Email us directly if it happens again." }, { status: 500 });
  }
}
