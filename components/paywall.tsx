import Link from "next/link";

export function PaywallNotice({
  title = "Your first event includes this",
  body = "After that, Individual covers every event. A Team seat covers every event. A group seat only covers the event someone paid for. You still send the message yourself.",
  eventName,
  reason,
}: {
  title?: string;
  body?: string;
  eventName?: string;
  reason?: string;
}) {
  const seated = reason === "group-seat" || Boolean(eventName);
  const heading = seated && eventName ? `The seat was for ${eventName}` : title;
  const copy = seated
    ? "That night is covered. Next is Individual, a Team seat, or another seat paid for a different event. Anyone you already saved stays on your account."
    : body;
  return (
    <div className="surface space-y-4 p-6 lg:p-8">
      <h2 className="serif text-3xl leading-tight">{heading}</h2>
      <p className="max-w-xl text-muted">{copy}</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/billing" className="inline-flex rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-ink">
          Choose Individual
        </Link>
        <Link href="/billing?plan=team" className="inline-flex rounded-full border border-line bg-card px-5 py-3 text-sm font-semibold">
          Team seat
        </Link>
      </div>
    </div>
  );
}
