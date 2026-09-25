"use client";

import { useState } from "react";
import { Button, Field, Area, Steps } from "@/components/ui";
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

export function EventForm({ onSave }: { onSave: (input: EventInput) => Promise<void> }) {
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
    if (step === 2 && !input.goalDetail.trim()) {
      setError("Say what would make this event successful.");
      return;
    }
    if (step === 3 && !input.targetPeople.trim()) {
      setError("Say who you want to meet.");
      return;
    }
    setStep((current) => current + 1);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (step < 3) {
      next();
      return;
    }
    if (!input.targetPeople.trim()) {
      setError("Say who you want to meet.");
      return;
    }
    setPending(true);
    setError("");
    try {
      await onSave(input);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the event.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-xl space-y-4">
      <Steps labels={labels} index={step} />
      {step === 0 ? (
        <>
          <h1 className="serif text-4xl">What is the event?</h1>
          <Field label="Event name" value={input.name} onChange={(event) => set("name", event.target.value)} required />
          <Field label="Event type" value={input.type} onChange={(event) => set("type", event.target.value)} placeholder="Conference, chamber, meetup" required />
        </>
      ) : null}
      {step === 1 ? (
        <>
          <h1 className="serif text-4xl">When and where?</h1>
          <Field label="Location" value={input.location} onChange={(event) => set("location", event.target.value)} required />
          <Field label="Date" type="date" value={input.date} onChange={(event) => set("date", event.target.value)} required />
        </>
      ) : null}
      {step === 2 ? (
        <>
          <h1 className="serif text-4xl">What does success look like?</h1>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-muted">Goal</span>
            <select
              value={input.goal}
              onChange={(event) => set("goal", event.target.value as NetworkingGoal)}
              className="w-full rounded-2xl border border-line bg-white px-3 py-3"
            >
              {NETWORKING_GOALS.map((goal) => (
                <option key={goal} value={goal}>
                  {GOAL_LABELS[goal]}
                </option>
              ))}
            </select>
          </label>
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
        <Button type="submit" disabled={pending} className="flex-1">
          {step < 3 ? "Continue" : pending ? "Saving…" : "Create event"}
        </Button>
      </div>
    </form>
  );
}
