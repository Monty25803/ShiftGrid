import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/api";
import { canManageSchedule, requireOrgId } from "@/lib/rbac";
import { hoursBetween } from "@/lib/labor-rules";

export async function GET(request: Request) {
  const result = await requireSessionUser();
  if ("error" in result) return result.error;
  const { user } = result;
  const orgId = requireOrgId(user);

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const range =
    from || to
      ? {
          start: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {};

  const shifts = await prisma.shift.findMany({
    where: {
      organizationId: orgId,
      ...(canManageSchedule(user) ? {} : { assigneeId: user.id }),
      ...range,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      attendance: true,
    },
    orderBy: { start: "asc" },
  });

  const rows = shifts.map((s) => {
    const att = s.attendance[0];
    const scheduledHours = hoursBetween(s.start, s.end);
    const actualHours =
      att?.clockIn && att?.clockOut ? hoursBetween(att.clockIn, att.clockOut) : null;
    return {
      shiftId: s.id,
      start: s.start,
      end: s.end,
      assignee: s.assignee,
      roleRequirement: s.roleRequirement,
      scheduledHours,
      clockIn: att?.clockIn ?? null,
      clockOut: att?.clockOut ?? null,
      actualHours,
      variance:
        actualHours == null ? null : Number((actualHours - scheduledHours).toFixed(2)),
    };
  });

  return NextResponse.json({ rows });
}
