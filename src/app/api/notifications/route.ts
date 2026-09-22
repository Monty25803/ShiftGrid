import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSessionUser } from "@/lib/api";
import { requireOrgId } from "@/lib/rbac";

export async function GET() {
  const result = await requireSessionUser();
  if ("error" in result) return result.error;
  const { user } = result;
  requireOrgId(user);

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, read: false },
  });

  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(request: Request) {
  const result = await requireSessionUser();
  if ("error" in result) return result.error;
  const { user } = result;

  const body = (await request.json()) as { ids?: string[]; all?: boolean };
  if (body.all) {
    await prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  }

  if (!body.ids?.length) return jsonError("ids required");
  await prisma.notification.updateMany({
    where: { userId: user.id, id: { in: body.ids } },
    data: { read: true },
  });
  return NextResponse.json({ ok: true });
}
