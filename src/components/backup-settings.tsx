"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/components/toast";

type BackupPayload = {
  dataRoot: string;
  mode: string;
  config: {
    enabled: boolean;
    localBackupDir: string;
    cloudSyncDir: string;
    nightlyTime: string;
    lastBackupAt: string | null;
    lastBackupError: string | null;
  };
};

export function BackupSettings() {
  const { push } = useToast();
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["backup"],
    queryFn: async () => {
      const res = await fetch("/api/backup");
      if (!res.ok) throw new Error("Failed to load backup settings");
      return res.json() as Promise<BackupPayload>;
    },
  });

  const [draft, setDraft] = useState<Partial<BackupPayload["config"]> | null>(null);
  const form = {
    enabled: draft?.enabled ?? data?.config.enabled ?? true,
    localBackupDir: draft?.localBackupDir ?? data?.config.localBackupDir ?? "",
    cloudSyncDir: draft?.cloudSyncDir ?? data?.config.cloudSyncDir ?? "",
    nightlyTime: draft?.nightlyTime ?? data?.config.nightlyTime ?? "22:00",
  };

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/backup", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Save failed");
      return body;
    },
    onSuccess: () => {
      setDraft(null);
      queryClient.invalidateQueries({ queryKey: ["backup"] });
      push("Backup settings saved", "ok");
    },
    onError: (e: Error) => push(e.message, "error"),
  });

  const runNow = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/backup", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Backup failed");
      return body as { localPath: string; cloudPath: string | null; fileName: string };
    },
    onSuccess: (body) => {
      queryClient.invalidateQueries({ queryKey: ["backup"] });
      push(
        body.cloudPath
          ? `Backup saved + copied to cloud folder (${body.fileName})`
          : `Backup saved locally (${body.fileName})`,
        "ok",
      );
    },
    onError: (e: Error) => push(e.message, "error"),
  });

  if (!data) return null;

  return (
    <div className="max-w-lg space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-xl">Offline backup</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Work offline all day. At night, ShiftGrid writes a backup to your PC and optionally into a
          OneDrive / Google Drive / Dropbox folder so it syncs when you are online.
        </p>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Mode: <strong>{data.mode}</strong> · Data folder: <code>{data.dataRoot}</code>
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.enabled}
          onChange={(e) => setDraft({ ...form, enabled: e.target.checked })}
        />
        Enable nightly automatic backup
      </label>

      <label className="block text-sm">
        Nightly time (24h)
        <input
          type="time"
          className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
          value={form.nightlyTime}
          onChange={(e) => setDraft({ ...form, nightlyTime: e.target.value })}
        />
      </label>

      <label className="block text-sm">
        Local backup folder
        <input
          className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
          value={form.localBackupDir}
          onChange={(e) => setDraft({ ...form, localBackupDir: e.target.value })}
        />
      </label>

      <label className="block text-sm">
        Cloud sync folder (optional)
        <input
          className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
          placeholder="e.g. C:\Users\You\OneDrive\ShiftGridBackups"
          value={form.cloudSyncDir}
          onChange={(e) => setDraft({ ...form, cloudSyncDir: e.target.value })}
        />
        <span className="mt-1 block text-xs text-[var(--muted)]">
          Point this at a folder that syncs overnight. No internet needed while you schedule shifts.
        </span>
      </label>

      {data.config.lastBackupAt ? (
        <p className="text-xs text-[var(--muted)]">
          Last backup: {new Date(data.config.lastBackupAt).toLocaleString()}
        </p>
      ) : null}
      {data.config.lastBackupError ? (
        <p className="text-sm text-red-600">Last error: {data.config.lastBackupError}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm text-white"
          onClick={() => save.mutate()}
          disabled={save.isPending}
        >
          Save backup settings
        </button>
        <button
          type="button"
          className="rounded-md border border-[var(--border)] px-3 py-2 text-sm"
          onClick={() => runNow.mutate()}
          disabled={runNow.isPending}
        >
          Backup now
        </button>
      </div>
    </div>
  );
}
