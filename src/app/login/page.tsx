import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/95 p-8 shadow-sm">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="ShiftGrid"
            width={48}
            height={48}
            className="h-12 w-12 rounded-[22%] shadow-sm"
          />
          <p className="font-[family-name:var(--font-display)] text-4xl text-[var(--ink)]">
            ShiftGrid
          </p>
        </div>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Self-hostable schedules, swaps, and attendance for small teams.
        </p>
        <p className="mt-2 rounded-md bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--muted)]">
          <strong className="text-[var(--ink)]">Run preference:</strong> browser (this page) for
          LAN/server · Windows desktop app for offline daytime — see Getting Started in the repo
          docs.
        </p>
        <div className="mt-6">
          <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading…</p>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
