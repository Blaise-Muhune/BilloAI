import { NextResponse } from "next/server";
import { draftChannel } from "@/lib/ai/run";
import { guardAi } from "@/lib/ai/guard";
import type { ContactRecord, EventRecord, TaskChannel } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    event?: EventRecord;
    contact?: ContactRecord;
    channel?: TaskChannel;
  };
  const gate = await guardAi(request, body.event?.id);
  if (gate.error) return gate.error;
  try {
    if (!body.event || !body.contact || !body.channel) {
      return NextResponse.json({ error: "Event, contact, and channel are required." }, { status: 400 });
    }
    const draft = await draftChannel({
      event: body.event,
      contact: body.contact,
      rawNote: body.contact.rawNote,
      structuredNote: body.contact.structuredNote,
      enrichment: body.contact.enrichment,
      channel: body.channel,
    });
    return NextResponse.json(draft);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not write that follow-up.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
