import Link from "next/link";
import type { ReactNode } from "react";

export function PageWrap({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`page-wrap space-y-8 ${className}`}>{children}</div>;
}

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
  return <PageHeader kicker={kicker} title={title} body={body} />;
}

export function PageHeader({
  kicker,
  title,
  body,
  action,
}: {
  kicker?: string;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        {kicker ? <p className="kicker">{kicker}</p> : null}
        <h1 className="serif mt-1 text-[2.15rem] leading-[1.1] sm:text-4xl xl:text-[2.85rem]">{title}</h1>
        {body ? <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">{body}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function Field({
  label,
  className,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1.5 block text-sm font-medium text-muted">{label}</span>
      <input {...props} className="field-control" />
    </label>
  );
}

export function Area({
  label,
  className,
  ...props
}: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1.5 block text-sm font-medium text-muted">{label}</span>
      <textarea {...props} className="field-control min-h-28" />
    </label>
  );
}

export function SelectField({
  label,
  children,
  ...props
}: { label: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-muted">{label}</span>
      <select {...props} className="field-control">
        {children}
      </select>
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
      className={`rounded-full px-5 py-3 text-sm font-semibold transition disabled:opacity-50 ${styles} ${props.className ?? ""}`}
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

export function Avatar({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";
  const box = size === "lg" ? "h-16 w-16 text-lg" : "h-11 w-11 text-sm";
  return (
    <span className={`grid shrink-0 place-items-center rounded-full bg-[#e5f4ee] font-semibold text-accent ${box}`}>
      {initials}
    </span>
  );
}

export function PersonLink({
  href,
  name,
  detail,
  level,
  layout = "stack",
}: {
  href: string;
  name: string;
  detail?: string;
  level: "high" | "medium" | "low" | null;
  layout?: "stack" | "columns";
}) {
  const row =
    layout === "columns"
      ? "flex items-center gap-3 px-4 py-3.5 transition hover:bg-[#f7f3ea] lg:grid lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto] lg:gap-4"
      : "flex items-center gap-3 px-4 py-3.5 transition hover:bg-[#f7f3ea]";
  return (
    <Link href={href} className={row}>
      <span className="flex min-w-0 items-center gap-3">
        <Avatar name={name || "?"} />
        <span className="min-w-0">
          <span className="block truncate font-semibold">{name || "Unnamed"}</span>
          {detail && layout === "stack" ? <span className="block truncate text-sm text-muted">{detail}</span> : null}
          {detail && layout === "columns" ? <span className="block truncate text-sm text-muted lg:hidden">{detail}</span> : null}
        </span>
      </span>
      {layout === "columns" ? <span className="hidden truncate text-sm text-muted lg:block">{detail || "—"}</span> : null}
      <PriorityBadge level={level} />
    </Link>
  );
}

export function Empty({ title, body, href, action }: { title: string; body: string; href?: string; action?: string }) {
  return (
    <div className="surface flex flex-col items-start gap-5 px-6 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10 lg:py-14">
      <div className="max-w-xl">
        <h2 className="serif text-2xl lg:text-3xl">{title}</h2>
        <p className="mt-2 text-muted">{body}</p>
      </div>
      {href && action ? (
        <Link href={href} className="shrink-0 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink">
          {action}
        </Link>
      ) : null}
    </div>
  );
}

export function LiveCard({
  kicker = "Your card",
  name,
  line,
  footer,
}: {
  kicker?: string;
  name: string;
  line: string;
  footer?: string;
}) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.07] p-8">
      <p className="kicker text-[#9ddec8]">{kicker}</p>
      <p className="serif mt-5 text-4xl leading-tight xl:text-5xl">{name}</p>
      <p className="mt-4 text-lg text-white/70">{line}</p>
      {footer ? <p className="mt-8 text-sm text-white/45">{footer}</p> : null}
    </div>
  );
}
