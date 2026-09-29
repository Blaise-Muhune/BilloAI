import Link from "next/link";

export function PaywallNotice({
  title = "Your first event includes this",
  body = "After that, Individual covers every event. A group seat only covers the event someone paid for. You still send the message yourself.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <div className="surface space-y-4 p-6 lg:p-8">
      <h2 className="serif text-3xl leading-tight">{title}</h2>
      <p className="max-w-xl text-muted">{body}</p>
      <Link href="/billing" className="inline-flex rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-ink">
        Choose a plan
      </Link>
    </div>
  );
}
