import { NextResponse } from "next/server";
import { understand } from "@/lib/ai/run";
import { guardAi } from "@/lib/ai/guard";
import { reportServerError } from "@/lib/errors";
import { applyTeamHunt, companyAlreadyInPlay, recordCompanyPlay, teamContextForUser } from "@/lib/team";
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
  const uid = "uid" in gate ? gate.uid : "";
  if (!uid) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    if (!body.event || !body.contact) {
      return NextResponse.json({ error: "Event and contact are required." }, { status: 400 });
    }
    let team = null;
    try {
      team = await teamContextForUser(uid);
    } catch (error) {
      reportServerError("understand-team", error);
    }
    const event = applyTeamHunt(body.event, team);
    const result = await understand({
      event,
      contact: body.contact,
      rawNote: body.rawNote ?? "",
      allowPublicLookup: body.allowPublicLookup !== false,
      teamHunt: team
        ? { icp: team.icp, targetCompanies: team.targetCompanies, targetRoles: team.targetRoles }
        : null,
    });
    let alreadyInPlay = false;
    if (team) {
      try {
        alreadyInPlay = await companyAlreadyInPlay(team.teamId, body.contact.company, uid);
        if (result.relevance.level === "high" || result.relevance.level === "medium") {
          await recordCompanyPlay(team.teamId, body.contact.company, uid, result.relevance.level);
        }
      } catch (error) {
        reportServerError("understand-team-play", error);
      }
    }
    return NextResponse.json({ ...result, alreadyInPlay });
  } catch (error) {
    reportServerError("understand", error);
    return NextResponse.json({ error: "Could not understand this contact." }, { status: 500 });
  }
}
