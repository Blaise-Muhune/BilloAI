import { NextResponse } from "next/server";
import { readPublicCard } from "@/lib/card-server";
import { buildVcard, vcardFilename } from "@/lib/vcard";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ uid: string }> }) {
  const key = decodeURIComponent((await context.params).uid);
  const card = await readPublicCard(key);
  if (!card) return new NextResponse(null, { status: 404 });

  const body = buildVcard(card.uid, card.profile);
  const filename = vcardFilename(card.profile.name);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, max-age=60",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
