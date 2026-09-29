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
              sources: input.enrichment.sources,
            },
      },
      questions: {
        fit: {
          type: "score",
          instructions:
            "How well does this person match why the user went? High only if they buy, fund, partner, hire, or introduce toward that goal and the conversation or a verified public page supports it. A title on a card is not enough for High.",
          criteria: [
            "Not enough evidence to claim a fit",
            "Thin overlap with the goal",
            "Real but weaker overlap",
            "Direct fit with a cited conversation fact or verified public page",
          ],
        },
        enoughEvidence: {
          type: "noul",
          instructions: "Is there enough evidence to claim a fit?",
          criteria: {
            true: "A conversation fact or a verified public page supports the match.",
            false: "Only a card, a guess, or an uncertain identity.",
          },
        },
        skipFollowUp: {
          type: "noul",
          instructions: "Should the user skip a follow-up?",
          criteria: {
            true: "Unknown identity, thin overlap, or no reason to send a message.",
            false: "A follow-up is worth writing from what is known.",
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
