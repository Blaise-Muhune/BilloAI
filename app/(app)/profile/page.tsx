"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button, Field, Steps } from "@/components/ui";
import { getPublicProfile, savePublicProfile } from "@/lib/data";
import type { PublicProfile } from "@/lib/types";

const empty: PublicProfile = { name: "", company: "", title: "", email: "", linkedin: "", website: "" };

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PublicProfile>(empty);
  const [qr, setQr] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!user) return;
    void getPublicProfile(user.uid).then((next) => {
      if (next) setProfile(next);
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void import("qrcode").then((QRCode) => {
      void QRCode.toDataURL(`billoai:${user.uid}`, { margin: 1, width: 280 }).then(setQr);
    });
  }, [user]);

  function set<K extends keyof PublicProfile>(key: K, value: string) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  return (
    <form
      className="mx-auto max-w-xl space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (step === 0) {
          if (!profile.name.trim()) {
            setError("Add your name.");
            return;
          }
          setError("");
          setStep(1);
          return;
        }
        if (!user) return;
        setError("");
        setMessage("");
        try {
          await savePublicProfile(user.uid, profile);
          setMessage("Saved.");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not save your card.");
        }
      }}
    >
      <Steps labels={["Who you are", "How to reach you"]} index={step} />
      {step === 0 ? (
        <>
          <h1 className="serif text-4xl">Who you are</h1>
          <p className="text-muted">This is what another BilloAI user sees if they scan you. Notes stay private.</p>
          <Field label="Name" value={profile.name} onChange={(event) => set("name", event.target.value)} required />
          <Field label="Company" value={profile.company} onChange={(event) => set("company", event.target.value)} />
          <Field label="Title" value={profile.title} onChange={(event) => set("title", event.target.value)} />
        </>
      ) : (
        <>
          <h1 className="serif text-4xl">How to reach you</h1>
          {qr ? <img src={qr} alt="Your BilloAI QR code" className="surface w-40 bg-white p-3" /> : null}
          <Field label="Email" type="email" value={profile.email} onChange={(event) => set("email", event.target.value)} />
          <Field label="LinkedIn" value={profile.linkedin} onChange={(event) => set("linkedin", event.target.value)} />
          <Field label="Website" value={profile.website} onChange={(event) => set("website", event.target.value)} />
        </>
      )}
      {error ? <p className="text-sm text-high">{error}</p> : null}
      {message ? <p className="text-sm text-accent">{message}</p> : null}
      <div className="flex gap-3">
        {step > 0 ? (
          <Button type="button" tone="ghost" onClick={() => setStep(0)}>
            Back
          </Button>
        ) : null}
        <Button type="submit" className="flex-1">
          {step === 0 ? "Continue" : "Save card"}
        </Button>
      </div>
    </form>
  );
}
