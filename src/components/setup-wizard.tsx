"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const TIMEZONES = [
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

export function SetupWizard() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({
    organizationName: "",
    timezone: "America/Los_Angeles",
    overtimeHoursPerWeek: 40,
    maxHoursPerDay: 12,
    minBreakMinutes: 30,
    minStaffPerDay: 2,
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });

  useEffect(() => {
    fetch("/api/setup")
      .then((r) => r.json())
      .then((data: { needsSetup: boolean }) => {
        if (!data.needsSetup) router.replace("/login");
        else setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const body = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(body.error ?? "Setup failed");
      return;
    }
    router.push("/login");
  }

  if (checking) {
    return <p className="text-sm text-[var(--muted)]">Checking install…</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h2 className="font-[family-name:var(--font-display)] text-xl">Organization</h2>
      <label className="block text-sm">
        Name
        <input
          required
          className="mt-1 w-full rounded-md border border-[var(--border)] bg-white/70 px-3 py-2"
          value={form.organizationName}
          onChange={(e) => setForm({ ...form, organizationName: e.target.value })}
        />
      </label>
      <label className="block text-sm">
        Timezone
        <select
          className="mt-1 w-full rounded-md border border-[var(--border)] bg-white/70 px-3 py-2"
          value={form.timezone}
          onChange={(e) => setForm({ ...form, timezone: e.target.value })}
        >
          {TIMEZONES.map((tz) => (
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
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-white/70 px-3 py-2"
            value={form.overtimeHoursPerWeek}
            onChange={(e) =>
              setForm({ ...form, overtimeHoursPerWeek: Number(e.target.value) })
            }
          />
        </label>
        <label className="block text-sm">
          Max hours / day
          <input
            type="number"
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-white/70 px-3 py-2"
            value={form.maxHoursPerDay}
            onChange={(e) => setForm({ ...form, maxHoursPerDay: Number(e.target.value) })}
          />
        </label>
        <label className="block text-sm">
          Min break (min)
          <input
            type="number"
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-white/70 px-3 py-2"
            value={form.minBreakMinutes}
            onChange={(e) => setForm({ ...form, minBreakMinutes: Number(e.target.value) })}
          />
        </label>
        <label className="block text-sm">
          Min staff / day
          <input
            type="number"
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-white/70 px-3 py-2"
            value={form.minStaffPerDay}
            onChange={(e) => setForm({ ...form, minStaffPerDay: Number(e.target.value) })}
          />
        </label>
      </div>

      <h2 className="pt-2 font-[family-name:var(--font-display)] text-xl">First admin</h2>
      <label className="block text-sm">
        Name
        <input
          required
          className="mt-1 w-full rounded-md border border-[var(--border)] bg-white/70 px-3 py-2"
          value={form.adminName}
          onChange={(e) => setForm({ ...form, adminName: e.target.value })}
        />
      </label>
      <label className="block text-sm">
        Email
        <input
          required
          type="email"
          className="mt-1 w-full rounded-md border border-[var(--border)] bg-white/70 px-3 py-2"
          value={form.adminEmail}
          onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
        />
      </label>
      <label className="block text-sm">
        Password
        <input
          required
          type="password"
          minLength={8}
          className="mt-1 w-full rounded-md border border-[var(--border)] bg-white/70 px-3 py-2"
          value={form.adminPassword}
          onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
        />
      </label>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-[var(--accent)] px-3 py-2.5 text-sm font-medium text-white"
      >
        {pending ? "Creating…" : "Create organization"}
      </button>
    </form>
  );
}

export function SetupPageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-10">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/95 p-8 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" width={48} height={48} className="rounded-[22%]" />
          <div>
            <p className="font-[family-name:var(--font-display)] text-3xl">ShiftGrid</p>
            <p className="text-sm text-[var(--muted)]">First-run setup</p>
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}
