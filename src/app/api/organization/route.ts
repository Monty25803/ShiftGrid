import { NextResponse } from "next/server";
import { Role, type Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSessionUser } from "@/lib/api";
import { requireOrgId } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";

const updateSchema = z.object({
  overtimeHoursPerWeek: z.number().positive().max(168).optional(),
  maxHoursPerDay: z.number().positive().max(24).optional(),
  minBreakMinutes: z.number().int().min(0).max(720).optional(),
  minStaffPerDay: z.number().int().min(0).max(100).optional(),
  requireLocationClockIn: z.boolean().optional(),
  timezone: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
});

export async function GET() {
  const result = await requireSessionUser();
  if ("error" in result) return result.error;
  const { user } = result;
  const orgId = requireOrgId(user);

  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
  return NextResponse.json(org);
}

export async function PATCH(request: Request) {
  const result = await requireSessionUser();
  if ("error" in result) return result.error;
  const { user } = result;
  if (user.role !== Role.ADMIN) {
    return jsonError("Only admins can change organization settings", 403);
  }
  const orgId = requireOrgId(user);

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return jsonError(parsed.error.message);

  const org = await prisma.organization.update({
    where: { id: orgId },
    data: parsed.data,
  });

  await writeAudit({
    organizationId: orgId,
    actorId: user.id,
    action: "organization.updated",
    entityType: "Organization",
    entityId: orgId,
    meta: parsed.data as Prisma.InputJsonValue,
  });

  return NextResponse.json(org);
}
