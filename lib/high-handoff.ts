import type { ContactRecord, TaskRecord } from "@/lib/types";

export type HighHandoff = {
  id: string;
  name: string;
  title: string;
  company: string;
  linkedin: string;
  rawNote: string;
  draft: string;
};

export function highHandoffs(contacts: ContactRecord[], tasks: TaskRecord[], limit = 3): HighHandoff[] {
  return contacts
    .filter((contact) => contact.relevance?.level === "high")
    .slice(0, limit)
    .map((contact) => {
      const task = tasks.find((item) => item.contactId === contact.id && item.status === "open") ?? tasks.find((item) => item.contactId === contact.id);
      return {
        id: contact.id,
        name: contact.name || "Unnamed",
        title: contact.title,
        company: contact.company,
        linkedin: contact.linkedin,
        rawNote: contact.rawNote,
        draft: task?.draft ?? "",
      };
    });
}

export function highHandoffText(rows: HighHandoff[]) {
  return rows
    .map((row) =>
      [
        [row.name, [row.title, row.company].filter(Boolean).join(" · ")].filter(Boolean).join(" — "),
        row.linkedin,
        row.rawNote ? `Line: ${row.rawNote}` : "",
        row.draft ? `Draft:\n${row.draft}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n---\n\n");
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export function highHandoffCsv(rows: HighHandoff[]) {
  const header = ["Name", "Title", "Company", "LinkedIn", "Note", "Draft"].map(csvCell).join(",");
  const body = rows
    .map((row) => [row.name, row.title, row.company, row.linkedin, row.rawNote, row.draft].map(csvCell).join(","))
    .join("\n");
  return `${header}\n${body}\n`;
}

export function downloadText(filename: string, text: string, type = "text/plain") {
  const blob = new Blob([text], { type });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}
