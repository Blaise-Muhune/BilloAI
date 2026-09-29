import { NextResponse } from "next/server";
import { accessStatus } from "@/lib/access";
import { sessionFromRequest } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await sessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  return NextResponse.json(await accessStatus(session.uid));
}
