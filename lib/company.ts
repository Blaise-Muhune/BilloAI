export function normalizeCompany(name: string) {
  return name
    .toLowerCase()
    .replace(/[.,/#()'"]/g, " ")
    .replace(/\b(inc|llc|ltd|corp|corporation|company|co|the|plc|gmbh)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function companyFlagId(teamId: string, name: string) {
  const key = normalizeCompany(name);
  if (!teamId || !key) return "";
  return `${teamId}__${key.replace(/[^a-z0-9]+/g, "_").slice(0, 80)}`;
}
