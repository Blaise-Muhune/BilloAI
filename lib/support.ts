export const supportEmail = "blaisemu007@gmail.com";

export function isInboxOwner(email?: string | null) {
  return (email ?? "").trim().toLowerCase() === supportEmail.toLowerCase();
}
