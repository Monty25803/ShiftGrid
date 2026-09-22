"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { useToast } from "@/components/toast";
import { ChangePasswordForm } from "@/components/change-password-form";

export function ProfileForm() {
  const { push } = useToast();
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/profile");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{
        name: string | null;
        email: string;
        contact: string | null;
        role: string;
      }>;
    },
  });

  const [draft, setDraft] = useState<{ name?: string; contact?: string } | null>(null);
  const name = draft?.name ?? data?.name ?? "";
  const contact = draft?.contact ?? data?.contact ?? "";

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contact: contact || null }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Save failed");
      return body;
    },
    onSuccess: () => {
      setDraft(null);
      push("Profile saved", "ok");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => push(e.message, "error"),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">My profile</h1>
        <p className="text-sm text-[var(--muted)]">Update your contact details and password.</p>
      </div>
      <form
        onSubmit={onSubmit}
        className="max-w-md space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"
      >
        <p className="text-sm text-[var(--muted)]">
          {data?.email} · {data?.role}
        </p>
        <label className="block text-sm">
          Name
          <input
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
            value={name}
            onChange={(e) => setDraft({ name: e.target.value, contact })}
          />
        </label>
        <label className="block text-sm">
          Contact
          <input
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
            value={contact}
            onChange={(e) => setDraft({ name, contact: e.target.value })}
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm text-white"
        >
          Save profile
        </button>
      </form>
      <ChangePasswordForm />
    </div>
  );
}
