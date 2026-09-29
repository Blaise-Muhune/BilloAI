# BilloAI todos

Do these when the trigger is true. Do not do them early to polish.

## Look and readability

- [ ] **Check contrast on cream and muted gray**  
  When: before the first public launch, or as soon as someone says text is hard to read.  
  Why: recent practice treats 4.5:1 as the floor. Muted gray on paper fails first, especially on a phone outdoors.

- [ ] **Add dark mode**  
  When: people are using the app at night after events, or someone asks for it. Not before the first paid checkout works.  
  Why: capture and follow-up happen in a dim hall. Light paper is wrong there.

- [ ] **Test the look with real users**  
  When: after 10–20 people have finished one event. Show paper-and-green next to a plain blue version only if they hesitate to trust the app.  
  Why: the direction fits the job, but it is not proven.

## Pricing and hosts

- [ ] **Watch the first-event include**  
  When: the first 20 free users have a second event. If they bounce at paywall, keep the include or add a short extra trial. Do not cut $19 first.

- [ ] **Watch organizer seats**  
  When: the first chamber pays. If they stall at “create an event, then pay,” shorten that path. Send them `/for-organizers` only.

- [x] **Add a Team plan**  
  Shipped: $150/seat/year (or $15/month), minimum 5, quantity SKU separate from Group. ICP, nameless company collision, coverage counts. Admin sees who has a seat. Admin never sees who they met, notes, or drafts.

- [ ] **Sell Team only after a company asks**  
  When: a company wants to pay for sales, BD, or other employees (not a chamber paying for attendees). Until then, invoice yearly Individual seats.  
  Why: Organizer is one night and the host must never see contacts. Team is year-round seats for their own people. Do not reuse organizer seats.

- [ ] **Shared company book / CRM**  
  When: a paying Team admin asks to own the leads, and the reps know it. Not with the first Team checkout.  
  Why: a mixer contact is often personal. Company-owned names are a later add-on.

## Auth email

- [ ] **Firebase Action URL is locked**  
  When: you want the verify/reset button to open `billoai.com` first, instead of `billoai-9ea4c.firebaseapp.com/__/auth/action`.  
  Why: the console save fails with “An error occurred updating action URL” (`EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED`). Firebase is blocking template/Action URL edits to prevent abuse. Leave the default Action URL. SMTP (Resend) still sends the mail. `actionCodeSettings` already continues to `/auth/action`. Do not add Firebase email DNS on `billoai.com` (Zoho SPF is already there).  
  How: open a Firebase support ticket and ask them to set Action URL to `https://billoai.com/__/auth/action` (rewritten to `/auth/action` in `next.config.ts`). Or send verify/reset yourself with the Admin SDK + Resend if support never unlocks it.

## After V1 is in use

Do this only after people actually capture contacts at a live event.

- [ ] Natural-language search across people they already met
- [ ] A timeline per person
- [ ] Promise tracking (“I’ll send that”)
- [ ] Reconnection suggestions
- [ ] LinkedIn-style drafts they still send themselves
- [ ] “Who in my network fits this new goal”

Attendee matching waits until a host asks and is paying. Team seats and a shared book are under Pricing and hosts.
