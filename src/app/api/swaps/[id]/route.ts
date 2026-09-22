import { NextResponse } from "next/server";
import { SwapStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSessionUser } from "@/lib/api";
import { canManageSchedule, requireOrgId } from "@/lib/rbac";
import { evaluateTargetForSwap } from "@/lib/swaps";
import { notifyUser, notifyUsers } from "@/lib/notifications";

const actionSchema = z.object({
  action: z.enum(["claim", "accept", "reject", "approve", "deny"]),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const result = await requireSessionUser();
  if ("error" in result) return result.error;
  const { user } = result;
  const orgId = requireOrgId(user);
  const { id } = await params;

  const parsed = actionSchema.safeParse(await request.json());
  if (!parsed.success) return jsonError(parsed.error.message);

  const swap = await prisma.swapRequest.findFirst({
    where: { id, organizationId: orgId },
    include: {
      shift: true,
      fromUser: { select: { id: true, name: true, email: true } },
      toUser: { select: { id: true, name: true, email: true } },
    },
  });
  if (!swap) return jsonError("Swap not found", 404);

  const { action } = parsed.data;

  if (action === "claim") {
    if (swap.status !== SwapStatus.OFFERED || swap.toUserId) {
      return jsonError("Swap is not open in the marketplace");
    }
    if (swap.fromUserId === user.id) return jsonError("Cannot claim your own shift");

    const eligibility = await evaluateTargetForSwap(user.id, swap.shiftId, orgId);
    if (!eligibility.eligible) {
      return NextResponse.json(
        { error: "Not eligible for this swap", details: eligibility },
        { status: 409 },
      );
    }

    const updated = await prisma.swapRequest.update({
      where: { id },
      data: { toUserId: user.id, status: SwapStatus.ACCEPTED },
      include: {
        shift: true,
        fromUser: { select: { id: true, name: true, email: true } },
        toUser: { select: { id: true, name: true, email: true } },
      },
    });

    const managers = await prisma.user.findMany({
      where: {
        organizationId: orgId,
        role: { in: ["ADMIN", "MANAGER"] },
      },
      select: { id: true },
    });
    await notifyUsers(
      managers.map((m) => m.id),
      {
        organizationId: orgId,
        title: "Swap awaiting approval",
        body: `${user.name ?? "Staff"} claimed a marketplace shift. Review conflicts before approving.`,
        href: "/swaps",
      },
    );

    return NextResponse.json({ swap: updated, eligibility });
  }

  if (action === "accept" || action === "reject") {
    if (swap.toUserId !== user.id) return jsonError("Only the target can respond", 403);
    if (swap.status !== SwapStatus.PENDING) return jsonError("Swap is not pending");

    if (action === "reject") {
      const updated = await prisma.swapRequest.update({
        where: { id },
        data: { status: SwapStatus.REJECTED },
      });
      await notifyUser({
        userId: swap.fromUserId,
        organizationId: orgId,
        title: "Swap declined",
        body: `${user.name ?? "A coworker"} declined your swap request.`,
        href: "/swaps",
      });
      return NextResponse.json(updated);
    }

    const eligibility = await evaluateTargetForSwap(user.id, swap.shiftId, orgId);
    if (!eligibility.eligible) {
      return NextResponse.json(
        { error: "Not eligible for this swap", details: eligibility },
        { status: 409 },
      );
    }

    const updated = await prisma.swapRequest.update({
      where: { id },
      data: { status: SwapStatus.ACCEPTED },
      include: {
        shift: true,
        fromUser: { select: { id: true, name: true, email: true } },
        toUser: { select: { id: true, name: true, email: true } },
      },
    });

    const managers = await prisma.user.findMany({
      where: { organizationId: orgId, role: { in: ["ADMIN", "MANAGER"] } },
      select: { id: true },
    });
    await notifyUsers(
      managers.map((m) => m.id),
      {
        organizationId: orgId,
        title: "Swap awaiting approval",
        body: "A swap was accepted by staff. Conflict checks passed — please approve or deny.",
        href: "/swaps",
      },
    );

    return NextResponse.json({ swap: updated, eligibility });
  }

  if (action === "approve" || action === "deny") {
    if (!canManageSchedule(user)) return jsonError("Forbidden", 403);
    if (swap.status !== SwapStatus.ACCEPTED) {
      return jsonError("Only accepted swaps can be finalized");
    }
    if (!swap.toUserId) return jsonError("Swap has no target user");

    if (action === "deny") {
      const updated = await prisma.swapRequest.update({
        where: { id },
        data: { status: SwapStatus.REJECTED },
      });
      await notifyUsers([swap.fromUserId, swap.toUserId], {
        organizationId: orgId,
        title: "Swap rejected by manager",
        body: "A manager rejected the pending shift swap.",
        href: "/swaps",
      });
      return NextResponse.json(updated);
    }

    const eligibility = await evaluateTargetForSwap(swap.toUserId, swap.shiftId, orgId);
    if (!eligibility.eligible) {
      return NextResponse.json(
        {
          error: "Cannot approve — conflict or overtime rules failed",
          details: eligibility,
        },
        { status: 409 },
      );
    }

    const [updated] = await prisma.$transaction([
      prisma.swapRequest.update({
        where: { id },
        data: { status: SwapStatus.APPROVED },
      }),
      prisma.shift.update({
        where: { id: swap.shiftId },
        data: { assigneeId: swap.toUserId },
      }),
    ]);

    await notifyUsers([swap.fromUserId, swap.toUserId], {
      organizationId: orgId,
      title: "Swap approved",
      body: "Your shift swap was approved. The schedule has been updated.",
      href: "/schedule",
    });

    return NextResponse.json({ swap: updated, eligibility });
  }

  return jsonError("Unknown action");
}
