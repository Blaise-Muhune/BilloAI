import Link from "next/link";

export function SetupNotice() {
  return (
    <p className="surface px-4 py-3 text-sm text-muted">
      Add your Firebase web config and OpenAI key to <span className="text-foreground">.env.local</span> using{" "}
      <span className="text-foreground">.env.example</span>, then restart the app.
    </p>
  );
}

export function Steps({ labels, index }: { labels: string[]; index: number }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2" aria-hidden>
        {labels.map((label, item) => (
          <span key={label} className={`h-1.5 flex-1 rounded-full ${item <= index ? "bg-accent" : "bg-line"}`} />
        ))}
      </div>
      <p className="kicker">
        Step {index + 1} of {labels.length} · {labels[index]}
      </p>
    </div>
  );
}

export function PageTitle({ kicker, title, body }: { kicker?: string; title: string; body?: string }) {
  return (
    <header>
      {kicker ? <p className="kicker">{kicker}</p> : null}
      <h1 className="serif mt-1 text-4xl leading-tight">{title}</h1>
      {body ? <p className="mt-2 text-muted">{body}</p> : null}
    </header>
  );
}

export function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-muted">{label}</span>
      <input
        {...props}
        className="w-full rounded-2xl border border-line bg-white px-3 py-3 shadow-sm outline-none transition focus:border-accent"
      />
    </label>
  );
}

export function Area({
  label,
  ...props
}: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-muted">{label}</span>
      <textarea
        {...props}
        className="min-h-28 w-full rounded-2xl border border-line bg-white px-3 py-3 shadow-sm outline-none transition focus:border-accent"
      />
    </label>
  );
}

export function Button({
  children,
  tone = "solid",
  ...props
}: { tone?: "solid" | "ghost" } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles =
    tone === "solid"
      ? "bg-accent text-accent-ink shadow-[0_8px_20px_rgb(11_107_79/0.25)] hover:brightness-110"
      : "border border-line bg-card text-foreground shadow-sm hover:bg-white";
  return (
    <button
      {...props}
      className={`rounded-full px-4 py-3 text-sm font-semibold transition disabled:opacity-50 ${styles} ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function PriorityBadge({ level }: { level: "high" | "medium" | "low" | null }) {
  if (!level) return <span className="rounded-full bg-line/70 px-2.5 py-1 text-xs font-semibold text-muted">Not scored</span>;
  const label = level === "high" ? "High" : level === "medium" ? "Medium" : "Low";
  const color =
    level === "high"
      ? "bg-orange-100 text-high"
      : level === "medium"
        ? "bg-amber-100 text-medium"
        : "bg-stone-200 text-low";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${color}`}>{label}</span>;
}

export function Avatar({ name }: { name: string }) {
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#e5f4ee] text-sm font-semibold text-accent">
      {initials}
    </span>
  );
}

export function PersonLink({
  href,
  name,
  detail,
  level,
}: {
  href: string;
  name: string;
  detail?: string;
  level: "high" | "medium" | "low" | null;
}) {
  return (
    <Link href={href} className="surface flex items-center gap-3 p-3 transition hover:-translate-y-0.5">
      <Avatar name={name || "?"} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{name || "Unnamed"}</span>
        {detail ? <span className="block truncate text-sm text-muted">{detail}</span> : null}
      </span>
      <PriorityBadge level={level} />
    </Link>
  );
}

export function Empty({ title, body, href, action }: { title: string; body: string; href?: string; action?: string }) {
  return (
    <div className="surface border-dashed px-5 py-8 text-center">
      <h2 className="serif text-2xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-xs text-muted">{body}</p>
      {href && action ? (
        <Link href={href} className="mt-4 inline-block rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink">
          {action}
        </Link>
      ) : null}
    </div>
  );
}
