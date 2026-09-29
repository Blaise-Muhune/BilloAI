import type { ContactFields, Enrichment, Relevance, StructuredNote } from "@/lib/types";

const genericMail = /@(gmail|yahoo|hotmail|outlook|icloud|aol|proton|me|live|msn)\./i;
const genericOrgs = new Set([
  "freelance",
  "freelancer",
  "consultant",
  "consulting",
  "self",
  "self-employed",
  "independent",
  "retired",
  "student",
  "none",
  "n/a",
  "na",
  "unknown",
  "personal",
]);

export function hasConversationEvidence(rawNote: string, structured: StructuredNote | null) {
  const note = rawNote.trim();
  if (note.length >= 24) return true;
  if (!structured) return note.length >= 12;
  return Boolean(
    structured.painPoint.trim() ||
      structured.interest.trim() ||
      structured.opportunity.trim() ||
      structured.personalDetail.trim() ||
      structured.followUpPromise.trim(),
  );
}

export function hasVerifiedPublic(enrichment: Enrichment | null) {
  if (!enrichment || enrichment.unavailable) return false;
  const sources = enrichment.sources.filter((item) => /^https?:\/\//i.test(item));
  const identity = Boolean(enrichment.roleSummary.trim() || enrichment.companyDescription.trim());
  return sources.length > 0 && identity;
}

export function shouldLookupPublic(contact: ContactFields) {
  const linkedin = contact.linkedin.trim().toLowerCase();
  if (linkedin.includes("linkedin.com")) return true;
  const site = contact.website.trim();
  if (/^https?:\/\//i.test(site) && !/linkedin\.com/i.test(site)) return true;
  const email = contact.email.trim();
  if (email.includes("@") && !genericMail.test(email)) return true;
  const company = contact.company.trim();
  const names = contact.name.trim().split(/\s+/).filter(Boolean);
  if (names.length < 2 || company.length < 3) return false;
  return !genericOrgs.has(company.toLowerCase());
}

export function skipFollowUp(relevance: Relevance | null) {
  return Boolean(relevance?.skipFollowUp || relevance?.level === "unknown");
}

export function evidenceLine(rawNote: string, structured: StructuredNote | null, enrichment: Enrichment | null) {
  const talked = hasConversationEvidence(rawNote, structured);
  const publicPage = hasVerifiedPublic(enrichment);
  if (talked && publicPage) return "";
  if (talked) return "";
  if (publicPage) return "This is from the card and public pages. You did not save what you talked about, so do not treat High as a decision.";
  return "This is from the card only. Add what you talked about before treating this as a match.";
}

export function clampRelevance(
  guessed: Relevance,
  rawNote: string,
  structured: StructuredNote | null,
  enrichment: Enrichment | null,
): Relevance {
  const talked = hasConversationEvidence(rawNote, structured);
  const publicPage = hasVerifiedPublic(enrichment);
  const reasons = guessed.reasons.filter((item) => item.trim()).slice(0, 4);

  if (!talked && !publicPage) {
    return {
      level: "unknown",
      reasons: reasons.length
        ? reasons
        : ["There is no conversation note and no verified public page, so a fit cannot be claimed."],
      suggestedAction: "Do not follow up on a guess. Add what you talked about, then score again.",
      opportunityType: guessed.opportunityType.trim() || "Not enough to say",
      skipFollowUp: true,
      recommendedChannel: undefined,
    };
  }

  const skip = guessed.level === "unknown" || guessed.level === "low" ? guessed.skipFollowUp : false;
  return {
    ...guessed,
    reasons: reasons.length ? reasons : ["The overlap with your goal is limited."],
    skipFollowUp: guessed.level === "unknown" ? true : skip,
    recommendedChannel: skip || guessed.level === "unknown" ? undefined : guessed.recommendedChannel,
    suggestedAction:
      skip || guessed.level === "unknown"
        ? guessed.suggestedAction.trim() || "Do not follow up. The overlap with why you went is too thin."
        : guessed.suggestedAction,
  };
}
