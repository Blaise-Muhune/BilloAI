export const supportEmail = "blaisemu007@gmail.com";

export function SupportLink({ className = "font-semibold text-accent" }: { className?: string }) {
  return (
    <a className={className} href={`mailto:${supportEmail}`}>
      {supportEmail}
    </a>
  );
}
