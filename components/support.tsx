import { supportEmail } from "@/lib/support";

export { supportEmail };

export function SupportLink({ className = "font-semibold text-accent" }: { className?: string }) {
  return (
    <a className={className} href={`mailto:${supportEmail}`}>
      {supportEmail}
    </a>
  );
}
