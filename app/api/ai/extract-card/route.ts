import { NextResponse } from "next/server";
import { guardAi } from "@/lib/ai/guard";
import { extractCard } from "@/lib/ai/run";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { image?: string; eventId?: string };
  const gate = await guardAi(request, body.eventId);
  if (gate.error) return gate.error;
  try {
    if (!body.image) return NextResponse.json({ error: "Add an image." }, { status: 400 });
    const fields = await extractCard(body.image);
    return NextResponse.json({ fields });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read that card.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
