export const CAPTURE_QUEUE_EVENT = "billo-capture-queue";
export const CAPTURE_WORK_EVENT = "billo-capture-work";

export function announceCaptureQueue() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CAPTURE_QUEUE_EVENT));
}

export function announceCaptureWork() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CAPTURE_WORK_EVENT));
}
