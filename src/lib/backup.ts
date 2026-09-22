import fs from "fs";
import path from "path";
import os from "os";
import { prisma } from "@/lib/prisma";

/** Offline-first data lives under AppData on Windows desktop installs. */
export function getDefaultDataRoot() {
  if (process.env.SHIFTGRID_DATA_DIR) return process.env.SHIFTGRID_DATA_DIR;
  if (process.platform === "win32") {
    return path.join(
      process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"),
      "ShiftGrid",
    );
  }
  return path.join(os.homedir(), ".shiftgrid");
}

export function getBackupConfigPath(dataRoot = getDefaultDataRoot()) {
  return path.join(dataRoot, "backup-config.json");
}

export type BackupConfig = {
  enabled: boolean;
  localBackupDir: string;
  /** OneDrive / Google Drive / Dropbox sync folder — uploads when online. */
  cloudSyncDir: string;
  nightlyTime: string;
  lastBackupAt: string | null;
  lastBackupError: string | null;
};

export function defaultBackupConfig(dataRoot = getDefaultDataRoot()): BackupConfig {
  return {
    enabled: true,
    localBackupDir: path.join(dataRoot, "backups"),
    cloudSyncDir: "",
    nightlyTime: "22:00",
    lastBackupAt: null,
    lastBackupError: null,
  };
}

export function readBackupConfig(dataRoot = getDefaultDataRoot()): BackupConfig {
  const file = getBackupConfigPath(dataRoot);
  const base = defaultBackupConfig(dataRoot);
  if (!fs.existsSync(file)) return base;
  try {
    return { ...base, ...JSON.parse(fs.readFileSync(file, "utf8")) };
  } catch {
    return base;
  }
}

export function writeBackupConfig(
  patch: Partial<BackupConfig>,
  dataRoot = getDefaultDataRoot(),
): BackupConfig {
  fs.mkdirSync(dataRoot, { recursive: true });
  const next = { ...readBackupConfig(dataRoot), ...patch };
  fs.writeFileSync(getBackupConfigPath(dataRoot), JSON.stringify(next, null, 2));
  return next;
}

export async function exportSnapshot() {
  const [organizations, users, shifts, swapRequests, attendance, notifications, auditLogs] =
    await Promise.all([
      prisma.organization.findMany(),
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          hourlyRate: true,
          contact: true,
          active: true,
          mustChangePassword: true,
          organizationId: true,
          passwordHash: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.shift.findMany(),
      prisma.swapRequest.findMany(),
      prisma.attendance.findMany(),
      prisma.notification.findMany(),
      prisma.auditLog.findMany(),
    ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    app: "shiftgrid",
    organizations,
    users,
    shifts,
    swapRequests,
    attendance,
    notifications,
    auditLogs,
  };
}

export async function runBackup(dataRoot = getDefaultDataRoot()) {
  const config = readBackupConfig(dataRoot);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `shiftgrid-backup-${stamp}.json`;

  fs.mkdirSync(config.localBackupDir, { recursive: true });
  const snapshot = await exportSnapshot();
  const localPath = path.join(config.localBackupDir, fileName);
  fs.writeFileSync(localPath, JSON.stringify(snapshot, null, 2));

  let cloudPath: string | null = null;
  if (config.cloudSyncDir?.trim()) {
    fs.mkdirSync(config.cloudSyncDir, { recursive: true });
    cloudPath = path.join(config.cloudSyncDir, fileName);
    fs.copyFileSync(localPath, cloudPath);
  }

  writeBackupConfig(
    {
      lastBackupAt: new Date().toISOString(),
      lastBackupError: null,
    },
    dataRoot,
  );

  return { localPath, cloudPath, fileName, bytes: fs.statSync(localPath).size };
}

/** True when local clock matches configured nightly HH:mm (within the same minute). */
export function isNightlyBackupDue(config: BackupConfig, now = new Date()) {
  if (!config.enabled) return false;
  const [hh, mm] = config.nightlyTime.split(":").map((n) => Number(n));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return false;
  if (now.getHours() !== hh || now.getMinutes() !== mm) return false;
  if (!config.lastBackupAt) return true;
  const last = new Date(config.lastBackupAt);
  return last.toDateString() !== now.toDateString();
}
