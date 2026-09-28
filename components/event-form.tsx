"use client";

import { useState } from "react";
import { Button, Field, Area, PageWrap, SelectField, Steps } from "@/components/ui";
import { GOAL_LABELS, NETWORKING_GOALS, type EventInput, type NetworkingGoal } from "@/lib/types";

const empty: EventInput = {
  name: "",
  type: "",
  location: "",
  date: "",
  goal: "customers",
  goalDetail: "",
  targetPeople: "",
  targetCompaniesOrRoles: "",
};

const labels = ["The event", "When and where", "The goal", "Who to meet"];

export function EventForm({
  onSave,
  variant = "network",
}: {
  onSave: (input: EventInput) => Promise<void>;
  variant?: "network" | "seats";
}) {
  const seats = variant === "seats";
  const last = seats ? 1 : 3;
  const [input, setInput] = useState<EventInput>(empty);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function set<K extends keyof EventInput>(key: K, value: EventInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  function next() {
    setError("");
    if (step === 0 && (!input.name.trim() || !input.type.trim())) {
      setError("Add the event name and what kind of event it is.");
      return;
    }
    if (step === 1 && (!input.location.trim() || !input.date)) {
      setError("Add where it is and the date.");
      return;
    }
    if (!seats && step === 2 && !input.goalDetail.trim()) {
      setError("Say what would make this event successful.");
      return;
    }
    if (!seats && step === 3 && !input.targetPeople.trim()) {
      setError("Say who you want to meet.");
      return;
    }
    setStep((current) => current + 1);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (step < last) {
      next();
      return;
    }
    if (!seats && !input.targetPeople.trim()) {
      setError("Say who you want to meet.");
      return;
    }
    setPending(true);
    setError("");
    try {
      await onSave(
        seats
          ? { ...input, goal: "customers", goalDetail: "", targetPeople: "", targetCompaniesOrRoles: "" }
          : input,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the event.");
      setPending(false);
    }
  }

  return (
    <PageWrap>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <form onSubmit={onSubmit} className="surface space-y-5 p-6 lg:p-8">
          <Steps labels={seats ? ["The event", "When and where"] : labels} index={step} />
          {step === 0 ? (
            <>
              <h1 className="serif text-4xl">{seats ? "What night are these seats for?" : "What is the event?"}</h1>
              <div className="form-grid">
                <Field label="Event name" value={input.name} onChange={(event) => set("name", event.target.value)} required />
                <Field label="Event type" value={input.type} onChange={(event) => set("type", event.target.value)} placeholder="Conference, chamber, meetup" required />
              </div>
            </>
          ) : null}
          {step === 1 ? (
            <>
              <h1 className="serif text-4xl">When and where?</h1>
              <div className="form-grid">
                <Field label="Location" value={input.location} onChange={(event) => set("location", event.target.value)} required />
                <Field label="Date" type="date" value={input.date} onChange={(event) => set("date", event.target.value)} required />
              </div>
            </>
          ) : null}
          {step === 2 ? (
            <>
              <h1 className="serif text-4xl">What does success look like?</h1>
              <SelectField label="Goal" value={input.goal} onChange={(event) => set("goal", event.target.value as NetworkingGoal)}>
                {NETWORKING_GOALS.map((goal) => (
                  <option key={goal} value={goal}>
                    {GOAL_LABELS[goal]}
                  </option>
                ))}
              </SelectField>
              <Area
                label="In your own words"
                value={input.goalDetail}
                onChange={(event) => set("goalDetail", event.target.value)}
                placeholder="Find companies that could use my AI automation services"
                required
              />
            </>
          ) : null}
          {step === 3 ? (
            <>
              <h1 className="serif text-4xl">Who do you want to meet?</h1>
              <Area
                label="People"
                value={input.targetPeople}
                onChange={(event) => set("targetPeople", event.target.value)}
                placeholder="Owners, operations managers, sales leaders"
                required
              />
              <Area
                label="Companies or roles, if you already know"
                value={input.targetCompaniesOrRoles}
                onChange={(event) => set("targetCompaniesOrRoles", event.target.value)}
              />
            </>
          ) : null}
          {error ? <p className="text-sm text-high">{error}</p> : null}
          <div className="flex gap-3">
            {step > 0 ? (
              <Button type="button" tone="ghost" onClick={() => setStep((current) => current - 1)}>
                Back
              </Button>
            ) : null}
            <Button type="submit" disabled={pending} className="min-w-40">
              {step < last ? "Continue" : pending ? "Saving…" : seats ? "Use this for seats" : "Create event"}
            </Button>
          </div>
        </form>
        <aside className="hidden rounded-[1.6rem] bg-foreground p-6 text-card lg:block">
          <p className="kicker text-[#9ddec8]">Live preview</p>
          <p className="serif mt-4 text-3xl leading-tight">{input.name || "Your next event"}</p>
          <p className="mt-3 text-white/70">{[input.location, input.date].filter(Boolean).join(" · ") || "Place and date"}</p>
          <p className="mt-6 text-sm leading-relaxed text-white/65">
            {seats
              ? "Seats attach to this. Each person sets why they went. You never see that."
              : input.goalDetail || GOAL_LABELS[input.goal]}
          </p>
        </aside>
      </div>
    </PageWrap>
  );
}
