import { generateText, Output, stepCountIs, transcribe } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { addDays, todayISO } from "@/lib/dates";
import { CHANNEL_DRAFT_RULES, FIT_RULES } from "@/lib/ai/fit-rules";
import { scoreWithJev } from "@/lib/ai/jev";
import { clampChannel } from "@/lib/channels";
import { asHref } from "@/lib/links";
import { clampRelevance, hasConversationEvidence, hasVerifiedPublic, shouldLookupPublic } from "@/lib/relevance";
import type {
  ContactFields,
  Enrichment,
  EventInput,
  FollowUpDraft,
  StructuredNote,
  TaskChannel,
  UnderstandResult,
} from "@/lib/types";

const model = openai("gpt-4.1");

const contactSchema = z.object({
  name: z.string(),
  company: z.string(),
  title: z.string(),
  email: z.string(),
  phone: z.string(),
  website: z.string(),
  linkedin: z.string(),
  location: z.string(),
  otherContact: z.string(),
});

const noteSchema = z.object({
  painPoint: z.string(),
  interest: z.string(),
  opportunity: z.string(),
  personalDetail: z.string(),
  followUpPromise: z.string(),
});

const enrichmentSchema = z.object({
  companyDescription: z.string(),
  industry: z.string(),
  companySize: z.string(),
  roleSummary: z.string(),
  products: z.string(),
  priorities: z.string(),
  interests: z.string(),
  news: z.array(z.object({ title: z.string(), url: z.string() })),
  sources: z.array(z.string()),
});

const relevanceSchema = z.object({
  level: z.enum(["high", "medium", "low", "unknown"]),
  reasons: z.array(z.string()).min(1).max(4),
  suggestedAction: z.string(),
  opportunityType: z.string(),
  skipFollowUp: z.boolean(),
  recommendedChannel: z.enum(["email", "linkedin", "text", "call", "intro"]).optional(),
});

const draftSchema = z.object({
  channel: z.enum(["email", "linkedin", "text", "call", "intro"]),
  title: z.string(),
  body: z.string(),
  dueDate: z.string(),
});

const emptyEnrichment = (): Enrichment => ({
  companyDescription: "",
  industry: "",
  companySize: "",
  roleSummary: "",
  products: "",
  priorities: "",
  interests: "",
  news: [],
  sources: [],
  unavailable: true,
});

type TeamHunt = { icp: string; targetCompanies: string[]; targetRoles: string };

