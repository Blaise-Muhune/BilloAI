import type { ReactNode } from "react";
import type { CardRowKind } from "@/lib/profile-links";

function IconWrap({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-5 w-5 ${className}`} aria-hidden>
      {children}
    </svg>
  );
}

export function ChannelMark({ kind }: { kind: CardRowKind }) {
  if (kind === "linkedin") {
    return (
      <IconWrap>
        <rect width="24" height="24" rx="5" fill="#0A66C2" />
        <path fill="#fff" d="M7.15 9.2h2.2V17h-2.2zM8.25 6.15a1.28 1.28 0 1 1 0 2.56 1.28 1.28 0 0 1 0-2.56zM12.2 9.2h2.1v1.06h.03c.3-.56 1.02-1.16 2.1-1.16 2.24 0 2.65 1.47 2.65 3.38V17h-2.2v-3.28c0-.78-.02-1.78-1.08-1.78-1.08 0-1.25.85-1.25 1.73V17H12.2z" />
      </IconWrap>
    );
  }
  if (kind === "email") {
    return (
      <IconWrap className="text-accent">
        <rect x="3.5" y="5.5" width="17" height="13" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4.2 7.2 12 12.4 19.8 7.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </IconWrap>
    );
  }
  if (kind === "phone") {
    return (
      <IconWrap className="text-accent">
        <path
          d="M7.4 3.8h2.3l1.1 3.3-1.5 1.5a12 12 0 0 0 4.1 4.1l1.5-1.5 3.3 1.1v2.3c0 .7-.4 1.5-1.2 1.8-2 .8-6.4.4-9.7-2.9S4.8 7.7 5.6 5c.3-.8 1.1-1.2 1.8-1.2Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </IconWrap>
    );
  }
  if (kind === "x") {
    return (
      <IconWrap>
        <path fill="currentColor" d="M4.2 4.2h4.3l3.4 4.7 4-4.7h3.9l-5.9 6.9 6.2 8.7h-4.3l-3.8-5.3-4.5 5.3H4.2l6.3-7.4z" />
      </IconWrap>
    );
  }
  if (kind === "instagram") {
    return (
      <IconWrap className="text-foreground">
        <rect x="4" y="4" width="16" height="16" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="16.4" cy="7.6" r="0.9" fill="currentColor" />
      </IconWrap>
    );
  }
  if (kind === "github") {
    return (
      <IconWrap>
        <path
          fill="currentColor"
          d="M12 3.2a8.8 8.8 0 0 0-2.8 17.1c.44.08.6-.2.6-.42v-1.5c-2.45.53-3-1.18-3-1.18-.4-1-.98-1.27-.98-1.27-.8-.55.06-.54.06-.54.9.06 1.37.93 1.37.93.8 1.36 2.1.97 2.6.74.08-.58.31-.97.56-1.2-2-.22-4.1-1-4.1-4.4 0-.97.35-1.77.92-2.4-.09-.22-.4-1.13.09-2.35 0 0 .75-.24 2.46.91a8.5 8.5 0 0 1 4.48 0c1.7-1.15 2.45-.91 2.45-.91.5 1.22.18 2.13.1 2.35.57.63.91 1.43.91 2.4 0 3.41-2.1 4.18-4.11 4.4.32.28.61.82.61 1.66v2.46c0 .23.16.5.61.42A8.8 8.8 0 0 0 12 3.2z"
        />
      </IconWrap>
    );
  }
  if (kind === "youtube") {
    return (
      <IconWrap>
        <rect width="24" height="24" rx="6" fill="#FF0000" />
        <path fill="#fff" d="M10 8.6v6.8l6-3.4z" />
      </IconWrap>
    );
  }
  if (kind === "calendly") {
    return (
      <IconWrap className="text-accent">
        <rect x="3.5" y="5" width="17" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 3.5v3M16 3.5v3M3.5 10h17" stroke="currentColor" strokeWidth="1.8" />
      </IconWrap>
    );
  }
  return (
    <IconWrap className="text-accent">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4.5 12h15M12 4.5c2.4 2.6 2.4 12.4 0 15M12 4.5c-2.4 2.6-2.4 12.4 0 15" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </IconWrap>
  );
}
