import { NextResponse } from "next/server";
import { sessionFromRequest } from "@/lib/firebase/admin";
import { companyInPlay, teamContextForUser } from "@/lib/team";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await sessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const company = new URL(request.url).searchParams.get("company") ?? "";
  const context = await teamContextForUser(session.uid);
  if (!context || !company.trim()) return NextResponse.json({ inPlay: false, heldBy: [] });
  const result = await companyInPlay(context.teamId, company, session.uid);
  return NextResponse.json(result);
}
