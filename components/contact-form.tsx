"use client";

import { useState } from "react";
import { Button, ErrorNote, Field, Area } from "@/components/ui";
import { postPublicJson } from "@/lib/api";
import { userMessage } from "@/lib/errors";
import { supportEmail } from "@/lib/support";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      await postPublicJson("/api/contact", { name, email, message, company });
      setSent(true);
    } catch (err) {
      setError(userMessage(err, "Could not send that. Try email if it happens again."));
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <p className="surface p-6 text-muted">We have it. We reply to the email you entered.</p>
    );
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="relative space-y-4">
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label>
          Company
          <input
            tabIndex={-1}
            autoComplete="off"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
          />
        </label>
      </div>
      <Field label="Name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required />
      <Field
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />
      <Area
        id="contact-message"
        label="Message"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        required
        rows={7}
        placeholder="What you need, and any event or billing detail that helps."
      />
      <ErrorNote>{error}</ErrorNote>
      <Button type="submit" busy={pending} className="min-w-40">
        {pending ? "Sending…" : "Send"}
      </Button>
      <p className="text-sm text-muted">
        Or email <a className="font-semibold text-accent" href={`mailto:${supportEmail}`}>{supportEmail}</a>.
      </p>
    </form>
  );
}
