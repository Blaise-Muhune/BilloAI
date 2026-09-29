import { skipFollowUp } from "@/lib/relevance";
import type { ContactFields, Relevance, TaskChannel } from "@/lib/types";

export const CHANNEL_LABELS: Record<TaskChannel, string> = {
  email: "Email",
  linkedin: "LinkedIn",
  text: "Text",
  call: "Call",
  intro: "Ask for an intro",
};

export function showRecommendedAction(relevance: Relevance | null, fallback?: TaskChannel | null): TaskChannel | null {
  if (!relevance || skipFollowUp(relevance)) return null;
  if (relevance.level !== "high" && relevance.level !== "medium") return null;
  return relevance.recommendedChannel ?? fallback ?? null;
}

export function recommendedLabel(relevance: Relevance | null, fallback?: TaskChannel | null) {
  const channel = showRecommendedAction(relevance, fallback);
  return channel ? CHANNEL_LABELS[channel] : "";
}

export function clampChannel(contact: ContactFields, channel: TaskChannel): TaskChannel {
  const email = contact.email.trim();
  const phone = contact.phone.trim() || contact.otherContact.trim();
  const linkedin = /linkedin\.com/i.test(contact.linkedin);
  if (channel === "email" && !email) return linkedin ? "linkedin" : phone ? "text" : "email";
  if (channel === "text" && !phone) return email ? "email" : linkedin ? "linkedin" : "text";
  if (channel === "call" && !phone) return email ? "email" : linkedin ? "linkedin" : "call";
  return channel;
}