function goalText(event: EventInput, team?: TeamHunt | null) {
  const companies = team?.targetCompanies.filter(Boolean).join(", ") ?? "";
  return [
    `Event: ${event.name} (${event.type}) in ${event.location} on ${event.date}.`,
    `Success looks like: ${event.goal}. ${event.goalDetail}`,
    `People they want to meet: ${event.targetPeople}`,
    event.targetCompaniesOrRoles ? `Target companies or roles: ${event.targetCompaniesOrRoles}` : "",
    team?.icp ? `Company hunt (team ICP): ${team.icp}` : "",
    companies ? `Team target companies: ${companies}` : "",
    team?.targetRoles ? `Team target roles: ${team.targetRoles}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function lookupFromLink(input: string): Promise<ContactFields> {
  const href = asHref(input);
  const search = await generateText({
    model: openai.responses("gpt-4.1"),
    tools: { web_search: openai.tools.webSearch({}) },
    stopWhen: stepCountIs(4),
    prompt: `This is a public professional page or profile URL. Find only public professional identity. Do not look for private, family, health, or home details.
URL or page: ${href}
Prefer the page itself, LinkedIn, and the official company site.
Extract the person's name, current title, company, public work email if shown, LinkedIn URL, website, and city if public.
If this is a company page and not a person, fill company and website only. Do not invent a person, email, or phone.
If a field is not on a public page, say it was not found.`,
  });
  const structured = await generateText({
    model,
    output: Output.object({ schema: contactSchema }),
    prompt: `Turn this research into contact fields. Use an empty string when a fact was not found. Do not invent emails, phones, or titles. Put a LinkedIn URL in linkedin and a site in website.\n\nThe original input was: ${href}\n\n${search.text}`,
  });
  const next = withFields(structured.output);
  if (href.toLowerCase().includes("linkedin.com")) {
    next.linkedin = next.linkedin || href;
  } else {
    next.website = next.website || href;
  }
  return next;
}

export async function extractCard(image: string): Promise<ContactFields> {
  const result = await generateText({
    model,
    output: Output.object({ schema: contactSchema }),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extract professional contact fields from this one person's card or profile image. Put WhatsApp, WeChat, or any other handle in otherContact. Use an empty string when a field is not visible. Do not invent emails, phones, or titles.",
          },
          { type: "image", image },
        ],
      },
    ],
  });
  return { ...result.output, otherContact: result.output.otherContact ?? "" };
}

export async function transcribeNote(audio: Uint8Array, mediaType: string) {
  const result = await transcribe({
    model: openai.transcription("gpt-4o-mini-transcribe"),
    audio,
    providerOptions: { openai: { mimeType: mediaType } },
  });
  return result.text;
}

async function structureNote(rawNote: string): Promise<StructuredNote> {
  if (!rawNote.trim()) {
    return { painPoint: "", interest: "", opportunity: "", personalDetail: "", followUpPromise: "" };
  }
  const result = await generateText({
    model,
    output: Output.object({ schema: noteSchema }),
    prompt: `Structure this networking note. Leave a field empty if it was not said. Do not invent details. If they offered to introduce a colleague or named someone on another team, put that in opportunity.\n\n${rawNote}`,
  });
  return result.output;
}

function withFields(contact: ContactFields): ContactFields {
  return {
    name: contact.name ?? "",
    company: contact.company ?? "",
    title: contact.title ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    website: contact.website ?? "",
    linkedin: contact.linkedin ?? "",
    location: contact.location ?? "",
    otherContact: contact.otherContact ?? "",
  };
}

async function enrich(contact: ContactFields): Promise<Enrichment> {
  const person = withFields(contact);
  if (!shouldLookupPublic(person)) return emptyEnrichment();
  try {
    const search = await generateText({
      model: openai.responses("gpt-4.1"),
      tools: { web_search: openai.tools.webSearch({}) },
      stopWhen: stepCountIs(4),
      prompt: `Find publicly available professional information only. Do not look for private, family, health, or home details.
Use every clue here to identify the same person and their current role. Prefer official company, LinkedIn, and conference pages.
Person: ${person.name}
Title: ${person.title}
Company: ${person.company}
Email: ${person.email}
Phone: ${person.phone}
LinkedIn: ${person.linkedin}
Website: ${person.website}
Location: ${person.location}
Other: ${person.otherContact}
Summarize company description, industry, size, role, products, public business priorities, public professional interests, and recent company news. Include source URLs. If you cannot find a fact, say it was not found.`,
    });
    const structured = await generateText({
      model,
      output: Output.object({ schema: enrichmentSchema }),
      prompt: `Turn this research into fields. Use empty strings and empty arrays when a fact was not found. Only include http(s) source URLs that appear in the research. Do not invent facts.\n\n${search.text}`,
    });
    const found = Object.values(structured.output).some((value) =>
      Array.isArray(value) ? value.length > 0 : String(value).trim().length > 0,
    );
    return { ...structured.output, unavailable: !found };
  } catch {
    return emptyEnrichment();
  }
}

export async function understand(input: {
  event: EventInput;
  contact: ContactFields;
  rawNote: string;
  allowPublicLookup?: boolean;
  teamHunt?: TeamHunt | null;
}): Promise<UnderstandResult> {
  const contact = withFields(input.contact);
  const [structuredNote, enrichment] = await Promise.all([
    structureNote(input.rawNote),
    input.allowPublicLookup === false || !shouldLookupPublic(contact) ? Promise.resolve(emptyEnrichment()) : enrich(contact),
  ]);

  const jev = await scoreWithJev({
    event: input.event,
    contact,
    rawNote: input.rawNote,
    structuredNote,
    enrichment,
    teamHunt: input.teamHunt,
  }).catch(() => null);

  const scored = await generateText({
    model,
    output: Output.object({
      schema: z.object({ relevance: relevanceSchema, draft: draftSchema }),
    }),
    prompt: `You help a person decide who deserves follow-up time after a networking event. Do not give false hope.
${FIT_RULES}
${
  jev
    ? `The fit decision is already locked: level=${jev.level}, skipFollowUp=${jev.skipFollowUp}. Do not change those fields. Write reasons, opportunityType, suggestedAction, and the draft to match that decision.`
    : `Compare the contact and any verified public context with the user's goal.
unknown if there is no conversation note and no verified public page, or the identity is uncertain. Never upgrade unknown to High.
skipFollowUp is true for unknown, and for Low when a message is not worth sending.`
}
opportunityType in plain words. Examples: "Buyer for plant automation" or "Intro path — plant ops to OT at a mid-size supplier" or "Not a fit — recruiter, not an operator" or "Company only — no path" or "Not enough to say".
Reasons must cite the goal plus a conversation fact or a public source URL that was found. Name the path in plain words (buyer, investor, intro, company only). Do not invent private facts, departments, or checks.
Suggested action must start with the recommended action: "Email them…", "Send a LinkedIn note…", "Text them…", "Call as they asked…", "Ask for an intro to…", or "Do not follow up…".
recommendedChannel must match that action. If skipFollowUp, omit it.
If skipFollowUp or level is unknown, set draft.body to an empty string. Otherwise draft a follow-up the user will review. Never claim it was already sent.
If the note contains a date, set dueDate to YYYY-MM-DD. Otherwise use ${todayISO()} for high and ${addDays(todayISO(), 7)} otherwise.
draft.channel must be the same as recommendedChannel. Do not pick email without an email, text or call without a phone or WhatsApp, or intro unless the intro path is real.

User goal:
${goalText(input.event, input.teamHunt)}

Contact:
${JSON.stringify(contact)}

Conversation:
${input.rawNote}

Structured note:
${JSON.stringify(structuredNote)}

Public enrichment unavailable: ${enrichment.unavailable}
${JSON.stringify(enrichment)}`,
  });

  const relevance = clampRelevance(
    jev
      ? { ...scored.output.relevance, level: jev.level, skipFollowUp: jev.skipFollowUp }
      : scored.output.relevance,
    input.rawNote,
    structuredNote,
    enrichment,
  );
  const skip = relevance.skipFollowUp || relevance.level === "unknown";
  const channel = skip ? scored.output.draft.channel : clampChannel(contact, scored.output.draft.channel);
  const draft = skip
    ? { ...scored.output.draft, body: "", title: relevance.suggestedAction, channel }
    : { ...scored.output.draft, channel };
  const nextRelevance = skip
    ? { ...relevance, recommendedChannel: undefined }
    : { ...relevance, recommendedChannel: channel };

  return {
    structuredNote,
    enrichment,
    relevance: nextRelevance,
    draft,
  };
}

export async function draftChannel(input: {
  event: EventInput;
  contact: ContactFields;
  rawNote: string;
  structuredNote: StructuredNote | null;
  enrichment: Enrichment | null;
  channel: TaskChannel;
}): Promise<FollowUpDraft> {
  if (!hasConversationEvidence(input.rawNote, input.structuredNote) && !hasVerifiedPublic(input.enrichment)) {
    return { channel: input.channel, title: "No follow-up yet", body: "", dueDate: todayISO() };
  }

  const result = await generateText({
    model,
    output: Output.object({ schema: draftSchema }),
    prompt: `Write one ${input.channel} follow-up the user will copy and send themselves. Do not say the message was already sent.
If there is no conversation and no verified public fact, return an empty body. Do not invent a relationship.
${CHANNEL_DRAFT_RULES}
Use the conversation and only public facts that exist. If a fact is missing, leave it out.

Goal:
${goalText(input.event)}
Contact: ${JSON.stringify(input.contact)}
Note: ${input.rawNote}
Structured: ${JSON.stringify(input.structuredNote)}
Public: ${JSON.stringify(input.enrichment)}
Today: ${todayISO()}`,
  });
  return { ...result.output, channel: input.channel };
}
