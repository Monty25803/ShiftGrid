import { NextResponse } from "next/server";
import { addDays } from "date-fns";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSessionUser } from "@/lib/api";
import { canManageSchedule, requireOrgId } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";

const schema = z.object({
  fromStart: z.string().min(1),
  toStart: z.string().min(1),
});

/** Copy all shifts from one week onto another week (same weekday offsets). */
export async function POST(request: Request) {
  const result = await requireSessionUser();
  if ("error" in result) return result.error;
  const { user } = result;
  if (!canManageSchedule(user)) return jsonError("Forbidden", 403);
  const orgId = requireOrgId(user);

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return jsonError(parsed.error.message);

  const fromStart = new Date(parsed.data.fromStart);
  const toStart = new Date(parsed.data.toStart);
  const fromEnd = addDays(fromStart, 7);

  const source = await prisma.shift.findMany({
    where: {
      organizationId: orgId,
      start: { gte: fromStart, lt: fromEnd },
    },
  });

  const delta = toStart.getTime() - fromStart.getTime();
  const created = await prisma.$transaction(
    source.map((s) =>
      prisma.shift.create({
        data: {
          start: new Date(s.start.getTime() + delta),
          end: new Date(s.end.getTime() + delta),
          roleRequirement: s.roleRequirement,
          location: s.location,
          notes: s.notes,
          assigneeId: s.assigneeId,
          organizationId: orgId,
        },
      }),
    ),
  );

  await writeAudit({
    organizationId: orgId,
    actorId: user.id,
    action: "shifts.copy_week",
    entityType: "Shift",
    meta: { fromStart: fromStart.toISOString(), toStart: toStart.toISOString(), count: created.length },
  });

  return NextResponse.json({ copied: created.length });
}
