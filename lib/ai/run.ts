import { generateText, Output, stepCountIs, transcribe } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { addDays, todayISO } from "@/lib/dates";
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
  level: z.enum(["high", "medium", "low"]),
  reasons: z.array(z.string()).min(1).max(4),
  suggestedAction: z.string(),
  opportunityType: z.string(),
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

function goalText(event: EventInput) {
  return [
    `Event: ${event.name} (${event.type}) in ${event.location} on ${event.date}.`,
    `Success looks like: ${event.goal}. ${event.goalDetail}`,
    `People they want to meet: ${event.targetPeople}`,
    event.targetCompaniesOrRoles ? `Target companies or roles: ${event.targetCompaniesOrRoles}` : "",
  ]
    .filter(Boolean)
    .join("\n");
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
            text: "Extract professional contact fields from this business card or profile image. Use an empty string when a field is not visible. Do not invent emails, phones, or titles.",
          },
          { type: "image", image },
        ],
      },
    ],
  });
  return result.output;
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
    prompt: `Structure this networking note. Leave a field empty if it was not said. Do not invent details.\n\n${rawNote}`,
  });
  return result.output;
}

async function enrich(contact: ContactFields): Promise<Enrichment> {
  if (!contact.company && !contact.linkedin && !contact.name) return emptyEnrichment();
  try {
    const search = await generateText({
      model: openai.responses("gpt-4.1"),
      tools: { web_search: openai.tools.webSearch({}) },
      stopWhen: stepCountIs(4),
      prompt: `Find publicly available professional information only. Do not look for private, family, health, or home details.
Person: ${contact.name}
Title: ${contact.title}
Company: ${contact.company}
LinkedIn: ${contact.linkedin}
Website: ${contact.website}
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
}): Promise<UnderstandResult> {
  const [structuredNote, enrichment] = await Promise.all([
    structureNote(input.rawNote),
    input.allowPublicLookup ? enrich(input.contact) : Promise.resolve(emptyEnrichment()),
  ]);

  const scored = await generateText({
    model,
    output: Output.object({
      schema: z.object({ relevance: relevanceSchema, draft: draftSchema }),
    }),
    prompt: `You help a person decide who deserves follow-up time after a networking event.
Compare the contact with the user's goal. High means a direct fit and a reason to act within a day. Medium means useful but not the decision maker or not an immediate fit. Low means little overlap with the goal.
Reasons must be specific. Suggested action should say what to do, including when.
Draft a follow-up the user will review. Never claim it was already sent. Use the conversation, the goal, and only public facts that were found. If enrichment was unavailable, do not invent company facts.
If the note contains a date, set dueDate to YYYY-MM-DD. Otherwise use ${input.contact.name ? todayISO() : todayISO()} for high priority and ${addDays(todayISO(), 7)} for low priority.
Primary channel should be email when an email exists, intro when the person is not the decision maker, otherwise linkedin.

User goal:
${goalText(input.event)}

Contact:
${JSON.stringify(input.contact)}

Conversation:
${input.rawNote}

Structured note:
${JSON.stringify(structuredNote)}

Public enrichment unavailable: ${enrichment.unavailable}
${JSON.stringify(enrichment)}`,
  });

  return {
    structuredNote,
    enrichment,
    relevance: scored.output.relevance,
    draft: scored.output.draft,
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
  const result = await generateText({
    model,
    output: Output.object({ schema: draftSchema }),
    prompt: `Write one ${input.channel} follow-up the user will copy and send themselves. Do not say the message was already sent.
Channel guidance: email is a short email, linkedin is a short connection note, text is one or two sentences, call is a reminder of what to say, intro asks this person to introduce the user to the right colleague.
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
