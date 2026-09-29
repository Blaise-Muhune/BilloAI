import { NextResponse } from "next/server";
import { reportServerError } from "@/lib/errors";
import { loadOpsOverview } from "@/lib/ops-overview";
import { requireOps } from "@/lib/ops";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const gate = await requireOps(request);
  if (gate.error) return gate.error;
  try {
    return NextResponse.json(await loadOpsOverview());
  } catch (error) {
    reportServerError("ops-overview", error);
    return NextResponse.json({ error: "Could not load ops." }, { status: 500 });
  }
}
