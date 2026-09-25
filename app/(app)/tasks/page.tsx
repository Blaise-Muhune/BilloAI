"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Empty } from "@/components/ui";
import { dueBucket, type DueBucket } from "@/lib/dates";
import { listTasks, updateTask } from "@/lib/data";
import type { TaskRecord } from "@/lib/types";

const groups: Array<{ id: DueBucket; label: string }> = [
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "week", label: "Next week" },
  { id: "later", label: "Later" },
];

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [error, setError] = useState("");

  function load() {
    if (!user) return;
    setError("");
    listTasks(user.uid)
      .then(setTasks)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load tasks."));
  }

  useEffect(() => {
    load();
  }, [user]);

  const open = tasks.filter((task) => task.status === "open");

  async function markDone(task: TaskRecord) {
    if (!user) return;
    await updateTask(user.uid, task.id, { status: "done" });
    setTasks((current) => current.map((item) => (item.id === task.id ? { ...item, status: "done" } : item)));
  }

  return (
    <div className="space-y-6">
      <h1 className="serif text-4xl">Tasks</h1>
      {error ? (
        <p className="text-sm text-high">
          {error}{" "}
          <button type="button" className="font-semibold text-accent" onClick={load}>
            Retry
          </button>
        </p>
      ) : null}
      {open.length === 0 ? (
        <Empty title="Your queue is clear" body="After you capture someone, the follow-up lands here." href="/capture" action="Capture someone" />
      ) : (
        groups.map((group) => {
          const items = open.filter((task) => dueBucket(task.dueDate) === group.id);
          if (!items.length) return null;
          return (
            <section key={group.id} className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{group.label}</h2>
              {items.map((task) => (
                <article key={task.id} className="surface p-4">
                  <Link href={`/people/${task.contactId}`} className="block">
                    <p className="font-semibold">{task.title}</p>
                    <p className="text-sm text-muted">
                      {task.contactName} · {task.channel}
                    </p>
                  </Link>
                  <button type="button" onClick={() => void markDone(task)} className="mt-3 text-sm font-semibold text-accent">
                    Mark done
                  </button>
                </article>
              ))}
            </section>
          );
        })
      )}
    </div>
  );
}
