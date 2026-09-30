export function phoneDigits(value: string) {
  const text = value.trim();
  if (!text) return "";
  const plus = text.startsWith("+") || text.startsWith("00");
  const digits = text.replace(/\D/g, "");
  if (digits.length < 7) return "";
  return plus ? `+${digits.replace(/^00/, "")}` : digits;
}

export function telHref(value: string) {
  const digits = phoneDigits(value);
  return digits ? `tel:${digits}` : "";
}

export function whatsappDigits(url: string) {
  try {
    const href = new URL(/^[a-z]+:\/\//i.test(url) ? url : `https://${url}`);
    if (!/wa\.me$|whatsapp\.com$/i.test(href.hostname.replace(/^www\./, ""))) return "";
    const fromPath = href.pathname.replace(/\D/g, "");
    const fromQuery = href.searchParams.get("phone")?.replace(/\D/g, "") ?? "";
    return phoneDigits(fromQuery || fromPath);
  } catch {
    return phoneDigits(url);
  }
}
