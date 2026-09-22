"use client";

import { useQuery } from "@tanstack/react-query";
import { addWeeks, endOfWeek, format, startOfWeek } from "date-fns";
import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";

type Row = {
  shiftId: string;
  start: string;
  end: string;
  assignee: { id: string; name: string | null; email: string } | null;
  roleRequirement: string | null;
  scheduledHours: number;
  clockIn: string | null;
  clockOut: string | null;
  actualHours: number | null;
  variance: number | null;
};

export function TimesheetBoard() {
  const { data: session } = useSession();
  const [weekOffset, setWeekOffset] = useState(0);
  const from = useMemo(
    () => addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset),
    [weekOffset],
  );
  const to = useMemo(() => endOfWeek(from, { weekStartsOn: 1 }), [from]);

  const { data, isLoading } = useQuery({
    queryKey: ["timesheet", from.toISOString()],
    queryFn: async () => {
      const res = await fetch(
        `/api/timesheet?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
      );
      if (!res.ok) throw new Error("Failed to load timesheet");
      return res.json() as Promise<{ rows: Row[] }>;
    },
  });

  const totals = useMemo(() => {
    const rows = data?.rows ?? [];
    return {
      scheduled: rows.reduce((s, r) => s + r.scheduledHours, 0),
      actual: rows.reduce((s, r) => s + (r.actualHours ?? 0), 0),
    };
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">Timesheet</h1>
          <p className="text-sm text-[var(--muted)]">
            Scheduled vs actual hours · week of {format(from, "MMM d, yyyy")}
            {session?.user?.role === "STAFF" ? " · your shifts" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
            onClick={() => setWeekOffset((v) => v - 1)}
          >
            Previous
          </button>
          <button
            type="button"
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
            onClick={() => setWeekOffset(0)}
          >
            Today
          </button>
          <button
            type="button"
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
            onClick={() => setWeekOffset((v) => v + 1)}
          >
            Next
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <div className="rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm">
          Scheduled <strong>{totals.scheduled.toFixed(1)}h</strong>
        </div>
        <div className="rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm">
          Actual <strong>{totals.actual.toFixed(1)}h</strong>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] text-[var(--muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Person</th>
                <th className="px-3 py-2 font-medium">Scheduled</th>
                <th className="px-3 py-2 font-medium">Clock</th>
                <th className="px-3 py-2 font-medium">Actual</th>
                <th className="px-3 py-2 font-medium">Δ</th>
              </tr>
            </thead>
            <tbody>
              {(data?.rows ?? []).map((r) => (
                <tr key={r.shiftId} className="border-b border-[var(--border)]/70">
                  <td className="px-3 py-2">
                    {format(new Date(r.start), "EEE MMM d HH:mm")}–
                    {format(new Date(r.end), "HH:mm")}
                  </td>
                  <td className="px-3 py-2">{r.assignee?.name ?? r.assignee?.email ?? "—"}</td>
                  <td className="px-3 py-2">{r.scheduledHours.toFixed(1)}h</td>
                  <td className="px-3 py-2 text-[var(--muted)]">
                    {r.clockIn ? format(new Date(r.clockIn), "HH:mm") : "—"}–
                    {r.clockOut ? format(new Date(r.clockOut), "HH:mm") : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {r.actualHours != null ? `${r.actualHours.toFixed(1)}h` : "—"}
                  </td>
                  <td
                    className={`px-3 py-2 ${
                      r.variance != null && Math.abs(r.variance) > 0.25
                        ? "text-amber-700"
                        : ""
                    }`}
                  >
                    {r.variance != null ? `${r.variance > 0 ? "+" : ""}${r.variance}h` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.rows.length ? (
            <p className="p-4 text-sm text-[var(--muted)]">No shifts this week.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
