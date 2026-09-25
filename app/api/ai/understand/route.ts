import { NextResponse } from "next/server";
import { understand } from "@/lib/ai/run";
import { guardAi } from "@/lib/ai/guard";
import type { ContactFields, EventInput } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    event?: EventInput & { id?: string };
    contact?: ContactFields;
    rawNote?: string;
    allowPublicLookup?: boolean;
  };
  const gate = await guardAi(request, body.event?.id);
  if (gate.error) return gate.error;
  try {
    if (!body.event || !body.contact) {
      return NextResponse.json({ error: "Event and contact are required." }, { status: 400 });
    }
    const result = await understand({
      event: body.event,
      contact: body.contact,
      rawNote: body.rawNote ?? "",
      allowPublicLookup: body.allowPublicLookup !== false,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not understand this contact.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
