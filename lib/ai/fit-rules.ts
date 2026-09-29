/** Shared with Jev and GPT so every path is scored like a real door, not a guess. */
export const FIT_RULES = `Fit is you to this one person, toward the user's goal. A title on a card is not enough for High. Do not invent departments, checks, jobs, or relationships.

Direct fit — they themselves buy, fund, partner, supply, hire, or mentor toward that goal:
- Customers: they buy or clearly influence the buy for what you sell. Conversation about that pain, or a public page that they own that problem. "Director" in the industry is not a buyer.
- Investors: they write checks at this stage and sector, or they said they do. A bank title, corporate BD, or "partner" at a huge firm is not a seed check. An associate who offered an intro to a partner is an intro path, not High.
- Partners: they can actually ship a joint motion (complementary product, channel, integration). A polite "we should partner" with no what, or a direct competitor, is not a partner.
- Suppliers: they sell what you need, or they buy you as a supplier to their line. Do not flip buyer and supplier.
- Recruiting: they hire the role you have, or they are TA for that desk. A random employee is only an intro path if they offered.
- Mentors: they have done the thing you asked about and offered time. A famous title is not a mentor.
- Jobs: they hire or pointed you to an open seat in the right function. A recruiter for a different function is Low.
- Relationships: there is a reason to continue (same community, they asked). A polite hello is not High.

Intro path — they are not the buyer / funder / hire / tech, but they sit at a company that has that team:
Treat this as real only when all of these hold:
1. Public context shows the company actually has that function. Do not invent a department.
2. Their role naturally works with that function. Real cases: plant / ops / quality talking to automation; procurement or finance talking to a vendor; a site GM walking you to OT/IT; sales or CS walking you to product when they share the pain; talent / HR only when the goal is hiring or a job; an EA only if they sit with the person you need. Unrelated (campus recruiter when you need a plant buyer) is not a path.
3. Company size: small shop (under ~200), an adjacent role can often intro you if they offered or clearly work with that team. Mid-size: same site / same chain, or they named someone. Large / enterprise: "they work there" is not a door — need same site or division, a named intro, or they own a process next to the buyer.
4. Conversation: they offered an intro, named a colleague, said they work with that team, or they feel the pain that team buys. Same-company on the card alone is Low or unknown.

Scoring: Medium when the path is real but they are not the decision maker. High only for a direct fit with evidence, or they offered a named intro / own the adjacent buy. Never High for a company name plus a guess.

Recommended action — pick one, and only if a follow-up is worth sending:
- Email: they gave a work email, and there is something specific to continue. Short, one ask. Not a cold pitch to a C-level from a 20-second hello.
- LinkedIn: no email, or a light peer touch, or that is how you met. One sentence from the conversation. Not a pitch deck in the connection note.
- Text: they gave a mobile / WhatsApp / said "text me". Two sentences. Never invent a number. Not a first touch to a VP you barely met unless they asked.
- Call: they asked you to call, or this is a reminder of what you will say. Not a script that pretends you already called.
- Ask for an intro: only when the intro path above is real. Ask professionally for the right colleague. Do not invent a name. Do not ask a stranger at a large company to open a team they do not sit next to.

If skipFollowUp, do not write a draft.`;

export const CHANNEL_DRAFT_RULES = `Write the channel the user asked for, but stay realistic.
email: a short email, one ask, from the conversation. No invented meeting.
linkedin: a short connection note from what you talked about. No pitch deck.
text: one or two sentences. Only if a number or WhatsApp exists. Do not invent one.
call: a reminder of what to say, if they asked for a call or a phone is the path they offered.
intro: ask this person to introduce the user to the right colleague — only if their role and company size make that a normal ask. Do not invent a colleague's name.`;
