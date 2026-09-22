import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSessionUser } from "@/lib/api";
import { requireOrgId } from "@/lib/rbac";

export async function GET() {
  const result = await requireSessionUser();
  if ("error" in result) return result.error;
  const { user } = result;
  if (user.role !== Role.ADMIN && user.role !== Role.MANAGER) {
    return jsonError("Forbidden", 403);
  }
  const orgId = requireOrgId(user);

  const logs = await prisma.auditLog.findMany({
    where: { organizationId: orgId },
    include: { actor: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(logs);
}
