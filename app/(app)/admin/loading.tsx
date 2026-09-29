import { PageHeader, PageWrap } from "@/components/ui";
import { StatRowSkeleton } from "@/components/loading";

export default function Loading() {
  return (
    <PageWrap>
      <PageHeader kicker="Ops" title="What is live" />
      <StatRowSkeleton count={4} />
      <StatRowSkeleton count={4} />
    </PageWrap>
  );
}
