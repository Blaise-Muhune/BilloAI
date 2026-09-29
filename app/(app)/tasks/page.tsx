"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { TaskListSkeleton } from "@/components/loading";
import { Avatar, Empty, ErrorNote, PageHeader, PageWrap } from "@/components/ui";
import { cardFaceSrc } from "@/lib/profile-links";
import { dueBucket, type DueBucket } from "@/lib/dates";
import { CHANNEL_LABELS } from "@/lib/channels";
import { listTasks, updateTask } from "@/lib/data";
import { userMessage } from "@/lib/errors";
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
  const [ready, setReady] = useState(false);

  function load() {
    if (!user) return;
    setError("");
    listTasks(user.uid)
      .then(setTasks)
      .catch((err: unknown) => setError(userMessage(err, "Could not load tasks.")))
      .finally(() => setReady(true));
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
    <PageWrap>
      <PageHeader kicker="Tasks" title="Stay in touch" body="Open conversations with people who fit why you went. You send the message." />
      {error ? <ErrorNote retry={load}>{error}</ErrorNote> : null}
      {!ready ? (
        <TaskListSkeleton />
      ) : open.length === 0 ? (
        <Empty title="No open conversations" body="When someone is worth staying connected to, the next step lands here." href="/capture" action="Add someone you met" />
      ) : (
        groups.map((group) => {
          const items = open.filter((task) => dueBucket(task.dueDate) === group.id);
          if (!items.length) return null;
          return (
            <section key={group.id} className="space-y-3">
              <h2 className="kicker">{group.label}</h2>
              <div className="surface list-stack">
                {items.map((task) => (
                  <article key={task.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <Link href={`/people/${task.contactId}`} className="flex min-w-0 items-center gap-3">
                      <Avatar name={task.contactName} photoSrc={cardFaceSrc(task.cardUid)} />
                      <span className="min-w-0">
                        <p className="font-semibold">{task.title}</p>
                        <p className="text-sm text-muted">
                          {task.contactName} · {CHANNEL_LABELS[task.channel]}
                        </p>
                      </span>
                    </Link>
                    <button type="button" onClick={() => void markDone(task)} className="self-start text-sm font-semibold text-accent sm:self-center">
                      Mark done
                    </button>
                  </article>
                ))}
              </div>
            </section>
          );
        })
      )}
    </PageWrap>
  );
}
