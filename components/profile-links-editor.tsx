"use client";

import { EXTRA_LINK_KINDS, type ProfileLink } from "@/lib/profile-links";

export function ProfileLinksEditor({
  links,
  onChange,
}: {
  links: ProfileLink[];
  onChange: (next: ProfileLink[]) => void;
}) {
  function add(label: string) {
    if (links.length >= 8) return;
    onChange([...links, { label, url: "" }]);
  }

  function set(index: number, patch: Partial<ProfileLink>) {
    onChange(links.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  function remove(index: number) {
    onChange(links.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <div className="space-y-3 lg:col-span-2">
      <p className="text-sm font-medium text-muted">More links</p>
      {links.length ? (
        <ul className="space-y-3">
          {links.map((item, index) => (
            <li key={`${item.label}-${index}`} className="grid gap-2 sm:grid-cols-[8rem_minmax(0,1fr)_auto]">
              <input
                value={item.label}
                onChange={(event) => set(index, { label: event.target.value })}
                aria-label="Link name"
                className="field-control"
                placeholder="Label"
              />
              <input
                value={item.url}
                onChange={(event) => set(index, { url: event.target.value })}
                aria-label={`${item.label || "Link"} URL`}
                className="field-control"
                placeholder="https://"
                inputMode="url"
              />
              <button type="button" className="text-sm font-semibold text-muted hover:text-foreground" onClick={() => remove(index)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {EXTRA_LINK_KINDS.map((kind) => (
          <button
            key={kind.id}
            type="button"
            className="rounded-full border border-line px-3 py-1.5 text-sm font-semibold hover:border-accent"
            onClick={() => add(kind.label)}
          >
            {kind.label}
          </button>
        ))}
      </div>
    </div>
  );
}
