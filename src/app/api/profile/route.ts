import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSessionUser } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

const profileSchema = z.object({
  name: z.string().min(1).optional(),
  contact: z.string().nullable().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(8),
});

export async function GET() {
  const result = await requireSessionUser();
  if ("error" in result) return result.error;
  const { user } = result;

  const full = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      contact: true,
      hourlyRate: true,
      mustChangePassword: true,
      active: true,
    },
  });
  return NextResponse.json(full);
}

export async function PATCH(request: Request) {
  const result = await requireSessionUser();
  if ("error" in result) return result.error;
  const { user } = result;

  const body = await request.json();
  if (body.newPassword) {
    const parsed = passwordSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.message);

    const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    if (dbUser.mustChangePassword) {
      // first-login reset: current password optional if already authenticated
    } else if (parsed.data.currentPassword) {
      const ok = await bcrypt.compare(parsed.data.currentPassword, dbUser.passwordHash ?? "");
      if (!ok) return jsonError("Current password is incorrect", 400);
    } else {
      return jsonError("currentPassword required", 400);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(parsed.data.newPassword, 10),
        mustChangePassword: false,
      },
    });

    if (user.organizationId) {
      await writeAudit({
        organizationId: user.organizationId,
        actorId: user.id,
        action: "user.password_changed",
        entityType: "User",
        entityId: user.id,
      });
    }

    return NextResponse.json({ ok: true, mustChangePassword: false });
  }

  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.message);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name?.trim(),
      contact: parsed.data.contact === undefined ? undefined : parsed.data.contact,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      contact: true,
      hourlyRate: true,
      mustChangePassword: true,
    },
  });

  return NextResponse.json(updated);
}
