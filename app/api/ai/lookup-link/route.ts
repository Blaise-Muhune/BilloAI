import { NextResponse } from "next/server";
import { guardAi } from "@/lib/ai/guard";
import { lookupFromLink } from "@/lib/ai/run";
import { reportServerError } from "@/lib/errors";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const body = (await request.json()) as { input?: string; eventId?: string };
  const gate = await guardAi(request, body.eventId);
  if (gate.error) return gate.error;
  try {
    if (!body.input?.trim()) return NextResponse.json({ error: "Paste a link." }, { status: 400 });
    const fields = await lookupFromLink(body.input);
    return NextResponse.json({ fields });
  } catch (error) {
    reportServerError("lookup-link", error);
    return NextResponse.json({ error: "Could not read that page." }, { status: 500 });
  }
}
