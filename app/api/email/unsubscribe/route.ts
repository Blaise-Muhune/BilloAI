import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { verifyUnsub } from "@/lib/email/mail";

export const runtime = "nodejs";

async function stop(token: string) {
  const uid = verifyUnsub(token);
  if (!uid) return false;
  await adminDb().collection("users").doc(uid).set({ emailUnsubscribedAt: new Date().toISOString() }, { merge: true });
  return true;
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("t") ?? "";
  const ok = await stop(token);
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><title>Email settings</title></head>
<body style="margin:0;background:#f4efe6;color:#1a1612;font-family:Georgia,serif">
  <div style="max-width:32rem;margin:0 auto;padding:48px 20px">
    <p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#5e564c">BilloAI</p>
    <h1 style="font-size:32px;line-height:1.15">${ok ? "These emails are stopped." : "That link is not valid."}</h1>
    <p style="color:#5e564c;line-height:1.5">${
      ok
        ? "We will not send “what matters” emails to this account. Turn them back on from Account if you want them again."
        : "Open Account while signed in if you want to stop or restart emails."
    }</p>
  </div>
</body></html>`;
  return new NextResponse(html, { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex, nofollow" } });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  let token = url.searchParams.get("t") ?? "";
  if (!token) {
    const raw = await request.text();
    try {
      token = String((JSON.parse(raw) as { t?: string }).t ?? "");
    } catch {
      token = new URLSearchParams(raw).get("t") ?? "";
    }
  }
  const ok = await stop(token);
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}
