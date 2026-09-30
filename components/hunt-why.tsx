import { InPlayBadge } from "@/components/ui";

export type HuntSummary = {
  icp: string;
  targetCompanies: string[];
  targetRoles: string;
};

export function HuntWhy({
  eventGoal,
  hunt,
  inPlay = false,
  heldBy,
}: {
  eventGoal?: string;
  hunt?: HuntSummary | null;
  inPlay?: boolean;
  heldBy?: string[];
}) {
  const companies = hunt?.targetCompanies.filter(Boolean) ?? [];
  if (!eventGoal?.trim() && !hunt?.icp && !companies.length && !hunt?.targetRoles && !inPlay) return null;
  return (
    <div className="rounded-2xl bg-[#f7f3ea] px-4 py-3 text-sm">
      {eventGoal?.trim() ? (
        <p>
          <span className="text-muted">Why you went. </span>
          {eventGoal.trim()}
        </p>
      ) : null}
      {hunt?.icp ? (
        <p className={eventGoal?.trim() ? "mt-1" : ""}>
          <span className="text-muted">Company hunt. </span>
          {hunt.icp}
        </p>
      ) : null}
      {companies.length ? (
        <p className="mt-1 text-muted">
          Scoring against {companies.length} {companies.length === 1 ? "named company" : "named companies"} the team set.
        </p>
      ) : hunt?.targetRoles ? (
        <p className="mt-1 text-muted">Hunt roles: {hunt.targetRoles}</p>
      ) : null}
      <div className="mt-2">
        <InPlayBadge show={inPlay} heldBy={heldBy} />
      </div>
    </div>
  );
}
