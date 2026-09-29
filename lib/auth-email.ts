import type { ActionCodeSettings } from "firebase/auth";

export function safeAuthNext(value: string | null | undefined) {
  if (!value) return "/home";
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    if (typeof window !== "undefined" && url.origin === window.location.origin) {
      return `${url.pathname}${url.search}` || "/home";
    }
  } catch {
    return "/home";
  }
  return "/home";
}

export function authEmailSettings(next = "/home"): ActionCodeSettings {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const path = `/auth/action?next=${encodeURIComponent(safeAuthNext(next))}`;
  return {
    url: origin ? `${origin}${path}` : path,
    handleCodeInApp: false,
  };
}
