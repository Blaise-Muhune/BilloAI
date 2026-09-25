export function todayISO(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return todayISO(date);
}

export type DueBucket = "today" | "tomorrow" | "week" | "later";

export function dueBucket(dueDate: string, now = new Date()): DueBucket {
  const today = todayISO(now);
  const tomorrow = addDays(today, 1);
  const weekEnd = addDays(today, 7);
  if (dueDate <= today) return "today";
  if (dueDate === tomorrow) return "tomorrow";
  if (dueDate <= weekEnd) return "week";
  return "later";
}

export function formatDay(iso: string) {
  if (!iso) return "";
  const date = new Date(`${iso}T12:00:00`);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
