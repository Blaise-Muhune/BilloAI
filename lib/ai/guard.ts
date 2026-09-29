import { NextResponse } from "next/server";
import { AccessError, assertAiAccess, assertRateLimit, claimIncludedEvent } from "@/lib/access";
import { sessionFromRequest } from "@/lib/firebase/admin";

export async function guardAi(request: Request, eventId?: string) {
  const session = await sessionFromRequest(request);
  if (!session) return { error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  try {
    await assertRateLimit(session.uid);
    await assertAiAccess(session.uid, session.email_verified === true, eventId);
    await claimIncludedEvent(session.uid, eventId);
    return { uid: session.uid };
  } catch (error) {
    if (error instanceof AccessError) {
      return {
        error: NextResponse.json(
          { error: error.message, eventName: error.eventName, reason: error.reason },
          { status: error.status },
        ),
      };
    }
    return { error: NextResponse.json({ error: "Could not check your plan." }, { status: 500 }) };
  }
}
