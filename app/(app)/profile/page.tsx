"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { BrandMark } from "@/components/brand";
import { Pulse } from "@/components/loading";
import { ProfileLinksEditor } from "@/components/profile-links-editor";
import { ProfilePhotoField } from "@/components/profile-photo-field";
import { Button, ErrorNote, Field, PageHeader, PageWrap } from "@/components/ui";
import { cardUrl } from "@/lib/card";
import { claimCardSlug, getPublicProfile, savePublicProfile } from "@/lib/data";
import { userMessage } from "@/lib/errors";
import { emptyProfile, profilePhotoHref, publicLinkRows } from "@/lib/profile-links";
import type { PublicProfile } from "@/lib/types";

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PublicProfile>(emptyProfile());
  const [qr, setQr] = useState("");
  const [href, setHref] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [cardReady, setCardReady] = useState(false);

  useEffect(() => {
    if (!user) return;
    void getPublicProfile(user.uid)
      .then(async (next) => {
        if (!next) return;
        if (next.name && !next.slug) {
          try {
            next = { ...next, slug: await claimCardSlug(user.uid, next.name) };
          } catch {
            /* uid link still works */
          }
        }
        setProfile(next);
      })
      .finally(() => setCardReady(true));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const url = cardUrl(profile.slug || user.uid);
    setHref(url);
    void import("qrcode").then((QRCode) => {
      void QRCode.toDataURL(url, {
        margin: 4,
        width: 320,
        errorCorrectionLevel: "M",
        color: { dark: "#1a1612", light: "#ffffff" },
      }).then(setQr);
    });
  }, [user, profile.slug]);

  function set<K extends keyof PublicProfile>(key: K, value: PublicProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  async function copyLink() {
    if (!href) return;
    try {
      await navigator.clipboard.writeText(href);
      setMessage("Link copied.");
    } catch {
      setError("Could not copy the link.");
    }
  }

  async function shareCard() {
    if (!href) return;
    if (!navigator.share) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({ title: profile.name || "My BilloAI card", url: href });
    } catch {
      /* canceled */
    }
  }

  const line = [profile.title, profile.company].filter(Boolean).join(" · ");
  const shown = publicLinkRows(profile);

  return (
    <PageWrap>
      <PageHeader kicker="Your card" title="What they see when they scan you" body="Show the QR. Their camera opens your card. LinkedIn and any other link you add sit on it." />
      <form
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!user) return;
          if (!profile.name.trim()) {
            setError("Add your name.");
            return;
          }
          setError("");
          setMessage("");
          setSaving(true);
          try {
            await savePublicProfile(user.uid, profile).then(setProfile);
            setMessage("Saved.");
          } catch (err) {
            setError(userMessage(err, "Could not save your card."));
          } finally {
            setSaving(false);
          }
        }}
      >
        <aside className="surface order-first h-fit space-y-4 p-5 lg:order-last lg:p-6">
          <div className="flex items-center gap-2.5">
            <BrandMark className="h-7 w-7" />
            <p className="kicker">Your card</p>
          </div>
          {user && profile.photoUpdatedAt ? (
            <img src={profilePhotoHref(user.uid, profile.photoUpdatedAt)} alt="" className="mx-auto h-20 w-20 rounded-full object-cover" />
          ) : null}
          {qr ? <img src={qr} alt="Your BilloAI QR code" className="mx-auto w-48 bg-white p-3 lg:w-full" /> : <Pulse className="mx-auto aspect-square w-48 rounded-2xl lg:w-full" />}
          {href ? (
            <p className="break-long text-center text-sm text-muted">{href.replace(/^https?:\/\//, "")}</p>
          ) : null}
          <div>
            <p className="serif text-2xl leading-tight">{profile.name || "Your name"}</p>
            <p className="mt-1 text-sm text-muted">{line || "Title and company"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" tone="ghost" className="px-4 py-2" onClick={() => void copyLink()}>
              Copy link
            </Button>
            <Button type="button" tone="ghost" className="px-4 py-2" onClick={() => void shareCard()}>
              Share
            </Button>
            {qr ? (
              <a href={qr} download="billoai-card.png" className="rounded-full border border-line bg-card px-4 py-2 text-sm font-semibold shadow-sm hover:bg-white">
                Download
              </a>
            ) : null}
          </div>
        </aside>

        <div className="surface space-y-6 p-6 lg:p-8">
          <div>
            <p className="kicker text-accent">Who you are</p>
            {user ? (
              <div className="mt-4">
                <ProfilePhotoField
                  uid={user.uid}
                  photoUpdatedAt={profile.photoUpdatedAt}
                  onChange={(next) => setProfile((current) => ({ ...current, ...next }))}
                />
              </div>
            ) : null}
            <div className="form-grid mt-4">
              <Field label="Name" value={profile.name} onChange={(event) => set("name", event.target.value)} required />
              <Field label="Company" value={profile.company} onChange={(event) => set("company", event.target.value)} />
              <Field label="Title" value={profile.title} onChange={(event) => set("title", event.target.value)} className="lg:col-span-2" />
            </div>
          </div>
          <div>
            <p className="kicker text-accent">How to reach you</p>
            <div className="form-grid mt-4">
              <Field label="Email" type="email" value={profile.email} onChange={(event) => set("email", event.target.value)} />
              <Field label="Cell" type="tel" inputMode="tel" autoComplete="tel" value={profile.phone} onChange={(event) => set("phone", event.target.value)} />
              <Field label="LinkedIn" value={profile.linkedin} placeholder="linkedin.com/in/…" onChange={(event) => set("linkedin", event.target.value)} />
              <Field label="Website" value={profile.website} placeholder="yoursite.com" onChange={(event) => set("website", event.target.value)} />
              <ProfileLinksEditor links={profile.links ?? []} onChange={(links) => set("links", links)} />
            </div>
          </div>
          {error ? <ErrorNote>{error}</ErrorNote> : null}
          {message ? <p className="text-sm text-accent">{message}</p> : null}
          {shown.length ? <p className="text-sm text-muted">On the card: {shown.map((item) => item.label).join(" · ")}</p> : null}
          <Button type="submit" busy={saving} disabled={!cardReady} className="min-w-40">
            {saving ? "Saving…" : "Save card"}
          </Button>
        </div>
      </form>
    </PageWrap>
  );
}
