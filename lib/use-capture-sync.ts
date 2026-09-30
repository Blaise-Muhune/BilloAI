"use client";

import { useEffect } from "react";
import { drainCaptureWork } from "@/lib/capture-sync";

export function useCaptureSync(uid?: string) {
  useEffect(() => {
    if (!uid || typeof window === "undefined") return;
    const id = uid;
    function run() {
      void drainCaptureWork(id);
    }
    run();
    window.addEventListener("online", run);
    document.addEventListener("visibilitychange", run);
    return () => {
      window.removeEventListener("online", run);
      document.removeEventListener("visibilitychange", run);
    };
  }, [uid]);
}
