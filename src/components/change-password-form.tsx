"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/toast";

export function ChangePasswordForm({ forced = false }: { forced?: boolean }) {
  const router = useRouter();
  const { update } = useSession();
  const { push } = useToast();
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setPending(true);
    setError(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        newPassword,
        ...(forced ? {} : { currentPassword }),
      }),
    });
    const body = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(body.error ?? "Failed");
      return;
    }
    await update({ mustChangePassword: false });
    push("Password updated", "ok");
    router.push("/schedule");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-md space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">
          {forced ? "Set a new password" : "Change password"}
        </h1>
        <p className="text-sm text-[var(--muted)]">
          {forced
            ? "Your admin gave you a temporary password. Choose a new one to continue."
            : "Update your login password."}
        </p>
      </div>
      {!forced ? (
        <label className="block text-sm">
          Current password
          <input
            type="password"
            required
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
            value={currentPassword}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </label>
      ) : null}
      <label className="block text-sm">
        New password
        <input
          type="password"
          required
          minLength={8}
          className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
          value={newPassword}
          onChange={(e) => setNew(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        Confirm
        <input
          type="password"
          required
          minLength={8}
          className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm text-white"
      >
        {pending ? "Saving…" : "Save password"}
      </button>
    </form>
  );
}
