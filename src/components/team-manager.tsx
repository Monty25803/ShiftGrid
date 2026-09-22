"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { FormEvent, useMemo, useState } from "react";

type TeamUser = {
  id: string;
  name: string | null;
  email: string;
  role: "ADMIN" | "MANAGER" | "STAFF";
  hourlyRate: number | null;
  contact: string | null;
  active: boolean;
  createdAt: string;
};

const emptyForm = {
  name: "",
  email: "",
  password: "",
  role: "STAFF" as TeamUser["role"],
  hourlyRate: "",
  contact: "",
};

export function TeamManager() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const canManage = role === "ADMIN" || role === "MANAGER";
  const isAdmin = role === "ADMIN";
  const queryClient = useQueryClient();

  const roleOptions = useMemo(() => {
    if (isAdmin) return ["ADMIN", "MANAGER", "STAFF"] as const;
    return ["STAFF"] as const;
  }, [isAdmin]);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to load team");
      return res.json() as Promise<TeamUser[]>;
    },
    enabled: !!canManage,
  });

  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<TeamUser | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "STAFF" as TeamUser["role"],
    hourlyRate: "",
    contact: "",
    password: "",
    active: true,
  });
  const [error, setError] = useState<string | null>(null);

  const createUser = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          hourlyRate: form.hourlyRate === "" ? null : Number(form.hourlyRate),
          contact: form.contact || null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Create failed");
      return body as TeamUser;
    },
    onSuccess: () => {
      setForm(emptyForm);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const updateUser = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const res = await fetch(`/api/users/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          email: editForm.email,
          role: editForm.role,
          hourlyRate: editForm.hourlyRate === "" ? null : Number(editForm.hourlyRate),
          contact: editForm.contact || null,
          active: editForm.active,
          ...(editForm.password ? { password: editForm.password } : {}),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Update failed");
      return body as TeamUser;
    },
    onSuccess: () => {
      setEditing(null);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  function openEdit(user: TeamUser) {
    setEditing(user);
    setEditForm({
      name: user.name ?? "",
      email: user.email,
      role: user.role,
      hourlyRate: user.hourlyRate?.toString() ?? "",
      contact: user.contact ?? "",
      password: "",
      active: user.active,
    });
    setError(null);
  }

  function onCreate(e: FormEvent) {
    e.preventDefault();
    createUser.mutate();
  }

  if (!canManage) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Team</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Only admins and managers can create or modify staff accounts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
          Team
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Create login IDs and manage staff.{" "}
          {isAdmin
            ? "Admins can create Admin, Manager, and Staff."
            : "Managers can create and edit Staff only."}
        </p>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={onCreate}
        className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 md:grid-cols-2"
      >
        <h2 className="md:col-span-2 font-[family-name:var(--font-display)] text-xl">
          Create account
        </h2>
        <label className="block text-sm">
          Name
          <input
            required
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          Email (login ID)
          <input
            required
            type="email"
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          Temporary password
          <input
            required
            type="password"
            minLength={8}
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          Role
          <select
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
            value={form.role}
            onChange={(e) =>
              setForm({ ...form, role: e.target.value as TeamUser["role"] })
            }
          >
            {roleOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Hourly rate
          <input
            type="number"
            min={0}
            step="0.01"
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
            value={form.hourlyRate}
            onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          Contact
          <input
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
            value={form.contact}
            onChange={(e) => setForm({ ...form, contact: e.target.value })}
          />
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={createUser.isPending}
            className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm text-white"
          >
            {createUser.isPending ? "Creating…" : "Create staff ID"}
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        <div className="border-b border-[var(--border)] px-4 py-3 font-medium">
          People ({users.length})
        </div>
        {isLoading ? (
          <p className="p-4 text-sm text-[var(--muted)]">Loading…</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {users.map((u) => {
              const canEdit =
                isAdmin || (role === "MANAGER" && u.role === "STAFF");
              return (
                <li
                  key={u.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <div className="font-medium text-[var(--ink)]">
                      {u.name ?? "Unnamed"}{" "}
                      {!u.active ? (
                        <span className="text-xs font-normal text-red-600">(inactive)</span>
                      ) : null}
                    </div>
                    <div className="text-sm text-[var(--muted)]">
                      {u.email} · {u.role}
                      {u.hourlyRate != null ? ` · $${u.hourlyRate}/hr` : ""}
                      {u.contact ? ` · ${u.contact}` : ""}
                    </div>
                  </div>
                  {canEdit ? (
                    <button
                      type="button"
                      className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
                      onClick={() => openEdit(u)}
                    >
                      Edit
                    </button>
                  ) : (
                    <span className="text-xs text-[var(--muted)]">View only</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {editing ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <form
            className="w-full max-w-md space-y-3 rounded-xl bg-[var(--surface)] p-5 shadow-xl"
            onSubmit={(e) => {
              e.preventDefault();
              updateUser.mutate();
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-[family-name:var(--font-display)] text-xl">
                Edit {editing.name}
              </h2>
              <button type="button" onClick={() => setEditing(null)}>
                Close
              </button>
            </div>
            <label className="block text-sm">
              Name
              <input
                required
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              Email
              <input
                required
                type="email"
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              Role
              <select
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
                value={editForm.role}
                onChange={(e) =>
                  setEditForm({ ...editForm, role: e.target.value as TeamUser["role"] })
                }
              >
                {(isAdmin ? (["ADMIN", "MANAGER", "STAFF"] as const) : (["STAFF"] as const)).map(
                  (r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label className="block text-sm">
              Hourly rate
              <input
                type="number"
                min={0}
                step="0.01"
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
                value={editForm.hourlyRate}
                onChange={(e) => setEditForm({ ...editForm, hourlyRate: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              Contact
              <input
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
                value={editForm.contact}
                onChange={(e) => setEditForm({ ...editForm, contact: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              Reset password (optional)
              <input
                type="password"
                minLength={8}
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                placeholder="Leave blank to keep current"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editForm.active}
                onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
              />
              Active (can sign in)
            </label>
            <button
              type="submit"
              disabled={updateUser.isPending}
              className="w-full rounded-md bg-[var(--accent)] px-3 py-2 text-sm text-white"
            >
              {updateUser.isPending ? "Saving…" : "Save changes"}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
