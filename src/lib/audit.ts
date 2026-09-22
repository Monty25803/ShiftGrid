import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function writeAudit(input: {
  organizationId: string;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  meta?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorId: input.actorId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        meta: input.meta ?? undefined,
      },
    });
  } catch (error) {
    console.error("audit write failed", error);
  }
}
