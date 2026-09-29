import { NextResponse } from "next/server";
import { sessionFromRequest } from "@/lib/firebase/admin";
import { supportEmail } from "@/lib/support";

export function opsEmails() {
  const extra = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return new Set([supportEmail.toLowerCase(), ...extra]);
}

export function isOpsEmail(email?: string | null) {
  const value = email?.trim().toLowerCase() ?? "";
  return Boolean(value) && opsEmails().has(value);
}

export async function requireOps(request: Request) {
  const session = await sessionFromRequest(request);
  if (!session) return { error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  if (!isOpsEmail(session.email)) {
    return { error: NextResponse.json({ error: "This page is for the operator." }, { status: 403 }) };
  }
  return { session };
}
