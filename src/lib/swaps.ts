import { startOfWeek, endOfWeek } from "date-fns";
import { prisma } from "@/lib/prisma";
import { evaluateSwapEligibility } from "@/lib/labor-rules";

export async function evaluateTargetForSwap(
  targetUserId: string,
  shiftId: string,
  orgId: string,
) {
  const [org, shift, targetShifts] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: orgId } }),
    prisma.shift.findUniqueOrThrow({ where: { id: shiftId } }),
    prisma.shift.findMany({
      where: {
        organizationId: orgId,
        assigneeId: targetUserId,
        start: { gte: startOfWeek(new Date(), { weekStartsOn: 1 }) },
        end: { lte: endOfWeek(new Date(), { weekStartsOn: 1 }) },
      },
    }),
  ]);

  return evaluateSwapEligibility({
    targetUserShifts: targetShifts
      .filter((s) => s.id !== shiftId)
      .map((s) => ({ start: s.start, end: s.end })),
    offeredShift: { start: shift.start, end: shift.end },
    overtimeHoursPerWeek: org.overtimeHoursPerWeek,
    maxHoursPerDay: org.maxHoursPerDay,
    minBreakMinutes: org.minBreakMinutes,
  });
}
