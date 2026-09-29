export function looksLikeLink(value: string) {
  const text = value.trim();
  if (!text || /\s/.test(text)) return false;
  return /^(https?:\/\/|www\.)/i.test(text) || text.includes("linkedin.com") || /^[a-z0-9-]+\.[a-z]{2,}/i.test(text);
}

export function asHref(value: string) {
  const text = value.trim();
  return /^(https?:\/\/)/i.test(text) ? text : `https://${text}`;
}
