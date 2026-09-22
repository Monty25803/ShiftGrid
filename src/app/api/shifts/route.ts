import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSessionUser } from "@/lib/api";
import { canManageSchedule, requireOrgId } from "@/lib/rbac";
import { notifyUser } from "@/lib/notifications";

const shiftSchema = z.object({
  start: z.string().min(1),
  end: z.string().min(1),
  roleRequirement: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  const result = await requireSessionUser();
  if ("error" in result) return result.error;
  const { user } = result;
  const orgId = requireOrgId(user);

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const shifts = await prisma.shift.findMany({
    where: {
      organizationId: orgId,
      ...(canManageSchedule(user) ? {} : { assigneeId: user.id }),
      ...(from || to
        ? {
            start: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    include: {
      assignee: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { start: "asc" },
  });

  return NextResponse.json(shifts);
}

export async function POST(request: Request) {
  const result = await requireSessionUser();
  if ("error" in result) return result.error;
  const { user } = result;
  if (!canManageSchedule(user)) return jsonError("Forbidden", 403);
  const orgId = requireOrgId(user);

  const body = await request.json();
  const parsed = shiftSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.message);

  const start = new Date(parsed.data.start);
  const end = new Date(parsed.data.end);
  if (!(end > start)) return jsonError("End must be after start");

  if (parsed.data.assigneeId) {
    const assignee = await prisma.user.findFirst({
      where: { id: parsed.data.assigneeId, organizationId: orgId },
    });
    if (!assignee) return jsonError("Assignee not in organization", 400);
  }

  const shift = await prisma.shift.create({
    data: {
      start,
      end,
      roleRequirement: parsed.data.roleRequirement ?? null,
      location: parsed.data.location ?? null,
      notes: parsed.data.notes ?? null,
      assigneeId: parsed.data.assigneeId ?? null,
      organizationId: orgId,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  if (shift.assigneeId) {
    await notifyUser({
      userId: shift.assigneeId,
      organizationId: orgId,
      title: "New shift assigned",
      body: `You have a new shift starting ${shift.start.toLocaleString()}.`,
      href: "/schedule",
    });
  }

  return NextResponse.json(shift, { status: 201 });
}
