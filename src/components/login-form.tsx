"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("admin@demo.local");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    fetch("/api/setup")
      .then((r) => r.json())
      .then((d: { needsSetup: boolean }) => setNeedsSetup(d.needsSetup))
      .catch(() => undefined);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setPending(false);
    if (res?.error) {
      setError(
        res.error === "CredentialsSignin"
          ? "Invalid email or password (or account locked after too many attempts)"
          : res.error,
      );
      return;
    }
    router.push(params.get("callbackUrl") ?? "/schedule");
    router.refresh();
  }

  if (needsSetup) {
    return (
      <div className="space-y-3 text-sm">
        <p>No organization found. Run first-time setup to create your admin account.</p>
        <Link
          href="/setup"
          className="inline-flex rounded-md bg-[var(--accent)] px-4 py-2 text-white"
        >
          Start setup
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm">
        Email
        <input
          type="email"
          required
          className="mt-1 w-full rounded-md border border-[var(--border)] bg-white/70 px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        Password
        <input
          type="password"
          required
          className="mt-1 w-full rounded-md border border-[var(--border)] bg-white/70 px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-[var(--accent)] px-3 py-2.5 text-sm font-medium text-white"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-xs text-[var(--muted)]">
        Demo: admin@demo.local / manager@demo.local / staff@demo.local — password123
      </p>
    </form>
  );
}
