import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand";

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

export function ErrorNote({
  children,
  retry,
  className = "",
  id,
}: {
  children?: ReactNode;
  retry?: () => void;
  className?: string;
  id?: string;
}) {
  if (!children) return null;
  return (
    <p id={id} role="alert" aria-live="assertive" className={`text-sm text-high ${className}`}>
      {children}
      {retry ? (
        <>
          {" "}
          <button type="button" className="font-semibold text-accent" onClick={retry}>
            Retry
          </button>
        </>
      ) : null}
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
  invalid,
  errorId,
  ...props
}: { label: string; invalid?: boolean; errorId?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const describedBy = [props["aria-describedby"], errorId].filter(Boolean).join(" ") || undefined;
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1.5 block text-sm font-medium text-muted">{label}</span>
      <input
        {...props}
        aria-invalid={invalid || props["aria-invalid"]}
        aria-describedby={describedBy}
        className="field-control"
      />
    </label>
  );
}

export function Area({
  label,
  action,
  className,
  id,
  ...props
}: { label: string; action?: ReactNode } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className={`block ${className ?? ""}`}>
      <span className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-muted">
          {label}
        </label>
        {action}
      </span>
      <textarea id={id} {...props} className="field-control min-h-28" />
    </div>
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
  busy = false,
  className,
  disabled,
  ...props
}: { tone?: "solid" | "ghost"; busy?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles =
    tone === "solid"
      ? "bg-accent text-accent-ink shadow-[0_8px_20px_rgb(11_107_79/0.25)] hover:brightness-110"
      : "border border-line bg-card text-foreground shadow-sm hover:bg-white";
  return (
    <button
      {...props}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`rounded-full px-5 py-3 text-sm font-semibold transition disabled:opacity-50 ${styles} ${className ?? ""}`}
    >
      {busy ? (
        <span className="inline-flex items-center justify-center gap-2">
          <span className="busy-dot" aria-hidden />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}

const FIT_BADGE = {
  high: { short: "High", label: "High", hint: "Worth staying connected", className: "bg-orange-100 text-high" },
  medium: { short: "Medium", label: "Medium", hint: "A lighter follow-up", className: "bg-amber-100 text-medium" },
  low: { short: "Low", label: "Low", hint: "Weak fit — you can skip", className: "bg-stone-200 text-low" },
  unknown: {
    short: "Not enough",
    label: "Not enough to say",
    hint: "Need what you talked about, or a public page. This is not Low.",
    className: "border-2 border-dashed border-[#a16207] bg-[#fff8e8] text-[#7c4a12]",
  },
} as const;

export function InPlayBadge({ show, heldBy }: { show?: boolean; heldBy?: string[] }) {
  if (!show) return null;
  const names = (heldBy ?? []).filter(Boolean);
  const who =
    names.length === 0
      ? ""
      : names.length === 1
        ? names[0]
        : names.length === 2
          ? `${names[0]} and ${names[1]}`
          : `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
  return (
    <p className="rounded-2xl bg-[#fff8e8] px-4 py-3 text-sm">
      {who
        ? `This company is already in play. ${who} has it. Their notes stay private.`
        : "This company is already in play. Someone on the team has it. Their notes stay private."}
    </p>
  );
}

export function PriorityBadge({
  level,
  size = "sm",
  explain = false,
}: {
  level: "high" | "medium" | "low" | "unknown" | null;
  size?: "sm" | "md";
  explain?: boolean;
}) {
  const box = size === "md" ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs";
  if (!level) {
    return (
      <span className={`inline-flex rounded-full border border-line bg-card font-semibold text-muted ${box}`}>
        Not scored
      </span>
    );
  }
  const item = FIT_BADGE[level];
  const label = size === "md" || level === "unknown" ? item.label : item.short;
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <span className={`max-w-full rounded-full font-semibold tracking-wide ${box} ${item.className}`}>{label}</span>
      {explain ? <span className="text-sm font-medium leading-snug text-muted">{item.hint}</span> : null}
    </span>
  );
}

export function Fold({
  title,
  children,
  open,
  flush,
}: {
  title: string;
  children: ReactNode;
  open?: boolean;
  flush?: boolean;
}) {
  return (
    <details className={flush ? "" : "surface overflow-hidden"} open={open}>
      <summary className={`cursor-pointer text-sm font-semibold ${flush ? "py-1" : "px-5 py-4"}`}>{title}</summary>
      <div className={flush ? "mt-3" : "border-t border-line px-5 pb-5 pt-4"}>{children}</div>
    </details>
  );
}

export function Avatar({ name, size = "md", photoSrc }: { name: string; size?: "md" | "lg"; photoSrc?: string }) {
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";
  const box = size === "lg" ? "h-16 w-16 text-lg" : "h-11 w-11 text-sm";
  return (
    <span className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-[#e5f4ee] font-semibold text-accent ${box}`}>
      {initials}
      {photoSrc ? (
        <img
          src={photoSrc}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
    </span>
  );
}

export function PersonLink({
  href,
  name,
  detail,
  action,
  level,
  layout = "stack",
  photoSrc,
}: {
  href: string;
  name: string;
  detail?: string;
  action?: string;
  level: "high" | "medium" | "low" | "unknown" | null;
  layout?: "stack" | "columns";
  photoSrc?: string;
}) {
  const row =
    layout === "columns"
      ? "flex items-center gap-3 px-4 py-3.5 transition hover:bg-[#f7f3ea] lg:grid lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto] lg:gap-4"
      : "flex items-center gap-3 px-4 py-3.5 transition hover:bg-[#f7f3ea]";
  return (
    <Link href={href} className={row}>
      <span className="flex min-w-0 items-center gap-3">
        <Avatar name={name || "?"} photoSrc={photoSrc} />
        <span className="min-w-0">
          <span className="block truncate font-semibold">{name || "Unnamed"}</span>
          {action ? <span className="block truncate text-sm font-semibold text-accent">{action}</span> : null}
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
  photoSrc,
}: {
  kicker?: string;
  name: string;
  line: string;
  footer?: string;
  photoSrc?: string;
}) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.07] p-8">
      <div className="flex items-center gap-2.5">
        <BrandMark className="h-7 w-7" />
        <p className="kicker text-[#9ddec8]">{kicker}</p>
      </div>
      {photoSrc ? <img src={photoSrc} alt="" className="mt-5 h-16 w-16 rounded-full object-cover" /> : null}
      <p className="serif mt-5 text-4xl leading-tight xl:text-5xl">{name}</p>
      <p className="mt-4 text-lg text-white/70">{line}</p>
      {footer ? <p className="mt-8 text-sm text-white/45">{footer}</p> : null}
    </div>
  );
}
