import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSessionUser } from "@/lib/api";
import { requireOrgId } from "@/lib/rbac";
import { checkOvertimeLimit } from "@/lib/labor-rules";
import { startOfWeek, endOfWeek } from "date-fns";
import { notifyUser } from "@/lib/notifications";

const clockSchema = z.object({
  shiftId: z.string().min(1),
  action: z.enum(["in", "out"]),
  locationVerified: z.boolean().optional(),
});

export async function GET() {
  const result = await requireSessionUser();
  if ("error" in result) return result.error;
  const { user } = result;
  const orgId = requireOrgId(user);

  const records = await prisma.attendance.findMany({
    where: {
      user: { organizationId: orgId },
      ...(user.role === "STAFF" ? { userId: user.id } : {}),
    },
    include: {
      shift: true,
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(records);
}

export async function POST(request: Request) {
  const result = await requireSessionUser();
  if ("error" in result) return result.error;
  const { user } = result;
  const orgId = requireOrgId(user);

  const parsed = clockSchema.safeParse(await request.json());
  if (!parsed.success) return jsonError(parsed.error.message);

  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
  const shift = await prisma.shift.findFirst({
    where: { id: parsed.data.shiftId, organizationId: orgId },
  });
  if (!shift) return jsonError("Shift not found", 404);
  if (shift.assigneeId !== user.id) return jsonError("Not your shift", 403);

  if (org.requireLocationClockIn && !parsed.data.locationVerified) {
    return jsonError("Location verification required for clock-in/out");
  }

  const now = new Date();
  const existing = await prisma.attendance.findUnique({
    where: { userId_shiftId: { userId: user.id, shiftId: shift.id } },
  });

  if (parsed.data.action === "in") {
    if (existing?.clockIn) return jsonError("Already clocked in");
    const record = await prisma.attendance.upsert({
      where: { userId_shiftId: { userId: user.id, shiftId: shift.id } },
      create: {
        userId: user.id,
        shiftId: shift.id,
        clockIn: now,
        locationVerified: parsed.data.locationVerified ?? false,
      },
      update: {
        clockIn: now,
        locationVerified: parsed.data.locationVerified ?? false,
      },
    });
    return NextResponse.json(record, { status: 201 });
  }

  if (!existing?.clockIn) return jsonError("Clock in first");
  if (existing.clockOut) return jsonError("Already clocked out");

  const record = await prisma.attendance.update({
    where: { id: existing.id },
    data: {
      clockOut: now,
      locationVerified: parsed.data.locationVerified ?? existing.locationVerified,
    },
  });

  const weekShifts = await prisma.shift.findMany({
    where: {
      assigneeId: user.id,
      organizationId: orgId,
      start: { gte: startOfWeek(now, { weekStartsOn: 1 }) },
      end: { lte: endOfWeek(now, { weekStartsOn: 1 }) },
    },
  });
  const overtime = checkOvertimeLimit({
    existingShifts: weekShifts.map((s) => ({ start: s.start, end: s.end })),
    candidateShift: { start: shift.start, end: shift.end },
    overtimeHoursPerWeek: org.overtimeHoursPerWeek,
  });

  if (overtime.wouldExceed || overtime.projectedHours >= org.overtimeHoursPerWeek * 0.9) {
    const managers = await prisma.user.findMany({
      where: { organizationId: orgId, role: { in: ["ADMIN", "MANAGER"] } },
      select: { id: true },
    });
    await Promise.all(
      managers.map((m) =>
        notifyUser({
          userId: m.id,
          organizationId: orgId,
          title: "Overtime threshold alert",
          body: `${user.name ?? "Staff"} is at ${overtime.projectedHours.toFixed(1)}h this week (limit ${org.overtimeHoursPerWeek}h).`,
          href: "/schedule",
        }),
      ),
    );
  }

  return NextResponse.json({ record, overtime });
}
