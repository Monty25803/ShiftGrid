import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSessionUser } from "@/lib/api";
import { requireOrgId } from "@/lib/rbac";
import {
  allowedRolesForCreator,
  canAssignRole,
  canEditUser,
  canManageTeam,
  userPublicSelect,
} from "@/lib/team";
import { notifyUser } from "@/lib/notifications";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(["ADMIN", "MANAGER", "STAFF"]).optional(),
  hourlyRate: z.number().nonnegative().nullable().optional(),
  contact: z.string().nullable().optional(),
  active: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const result = await requireSessionUser();
  if ("error" in result) return result.error;
  const { user } = result;
  const orgId = requireOrgId(user);
  const { id } = await params;

  const target = await prisma.user.findFirst({
    where: { id, organizationId: orgId },
    select: userPublicSelect,
  });
  if (!target) return jsonError("User not found", 404);
  return NextResponse.json(target);
}

export async function PATCH(request: Request, { params }: Params) {
  const result = await requireSessionUser();
  if ("error" in result) return result.error;
  const { user } = result;
  if (!canManageTeam(user)) return jsonError("Forbidden — admin or manager required", 403);
  const orgId = requireOrgId(user);
  const { id } = await params;

  const target = await prisma.user.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!target) return jsonError("User not found", 404);
  if (!canEditUser(user, target)) {
    return jsonError("Managers can only modify staff accounts", 403);
  }

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return jsonError(parsed.error.message);

  if (parsed.data.role) {
    const nextRole = parsed.data.role as Role;
    if (!canAssignRole(user, nextRole)) {
      return jsonError(
        `You cannot assign role ${nextRole}. Allowed: ${allowedRolesForCreator(user).join(", ")}`,
        403,
      );
    }
    // Prevent locking yourself out as the sole admin
    if (target.id === user.id && user.role === Role.ADMIN && nextRole !== Role.ADMIN) {
      const adminCount = await prisma.user.count({
        where: { organizationId: orgId, role: Role.ADMIN, active: true },
      });
      if (adminCount <= 1) {
        return jsonError("Cannot demote the only active admin", 400);
      }
    }
  }

  if (parsed.data.active === false && target.id === user.id) {
    return jsonError("You cannot deactivate your own account", 400);
  }

  if (parsed.data.email) {
    const email = parsed.data.email.toLowerCase().trim();
    const clash = await prisma.user.findFirst({
      where: { email, NOT: { id } },
    });
    if (clash) return jsonError("Email already in use", 409);
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      name: parsed.data.name?.trim(),
      email: parsed.data.email?.toLowerCase().trim(),
      role: parsed.data.role as Role | undefined,
      hourlyRate: parsed.data.hourlyRate === undefined ? undefined : parsed.data.hourlyRate,
      contact: parsed.data.contact === undefined ? undefined : parsed.data.contact,
      active: parsed.data.active,
      ...(parsed.data.password
        ? { passwordHash: await bcrypt.hash(parsed.data.password, 10) }
        : {}),
    },
    select: userPublicSelect,
  });

  if (parsed.data.password || parsed.data.active === false || parsed.data.role) {
    await notifyUser({
      userId: updated.id,
      organizationId: orgId,
      title: "Account updated",
      body: parsed.data.active === false
        ? "Your ShiftGrid account was deactivated."
        : "Your account details were updated by an administrator.",
      href: "/schedule",
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: Params) {
  const result = await requireSessionUser();
  if ("error" in result) return result.error;
  const { user } = result;
  if (user.role !== Role.ADMIN) {
    return jsonError("Only admins can permanently remove users — deactivate instead", 403);
  }
  const orgId = requireOrgId(user);
  const { id } = await params;

  const target = await prisma.user.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!target) return jsonError("User not found", 404);
  if (target.id === user.id) return jsonError("Cannot delete your own account", 400);

  // Soft-delete preferred: mark inactive rather than hard delete
  const updated = await prisma.user.update({
    where: { id },
    data: { active: false },
    select: userPublicSelect,
  });
  return NextResponse.json(updated);
}
