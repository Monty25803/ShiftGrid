import { NextResponse } from "next/server";
import { SwapStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSessionUser } from "@/lib/api";
import { canManageSchedule, requireOrgId } from "@/lib/rbac";
import { notifyUser, notifyUsers } from "@/lib/notifications";

const createSchema = z.object({
  shiftId: z.string().min(1),
  toUserId: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

export async function GET() {
  const result = await requireSessionUser();
  if ("error" in result) return result.error;
  const { user } = result;
  const orgId = requireOrgId(user);

  const swaps = await prisma.swapRequest.findMany({
    where: {
      organizationId: orgId,
      ...(canManageSchedule(user)
        ? {}
        : {
            OR: [
              { fromUserId: user.id },
              { toUserId: user.id },
              { status: SwapStatus.OFFERED, toUserId: null },
            ],
          }),
    },
    include: {
      shift: {
        include: {
          assignee: { select: { id: true, name: true, email: true } },
        },
      },
      fromUser: { select: { id: true, name: true, email: true } },
      toUser: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(swaps);
}

export async function POST(request: Request) {
  const result = await requireSessionUser();
  if ("error" in result) return result.error;
  const { user } = result;
  const orgId = requireOrgId(user);

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return jsonError(parsed.error.message);

  const shift = await prisma.shift.findFirst({
    where: { id: parsed.data.shiftId, organizationId: orgId },
  });
  if (!shift) return jsonError("Shift not found", 404);
  if (shift.assigneeId !== user.id && !canManageSchedule(user)) {
    return jsonError("You can only offer your own shifts", 403);
  }
  if (!shift.assigneeId) return jsonError("Shift has no assignee to swap");

  if (parsed.data.toUserId) {
    const target = await prisma.user.findFirst({
      where: { id: parsed.data.toUserId, organizationId: orgId },
    });
    if (!target) return jsonError("Target user not in organization");
  }

  const swap = await prisma.swapRequest.create({
    data: {
      shiftId: shift.id,
      fromUserId: shift.assigneeId,
      toUserId: parsed.data.toUserId ?? null,
      status: parsed.data.toUserId ? SwapStatus.PENDING : SwapStatus.OFFERED,
      organizationId: orgId,
      note: parsed.data.note ?? null,
    },
    include: {
      shift: true,
      fromUser: { select: { id: true, name: true, email: true } },
      toUser: { select: { id: true, name: true, email: true } },
    },
  });

  if (swap.toUserId) {
    await notifyUser({
      userId: swap.toUserId,
      organizationId: orgId,
      title: "Shift swap request",
      body: `${swap.fromUser.name ?? "A coworker"} wants to swap a shift with you.`,
      href: "/swaps",
    });
  } else {
    const staff = await prisma.user.findMany({
      where: { organizationId: orgId, id: { not: user.id } },
      select: { id: true },
    });
    await notifyUsers(
      staff.map((s) => s.id),
      {
        organizationId: orgId,
        title: "Shift available in marketplace",
        body: "A shift was offered for swap. Claim it if you are available.",
        href: "/swaps",
      },
    );
  }

  return NextResponse.json(swap, { status: 201 });
}
