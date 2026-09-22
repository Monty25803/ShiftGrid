"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { useToast } from "@/components/toast";
import { BackupSettings } from "@/components/backup-settings";

type Org = {
  id: string;
  name: string;
  timezone: string;
  overtimeHoursPerWeek: number;
  maxHoursPerDay: number;
  minBreakMinutes: number;
  minStaffPerDay: number;
  requireLocationClockIn: boolean;
};

const COMMON_TIMEZONES = [
  "UTC",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "Europe/London",
  "Europe/Paris",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Australia/Sydney",
];

export function SettingsForm() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const queryClient = useQueryClient();
  const { push } = useToast();

  const { data: org } = useQuery({
    queryKey: ["organization"],
    queryFn: async () => {
      const res = await fetch("/api/organization");
      if (!res.ok) throw new Error("Failed to load organization");
      return res.json() as Promise<Org>;
    },
  });

  const [draft, setDraft] = useState<Partial<Org> | null>(null);
  const form = {
    name: draft?.name ?? org?.name ?? "",
    timezone: draft?.timezone ?? org?.timezone ?? "UTC",
    overtimeHoursPerWeek: draft?.overtimeHoursPerWeek ?? org?.overtimeHoursPerWeek ?? 40,
    maxHoursPerDay: draft?.maxHoursPerDay ?? org?.maxHoursPerDay ?? 12,
    minBreakMinutes: draft?.minBreakMinutes ?? org?.minBreakMinutes ?? 0,
    minStaffPerDay: draft?.minStaffPerDay ?? org?.minStaffPerDay ?? 1,
    requireLocationClockIn:
      draft?.requireLocationClockIn ?? org?.requireLocationClockIn ?? false,
  };

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Save failed");
      }
      return res.json();
    },
    onSuccess: () => {
      setDraft(null);
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      push("Settings saved", "ok");
    },
    onError: (e: Error) => push(e.message, "error"),
  });

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
            Settings
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Organization labor rules can only be changed by an <strong>Admin</strong>.
          </p>
        </div>
        {org ? (
          <div className="max-w-lg space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm">
            <p>
              <span className="text-[var(--muted)]">Organization:</span> {org.name}
            </p>
            <p>
              <span className="text-[var(--muted)]">Timezone:</span> {org.timezone}
            </p>
            <p>
              <span className="text-[var(--muted)]">OT / max day / break / min staff:</span>{" "}
              {org.overtimeHoursPerWeek}h · {org.maxHoursPerDay}h · {org.minBreakMinutes}m ·{" "}
              {org.minStaffPerDay}
            </p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
          Organization settings
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Admin-only labor configurator: timezone, OT, daily caps, breaks, coverage.
        </p>
      </div>

      <div className="max-w-lg space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <label className="block text-sm">
          Organization name
          <input
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
            value={form.name}
            onChange={(e) => setDraft({ ...form, name: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          Timezone
          <select
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
            value={form.timezone}
            onChange={(e) => setDraft({ ...form, timezone: e.target.value })}
          >
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            OT hours / week
            <input
              type="number"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
              value={form.overtimeHoursPerWeek}
              onChange={(e) =>
                setDraft({ ...form, overtimeHoursPerWeek: Number(e.target.value) })
              }
            />
          </label>
          <label className="block text-sm">
            Max hours / day
            <input
              type="number"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
              value={form.maxHoursPerDay}
              onChange={(e) => setDraft({ ...form, maxHoursPerDay: Number(e.target.value) })}
            />
          </label>
          <label className="block text-sm">
            Min break (minutes)
            <input
              type="number"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
              value={form.minBreakMinutes}
              onChange={(e) => setDraft({ ...form, minBreakMinutes: Number(e.target.value) })}
            />
          </label>
          <label className="block text-sm">
            Min staff / day
            <input
              type="number"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
              value={form.minStaffPerDay}
              onChange={(e) => setDraft({ ...form, minStaffPerDay: Number(e.target.value) })}
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.requireLocationClockIn}
            onChange={(e) =>
              setDraft({ ...form, requireLocationClockIn: e.target.checked })
            }
          />
          Require location verification for clock-in
        </label>
        <button
          type="button"
          disabled={save.isPending || !org}
          className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm text-white"
          onClick={() => save.mutate()}
        >
          Save settings
        </button>
      </div>

      <BackupSettings />
    </div>
  );
}
