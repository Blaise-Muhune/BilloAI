"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { BrandMark } from "@/components/brand";
import { Pulse } from "@/components/loading";
import { Button, ErrorNote, Field, PageHeader, PageWrap, Steps } from "@/components/ui";
import { getPublicProfile, savePublicProfile } from "@/lib/data";
import { userMessage } from "@/lib/errors";
import type { PublicProfile } from "@/lib/types";

const empty: PublicProfile = { name: "", company: "", title: "", email: "", linkedin: "", website: "" };

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PublicProfile>(empty);
  const [qr, setQr] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [cardReady, setCardReady] = useState(false);

  useEffect(() => {
    if (!user) return;
    void getPublicProfile(user.uid)
      .then((next) => {
        if (next) setProfile(next);
      })
      .finally(() => setCardReady(true));
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
    <PageWrap>
      <PageHeader kicker="Your card" title="What other people can scan" body="Notes stay private. This is the only thing another BilloAI user sees." />
      <form
        className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]"
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
          setSaving(true);
          try {
            await savePublicProfile(user.uid, profile);
            setMessage("Saved.");
          } catch (err) {
            setError(userMessage(err, "Could not save your card."));
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="surface space-y-5 p-6 lg:p-8">
          <Steps labels={["Who you are", "How to reach you"]} index={step} />
          {step === 0 ? (
            <div className="form-grid">
              <Field label="Name" value={profile.name} onChange={(event) => set("name", event.target.value)} required />
              <Field label="Company" value={profile.company} onChange={(event) => set("company", event.target.value)} />
              <Field label="Title" value={profile.title} onChange={(event) => set("title", event.target.value)} className="lg:col-span-2" />
            </div>
          ) : (
            <div className="form-grid">
              {qr ? <img src={qr} alt="Your BilloAI QR code" className="surface w-40 bg-white p-3 lg:hidden" /> : <Pulse className="h-40 w-40 rounded-2xl lg:hidden" />}
              <Field label="Email" type="email" value={profile.email} onChange={(event) => set("email", event.target.value)} />
              <Field label="LinkedIn" value={profile.linkedin} onChange={(event) => set("linkedin", event.target.value)} />
              <Field label="Website" value={profile.website} onChange={(event) => set("website", event.target.value)} className="lg:col-span-2" />
            </div>
          )}
          {error ? <ErrorNote>{error}</ErrorNote> : null}
          {message ? <p className="text-sm text-accent">{message}</p> : null}
          <div className="flex gap-3">
            {step > 0 ? (
              <Button type="button" tone="ghost" onClick={() => setStep(0)}>
                Back
              </Button>
            ) : null}
            <Button type="submit" busy={saving} disabled={!cardReady} className="min-w-40">
              {step === 0 ? "Continue" : saving ? "Saving…" : "Save card"}
            </Button>
          </div>
        </div>
        <aside className="surface hidden h-fit p-6 lg:block">
          <div className="flex items-center gap-2.5">
            <BrandMark className="h-7 w-7" />
            <p className="kicker">Your card</p>
          </div>
          <p className="serif mt-3 text-3xl">{profile.name || "Your name"}</p>
          <p className="mt-2 text-muted">{[profile.title, profile.company].filter(Boolean).join(" · ") || "Title and company"}</p>
          {qr ? <img src={qr} alt="Your BilloAI QR code" className="mt-6 w-full bg-white p-3" /> : <Pulse className="mt-6 aspect-square w-full rounded-2xl" />}
          <p className="mt-4 text-sm text-muted">Only this is public if someone scans you.</p>
        </aside>
      </form>
    </PageWrap>
  );
}
