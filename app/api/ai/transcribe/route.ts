import { NextResponse } from "next/server";
import { transcribeNote } from "@/lib/ai/run";
import { guardAi } from "@/lib/ai/guard";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const eventId = String(form.get("eventId") ?? "");
    const gate = await guardAi(request, eventId || undefined);
    if (gate.error) return gate.error;
    const audio = form.get("audio");
    if (!(audio instanceof Blob)) return NextResponse.json({ error: "Add a voice note." }, { status: 400 });
    const bytes = new Uint8Array(await audio.arrayBuffer());
    const text = await transcribeNote(bytes, audio.type);
    return NextResponse.json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not transcribe that note.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
