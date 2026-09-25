"use client";

import { Suspense } from "react";
import { CaptureWizard } from "@/components/capture-wizard";

export default function CapturePage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <CaptureWizard />
    </Suspense>
  );
}
