"use client";

import { Suspense } from "react";
import { CaptureSkeleton } from "@/components/loading";
import { CaptureWizard } from "@/components/capture-wizard";

export default function CapturePage() {
  return (
    <Suspense fallback={<CaptureSkeleton />}>
      <CaptureWizard />
    </Suspense>
  );
}
