import { NextResponse } from "next/server";
import { runDigests } from "@/lib/email/digest";

export const runtime = "nodejs";
export const maxDuration = 120;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    return NextResponse.json({ error: "Resend is not configured." }, { status: 500 });
  }
  const result = await runDigests(request);
  return NextResponse.json(result);
}
