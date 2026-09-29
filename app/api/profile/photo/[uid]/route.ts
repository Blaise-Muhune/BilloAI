import { NextResponse } from "next/server";
import { isAzureBlobConfigured, readProfilePhoto } from "@/lib/azure-blob";
import { isCardUid } from "@/lib/card";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ uid: string }> }) {
  const uid = decodeURIComponent((await context.params).uid);
  if (!isCardUid(uid) || !isAzureBlobConfigured()) {
    return new NextResponse(null, { status: 404 });
  }
  try {
    const photo = await readProfilePhoto(uid);
    if (!photo) return new NextResponse(null, { status: 404 });
    return new NextResponse(new Uint8Array(photo.buffer), {
      headers: {
        "Content-Type": photo.contentType,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
