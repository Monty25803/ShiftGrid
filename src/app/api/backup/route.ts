import { NextResponse } from "next/server";
import { Role, type Prisma } from "@prisma/client";
import { z } from "zod";
import { jsonError, requireSessionUser } from "@/lib/api";
import {
  getDefaultDataRoot,
  readBackupConfig,
  runBackup,
  writeBackupConfig,
} from "@/lib/backup";
import { writeAudit } from "@/lib/audit";
import { requireOrgId } from "@/lib/rbac";

export async function GET() {
  const result = await requireSessionUser();
  if ("error" in result) return result.error;
  const { user } = result;
  if (user.role !== Role.ADMIN) return jsonError("Only admins manage backups", 403);

  return NextResponse.json({
    dataRoot: getDefaultDataRoot(),
    config: readBackupConfig(),
    mode: process.env.SHIFTGRID_DESKTOP === "1" ? "desktop" : "web",
  });
}

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  localBackupDir: z.string().min(1).optional(),
  cloudSyncDir: z.string().optional(),
  nightlyTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
});

export async function PATCH(request: Request) {
  const result = await requireSessionUser();
  if ("error" in result) return result.error;
  const { user } = result;
  if (user.role !== Role.ADMIN) return jsonError("Only admins manage backups", 403);

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) return jsonError(parsed.error.message);

  const config = writeBackupConfig(parsed.data);
  const orgId = requireOrgId(user);
  await writeAudit({
    organizationId: orgId,
    actorId: user.id,
    action: "backup.config_updated",
    entityType: "Backup",
    meta: parsed.data as Prisma.InputJsonValue,
  });

  return NextResponse.json({ config });
}

export async function POST() {
  const result = await requireSessionUser();
  if ("error" in result) return result.error;
  const { user } = result;
  if (user.role !== Role.ADMIN) return jsonError("Only admins can run backups", 403);

  try {
    const outcome = await runBackup();
    const orgId = requireOrgId(user);
    await writeAudit({
      organizationId: orgId,
      actorId: user.id,
      action: "backup.completed",
      entityType: "Backup",
      meta: outcome as Prisma.InputJsonValue,
    });
    return NextResponse.json({ ok: true, ...outcome });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backup failed";
    writeBackupConfig({ lastBackupError: message });
    return jsonError(message, 500);
  }
}
