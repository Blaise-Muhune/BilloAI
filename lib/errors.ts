export function isSafeUserMessage(message: string) {
  if (!message || message.length > 200) return false;
  if (/[\n\r]/.test(message) || /\s+at\s+\S/.test(message)) return false;
  if (
    /(api[_ ]?key|openai|openrouter|firebase-admin|ECONN|ETIMEDOUT|sk-|rk_|whsec_|cus_|price_|pi_|BEGIN PRIVATE|stripe\.com|JSON\.parse)/i.test(
      message,
    )
  ) {
    return false;
  }
  return /^[A-Z]/.test(message);
}

export function publicErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message.trim() : "";
  return isSafeUserMessage(message) ? message : fallback;
}

export function userMessage(error: unknown, fallback: string) {
  return publicErrorMessage(error, fallback);
}

export function reportServerError(scope: string, error: unknown) {
  console.error(`BilloAI ${scope}`, error);
}

export function reportClientError(error: Error & { digest?: string }) {
  console.error("BilloAI client error", error.digest ?? "", error);
}
