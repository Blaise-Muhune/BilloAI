import { BrandMark } from "@/components/brand";
import { PageWrap } from "@/components/ui";

export function Pulse({ className = "", tone = "paper" }: { className?: string; tone?: "paper" | "ink" }) {
  return <span className={`skeleton ${tone === "ink" ? "skeleton-ink" : ""} ${className}`} aria-hidden />;
}

export function BusyBar({ className = "" }: { className?: string }) {
  return (
    <span className={`busy-track ${className}`} aria-hidden>
      <span className="busy-bar" />
    </span>
  );
}

export function ScreenStatus({ label }: { label: string }) {
  return (
    <span className="sr-only" role="status" aria-live="polite">
      {label}
    </span>
  );
}

export function BootScreen({ label = "Loading BilloAI" }: { label?: string }) {
  return (
    <div className="landing-shell fixed inset-0 z-50 grid min-h-dvh place-items-center px-6">
      <div className="flex flex-col items-center gap-5">
        <BrandMark className="h-12 w-12" />
        <BusyBar className="w-40" />
        <p className="text-sm text-muted">{label}</p>
        <ScreenStatus label={label} />
      </div>
    </div>
  );
}

export function OverlayStatus({ label }: { label: string }) {
  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-[rgb(244_239_230/0.72)] backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-4 rounded-[1.25rem] border border-line bg-card px-8 py-7 shadow-[var(--shadow)]">
        <BusyBar className="w-36" />
        <p className="text-sm font-semibold">{label}</p>
        <ScreenStatus label={label} />
      </div>
    </div>
  );
}

function HeaderPulse() {
  return (
    <div className="space-y-3">
      <Pulse className="h-3 w-16" />
      <Pulse className="h-10 w-[min(100%,22rem)]" />
      <Pulse className="h-4 w-[min(100%,36rem)]" />
    </div>
  );
}

