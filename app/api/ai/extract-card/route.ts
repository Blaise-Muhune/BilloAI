import { NextResponse } from "next/server";
import { guardAi } from "@/lib/ai/guard";
import { extractCard } from "@/lib/ai/run";
import { reportServerError } from "@/lib/errors";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const body = (await request.json()) as { image?: string; eventId?: string };
  const gate = await guardAi(request, body.eventId);
  if (gate.error) return gate.error;
  try {
    if (!body.image) return NextResponse.json({ error: "Add an image." }, { status: 400 });
    const fields = await extractCard(body.image);
    return NextResponse.json({ fields });
  } catch (error) {
    reportServerError("extract-card", error);
    return NextResponse.json({ error: "Could not read that card." }, { status: 500 });
  }
}
