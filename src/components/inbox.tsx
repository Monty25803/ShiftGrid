"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import Link from "next/link";
import type { NotificationDto } from "@/lib/types";

export function Inbox() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Failed to load inbox");
      return res.json() as Promise<{ notifications: NotificationDto[]; unreadCount: number }>;
    },
  });

  const mark = useMutation({
    mutationFn: async (payload: { ids?: string[]; all?: boolean }) => {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
            Inbox
          </h1>
          <p className="text-sm text-[var(--muted)]">
            {data?.unreadCount ?? 0} unread schedule messages
          </p>
        </div>
        <button
          type="button"
          className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
          onClick={() => mark.mutate({ all: true })}
        >
          Mark all read
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : !data?.notifications.length ? (
        <p className="text-sm text-[var(--muted)]">Inbox is empty.</p>
      ) : (
        <ul className="space-y-2">
          {data.notifications.map((n) => (
            <li
              key={n.id}
              className={`rounded-xl border border-[var(--border)] p-4 ${
                n.read ? "bg-[var(--surface)]" : "bg-[var(--surface-2)]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-[var(--ink)]">{n.title}</div>
                  <p className="mt-1 text-sm text-[var(--muted)]">{n.body}</p>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    {format(new Date(n.createdAt), "MMM d · HH:mm")}
                  </p>
                </div>
                <div className="flex gap-2">
                  {n.href ? (
                    <Link href={n.href} className="text-sm text-[var(--accent)]">
                      Open
                    </Link>
                  ) : null}
                  {!n.read ? (
                    <button
                      type="button"
                      className="text-sm text-[var(--muted)]"
                      onClick={() => mark.mutate({ ids: [n.id] })}
                    >
                      Mark read
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
