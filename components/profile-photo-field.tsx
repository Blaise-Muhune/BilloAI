"use client";

import { useRef, useState } from "react";
import { deleteJson, postForm } from "@/lib/api";
import { userMessage } from "@/lib/errors";
import { profilePhotoHref } from "@/lib/profile-links";

export function ProfilePhotoField({
  uid,
  photoUpdatedAt,
  onChange,
}: {
  uid: string;
  photoUpdatedAt?: string;
  onChange: (next: { photoPath: string; photoUpdatedAt: string }) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const href = photoUpdatedAt ? profilePhotoHref(uid, photoUpdatedAt) : "";

  async function upload(file: File) {
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.set("file", file);
      const next = await postForm<{ photoPath: string; photoUpdatedAt: string }>("/api/profile/photo", body);
      onChange(next);
    } catch (err) {
      setError(userMessage(err, "Could not save that photo."));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    setError("");
    try {
      await deleteJson("/api/profile/photo");
      onChange({ photoPath: "", photoUpdatedAt: "" });
    } catch (err) {
      setError(userMessage(err, "Could not remove that photo."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <span className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-[#f7f3ea] text-sm font-semibold text-muted">
        {href ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={href} alt="" className="h-full w-full object-cover" />
        ) : (
          "Photo"
        )}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold">Profile photo</p>
        <p className="mt-0.5 text-sm text-muted">On your card. JPEG, PNG, or WebP. Under 2 MB.</p>
        <div className="mt-2 flex flex-wrap gap-3">
          <button
            type="button"
            className="text-sm font-semibold text-accent hover:text-foreground"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            {busy ? "Saving…" : href ? "Replace photo" : "Add a photo"}
          </button>
          {href ? (
            <button type="button" className="text-sm font-semibold text-muted hover:text-foreground" disabled={busy} onClick={() => void remove()}>
              Remove
            </button>
          ) : null}
        </div>
        {error ? <p className="mt-1 text-sm text-red-700">{error}</p> : null}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
    </div>
  );
}
