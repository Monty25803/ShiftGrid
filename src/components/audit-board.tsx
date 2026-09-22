"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

type Log = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  actor: { name: string | null; email: string } | null;
  meta: Record<string, unknown> | null;
};

export function AuditBoard() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["audit"],
    queryFn: async () => {
      const res = await fetch("/api/audit");
      if (!res.ok) throw new Error("Forbidden or failed");
      return res.json() as Promise<Log[]>;
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Audit log</h1>
        <p className="text-sm text-[var(--muted)]">Recent organization actions (last 100).</p>
      </div>
      {isLoading ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : (
        <ul className="space-y-2">
          {data.map((log) => (
            <li
              key={log.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm"
            >
              <div className="font-medium">{log.action}</div>
              <div className="text-[var(--muted)]">
                {log.actor?.name ?? log.actor?.email ?? "System"} · {log.entityType}
                {log.entityId ? ` · ${log.entityId.slice(0, 8)}…` : ""} ·{" "}
                {format(new Date(log.createdAt), "MMM d HH:mm")}
              </div>
            </li>
          ))}
          {!data.length ? <p className="text-sm text-[var(--muted)]">No events yet.</p> : null}
        </ul>
      )}
    </div>
  );
}
