import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSessionUser } from "@/lib/api";
import { canManageSchedule, requireOrgId } from "@/lib/rbac";
import { notifyUser } from "@/lib/notifications";

const updateSchema = z.object({
  start: z.string().min(1).optional(),
  end: z.string().min(1).optional(),
  roleRequirement: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const result = await requireSessionUser();
  if ("error" in result) return result.error;
  const { user } = result;
  if (!canManageSchedule(user)) return jsonError("Forbidden", 403);
  const orgId = requireOrgId(user);
  const { id } = await params;

  const existing = await prisma.shift.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!existing) return jsonError("Shift not found", 404);

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.message);

  const start = parsed.data.start ? new Date(parsed.data.start) : existing.start;
  const end = parsed.data.end ? new Date(parsed.data.end) : existing.end;
  if (!(end > start)) return jsonError("End must be after start");

  if (parsed.data.assigneeId) {
    const assignee = await prisma.user.findFirst({
      where: { id: parsed.data.assigneeId, organizationId: orgId },
    });
    if (!assignee) return jsonError("Assignee not in organization", 400);
  }

  const shift = await prisma.shift.update({
    where: { id },
    data: {
      start,
      end,
      roleRequirement:
        parsed.data.roleRequirement === undefined
          ? undefined
          : parsed.data.roleRequirement,
      location: parsed.data.location === undefined ? undefined : parsed.data.location,
      notes: parsed.data.notes === undefined ? undefined : parsed.data.notes,
      assigneeId: parsed.data.assigneeId === undefined ? undefined : parsed.data.assigneeId,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  const notifyIds = new Set<string>();
  if (existing.assigneeId) notifyIds.add(existing.assigneeId);
  if (shift.assigneeId) notifyIds.add(shift.assigneeId);
  await Promise.all(
    [...notifyIds].map((userId) =>
      notifyUser({
        userId,
        organizationId: orgId,
        title: "Schedule updated",
        body: `A shift was updated (${shift.start.toLocaleString()}).`,
        href: "/schedule",
      }),
    ),
  );

  return NextResponse.json(shift);
}

export async function DELETE(_request: Request, { params }: Params) {
  const result = await requireSessionUser();
  if ("error" in result) return result.error;
  const { user } = result;
  if (!canManageSchedule(user)) return jsonError("Forbidden", 403);
  const orgId = requireOrgId(user);
  const { id } = await params;

  const existing = await prisma.shift.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!existing) return jsonError("Shift not found", 404);

  await prisma.shift.delete({ where: { id } });

  if (existing.assigneeId) {
    await notifyUser({
      userId: existing.assigneeId,
      organizationId: orgId,
      title: "Shift removed",
      body: `Your shift on ${existing.start.toLocaleString()} was removed.`,
      href: "/schedule",
    });
  }

  return NextResponse.json({ ok: true });
}