function RowPulse({ columns = false }: { columns?: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3.5 ${columns ? "lg:grid lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto] lg:gap-4" : ""}`}>
      <span className="flex min-w-0 items-center gap-3">
        <Pulse className="h-11 w-11 shrink-0 rounded-full" />
        <span className="min-w-0 flex-1 space-y-2">
          <Pulse className="h-4 w-36" />
          <Pulse className="h-3 w-24 lg:hidden" />
        </span>
      </span>
      {columns ? <Pulse className="hidden h-3 w-28 lg:block" /> : null}
      <Pulse className="h-6 w-14 rounded-full" />
    </div>
  );
}

export function StatRowSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="surface px-5 py-6">
          <Pulse className="h-3 w-24" />
          <Pulse className="mt-4 h-12 w-16" />
        </div>
      ))}
    </div>
  );
}

export function HomeBodySkeleton() {
  return (
    <>
      <ScreenStatus label="Loading home" />
      <StatRowSkeleton />
      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.9fr)]">
        <div className="space-y-8">
          <section>
            <Pulse className="mb-3 h-3 w-28" />
            <div className="surface list-stack">
              <RowPulse />
              <RowPulse />
              <RowPulse />
            </div>
          </section>
          <section>
            <Pulse className="mb-3 h-3 w-40" />
            <div className="surface list-stack">
              <RowPulse columns />
              <RowPulse columns />
              <RowPulse columns />
            </div>
          </section>
        </div>
        <aside className="space-y-3">
          <div className="rounded-[1.6rem] bg-foreground p-6">
            <Pulse tone="ink" className="h-3 w-24" />
            <Pulse tone="ink" className="mt-4 h-8 w-48" />
            <Pulse tone="ink" className="mt-3 h-4 w-full" />
          </div>
          <Pulse className="h-3 w-32" />
          <div className="surface p-5">
            <Pulse className="h-5 w-40" />
            <Pulse className="mt-3 h-3 w-28" />
          </div>
          <div className="surface p-5">
            <Pulse className="h-5 w-36" />
            <Pulse className="mt-3 h-3 w-24" />
          </div>
        </aside>
      </div>
    </>
  );
}

export function EventCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <ScreenStatus label="Loading events" />
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="surface flex flex-col p-6">
          <Pulse className="h-3 w-24" />
          <Pulse className="mt-3 h-7 w-[80%]" />
          <Pulse className="mt-3 h-3 w-32" />
          <Pulse className="mt-8 h-4 w-28" />
        </div>
      ))}
    </div>
  );
}

export function PeopleListSkeleton() {
  return (
    <>
      <ScreenStatus label="Loading people" />
      <div className="surface flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:p-4">
        <Pulse className="h-12 flex-1 rounded-2xl" />
        <div className="flex gap-2">
          <Pulse className="h-10 w-14 rounded-full" />
          <Pulse className="h-10 w-14 rounded-full" />
          <Pulse className="h-10 w-16 rounded-full" />
        </div>
      </div>
      <div className="surface list-stack">
        <RowPulse columns />
        <RowPulse columns />
        <RowPulse columns />
        <RowPulse columns />
        <RowPulse columns />
      </div>
    </>
  );
}

export function TaskListSkeleton() {
  return (
    <div className="space-y-6">
      <ScreenStatus label="Loading conversations" />
      {Array.from({ length: 2 }).map((_, index) => (
        <section key={index} className="space-y-3">
          <Pulse className="h-3 w-20" />
          <div className="surface list-stack">
            <div className="flex items-center justify-between px-5 py-4">
              <span className="space-y-2">
                <Pulse className="h-4 w-48" />
                <Pulse className="h-3 w-32" />
              </span>
              <Pulse className="h-4 w-20" />
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <span className="space-y-2">
                <Pulse className="h-4 w-40" />
                <Pulse className="h-3 w-28" />
              </span>
              <Pulse className="h-4 w-20" />
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

export function CaptureBodySkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ScreenStatus label="Loading capture" />
      {Array.from({ length: 2 }).map((_, index) => (
        <div key={index} className="surface space-y-4 p-6 lg:p-8">
          <Pulse className="h-8 w-40" />
          <Pulse className="h-4 w-full" />
          <Pulse className="h-16 w-full rounded-2xl" />
        </div>
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <PageWrap>
      <ScreenStatus label="Loading details" />
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)]">
        <div className="space-y-6">
          <div className="surface flex items-start gap-5 p-6 lg:p-8">
            <Pulse className="h-16 w-16 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-3">
              <Pulse className="h-5 w-16 rounded-full" />
              <Pulse className="h-10 w-[70%]" />
              <Pulse className="h-4 w-48" />
            </div>
          </div>
          <div className="surface space-y-3 p-6">
            <Pulse className="h-3 w-28" />
            <Pulse className="h-4 w-full" />
            <Pulse className="h-4 w-[85%]" />
            <Pulse className="h-4 w-[60%]" />
          </div>
        </div>
        <div className="surface space-y-4 p-6">
          <Pulse className="h-3 w-28" />
          <Pulse className="h-32 w-full rounded-2xl" />
          <Pulse className="h-12 w-full rounded-full" />
        </div>
      </div>
    </PageWrap>
  );
}

export function FormSplitSkeleton() {
  return (
    <PageWrap>
      <ScreenStatus label="Loading form" />
      <HeaderPulse />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="surface space-y-4 p-6 lg:p-8">
          <Pulse className="h-3 w-40" />
          <Pulse className="h-12 w-full rounded-2xl" />
          <Pulse className="h-12 w-full rounded-2xl" />
          <Pulse className="h-12 w-40 rounded-full" />
        </div>
        <div className="hidden rounded-[1.6rem] bg-foreground p-6 lg:block">
          <Pulse tone="ink" className="h-3 w-24" />
          <Pulse tone="ink" className="mt-4 h-8 w-40" />
          <Pulse tone="ink" className="mt-3 h-4 w-full" />
        </div>
      </div>
    </PageWrap>
  );
}

export function JoinBodySkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <ScreenStatus label="Loading join" />
      <div className="surface space-y-5 p-6 lg:p-8">
        <HeaderPulse />
        <Pulse className="h-12 w-full rounded-2xl" />
        <Pulse className="h-12 w-40 rounded-full" />
      </div>
      <div className="rounded-[1.6rem] bg-foreground p-6">
        <Pulse tone="ink" className="h-3 w-24" />
        <Pulse tone="ink" className="mt-4 h-8 w-48" />
        <Pulse tone="ink" className="mt-4 h-4 w-full" />
      </div>
    </div>
  );
}

export function BillingBodySkeleton() {
  return (
    <>
      <ScreenStatus label="Loading plan" />
      <Pulse className="h-4 w-64" />
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="surface p-7">
            <Pulse className="h-3 w-28" />
            <Pulse className="mt-4 h-6 w-32" />
            <Pulse className="mt-4 h-12 w-24" />
            <Pulse className="mt-3 h-4 w-full" />
            <Pulse className="mt-6 h-4 w-36" />
          </div>
        ))}
      </div>
    </>
  );
}

export function GroupBodySkeleton() {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ScreenStatus label="Loading group" />
      {Array.from({ length: 2 }).map((_, index) => (
        <div key={index} className="surface space-y-5 p-6">
          <Pulse className="h-7 w-48" />
          <Pulse className="h-4 w-40" />
          <div className="rounded-2xl bg-[#f7f3ea] p-4">
            <Pulse className="h-3 w-24" />
            <Pulse className="mt-3 h-4 w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((__, stat) => (
              <div key={stat} className="rounded-2xl bg-[#f7f3ea] px-3 py-3">
                <Pulse className="h-3 w-16" />
                <Pulse className="mt-2 h-8 w-10" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AuthSkeleton() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <ScreenStatus label="Loading sign in" />
      <div className="flex min-h-svh flex-col px-6 py-6 sm:px-10">
        <Pulse className="h-8 w-28" />
        <div className="flex flex-1 items-center py-10">
          <div className="mx-auto w-full max-w-[22.5rem] space-y-4">
            <Pulse className="h-12 w-48" />
            <Pulse className="h-4 w-full" />
            <Pulse className="mt-6 h-12 w-full rounded-full" />
            <Pulse className="h-12 w-full rounded-2xl" />
            <Pulse className="h-12 w-full rounded-full" />
          </div>
        </div>
      </div>
      <aside className="hidden bg-foreground lg:block" />
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <PageWrap>
      <HeaderPulse />
      <HomeBodySkeleton />
    </PageWrap>
  );
}

export function EventsSkeleton() {
  return (
    <PageWrap>
      <HeaderPulse />
      <EventCardsSkeleton />
    </PageWrap>
  );
}

export function PeopleSkeleton() {
  return (
    <PageWrap>
      <HeaderPulse />
      <PeopleListSkeleton />
    </PageWrap>
  );
}

export function TasksSkeleton() {
  return (
    <PageWrap>
      <HeaderPulse />
      <TaskListSkeleton />
    </PageWrap>
  );
}

export function CaptureSkeleton() {
  return (
    <PageWrap>
      <HeaderPulse />
      <CaptureBodySkeleton />
    </PageWrap>
  );
}

export function BillingSkeleton() {
  return (
    <PageWrap>
      <HeaderPulse />
      <BillingBodySkeleton />
    </PageWrap>
  );
}

export function GroupSkeleton() {
  return (
    <PageWrap>
      <HeaderPulse />
      <GroupBodySkeleton />
    </PageWrap>
  );
}

export function JoinSkeleton() {
  return (
    <PageWrap>
      <JoinBodySkeleton />
    </PageWrap>
  );
}

export function AppPageSkeleton() {
  return <HomeSkeleton />;
}
