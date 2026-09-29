import type { ContactFields, Enrichment, EventInput, RelevanceLevel, StructuredNote } from "@/lib/types";

const LEVELS = ["unknown", "low", "medium", "high"] as const;

export type JevFit = {
  level: RelevanceLevel;
  skipFollowUp: boolean;
};

function noulOf(answer: unknown) {
  if (!answer || typeof answer !== "object") return 0;
  const value = (answer as { noul?: unknown }).noul;
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function scoreOf(answer: unknown) {
  if (!answer || typeof answer !== "object") return { score: 0, confidence: 0 };
  const raw = answer as { score?: unknown; confidence?: unknown };
  return {
    score: typeof raw.score === "number" && Number.isFinite(raw.score) ? raw.score : 0,
    confidence: typeof raw.confidence === "number" && Number.isFinite(raw.confidence) ? raw.confidence : 0,
  };
}

function levelFromScore(score: number, enough: number, confidence: number): RelevanceLevel {
  let level: RelevanceLevel = score < 0.5 ? "unknown" : score < 1.5 ? "low" : score < 2.5 ? "medium" : "high";
  if (enough < 0.4) return "unknown";
  if (level === "high" && (enough < 0.75 || confidence < 0.55)) return "medium";
  return level;
}

export async function scoreWithJev(input: {
  event: EventInput;
  contact: ContactFields;
  rawNote: string;
  structuredNote: StructuredNote;
  enrichment: Enrichment;
  teamHunt?: { icp: string; targetCompanies: string[]; targetRoles: string } | null;
}): Promise<JevFit> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is missing.");

  const response = await fetch("https://openrouter.ai/api/alpha/decisions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://www.billoai.com",
      "X-OpenRouter-Title": "BilloAI",
    },
    body: JSON.stringify({
      model: "typesafe/jev-1.13",
      state: {
        goal: {
          event: input.event.name,
          type: input.event.type,
          location: input.event.location,
          date: input.event.date,
          success: `${input.event.goal}. ${input.event.goalDetail}`.trim(),
          targetPeople: input.event.targetPeople,
          targetCompaniesOrRoles: input.event.targetCompaniesOrRoles,
          teamIcp: input.teamHunt?.icp ?? "",
          teamTargetCompanies: input.teamHunt?.targetCompanies ?? [],
          teamTargetRoles: input.teamHunt?.targetRoles ?? "",
        },
        person: {
          name: input.contact.name,
          title: input.contact.title,
          company: input.contact.company,
          email: input.contact.email,
          website: input.contact.website,
          linkedin: input.contact.linkedin,
          location: input.contact.location,
        },
        conversation: input.rawNote,
        structuredNote: input.structuredNote,
        publicContext: input.enrichment.unavailable
          ? { unavailable: true }
          : {
              role: input.enrichment.roleSummary,
              company: input.enrichment.companyDescription,
              industry: input.enrichment.industry,
              companySize: input.enrichment.companySize,
              sources: input.enrichment.sources,
            },
      },
      questions: {
        fit: {
          type: "score",
          instructions:
            "How well does this person match why the user went, including any team ICP and target-company list in the goal? Direct fit only if they themselves buy, fund, partner, supply, hire, or mentor toward that goal — with a conversation fact or verified page. Intro path only if their role at that company can realistically open that team (adjacent departments, company size makes the intro plausible, conversation supports it). Same company on a card is not a fit. A title is not enough for High. Investor means they write this kind of check. Partner means a real joint motion. Recruiter for the wrong function is not a job. Large-company badge with no path is not High.",
          criteria: [
            "Not enough evidence to claim a fit",
            "Thin overlap, company name only, or the wrong kind of person",
            "Real intro path or weaker direct overlap, cited",
            "Direct decision maker, or they offered a named intro / own the adjacent buy, cited",
          ],
        },
        enoughEvidence: {
          type: "noul",
          instructions: "Is there enough evidence to claim a fit, including a realistic intro path?",
          criteria: {
            true: "A conversation fact or a verified public page supports a direct fit or a real intro path (adjacent role, company has that team, size makes the intro plausible).",
            false: "Only a card, the company name, a guess, or an uncertain identity.",
          },
        },
        skipFollowUp: {
          type: "noul",
          instructions: "Should the user skip a follow-up?",
          criteria: {
            true: "Unknown identity, company name only, or no realistic way this person opens the team you need.",
            false: "A follow-up is worth writing from what is known, including a professional ask for an intro when the path is real.",
          },
        },
      },
    }),
  });

  const payload = (await response.json()) as {
    error?: { message?: string } | string;
    answers?: Record<string, unknown>;
  };
  if (!response.ok || !payload.answers) {
    const message =
      typeof payload.error === "string" ? payload.error : payload.error?.message || `Jev returned ${response.status}.`;
    throw new Error(message);
  }

  const enough = noulOf(payload.answers.enoughEvidence);
  const skip = noulOf(payload.answers.skipFollowUp);
  const fit = scoreOf(payload.answers.fit);
  const level = levelFromScore(fit.score, enough, fit.confidence);
  return {
    level: LEVELS.includes(level) ? level : "unknown",
    skipFollowUp: level === "unknown" || skip >= 0.55,
  };
}
