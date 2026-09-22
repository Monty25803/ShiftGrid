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
  canManageTeam,
  userPublicSelect,
} from "@/lib/team";
import { notifyUser } from "@/lib/notifications";

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "MANAGER", "STAFF"]).default("STAFF"),
  hourlyRate: z.number().nonnegative().nullable().optional(),
  contact: z.string().nullable().optional(),
});

export async function GET() {
  const result = await requireSessionUser();
  if ("error" in result) return result.error;
  const { user } = result;
  const orgId = requireOrgId(user);

  const users = await prisma.user.findMany({
    where: { organizationId: orgId },
    select: userPublicSelect,
    orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const result = await requireSessionUser();
  if ("error" in result) return result.error;
  const { user } = result;
  if (!canManageTeam(user)) return jsonError("Forbidden — admin or manager required", 403);
  const orgId = requireOrgId(user);

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return jsonError(parsed.error.message);

  const role = parsed.data.role as Role;
  if (!canAssignRole(user, role)) {
    return jsonError(
      `You cannot create users with role ${role}. Allowed: ${allowedRolesForCreator(user).join(", ")}`,
      403,
    );
  }

  const email = parsed.data.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return jsonError("Email already in use", 409);

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const created = await prisma.user.create({
    data: {
      name: parsed.data.name.trim(),
      email,
      passwordHash,
      role,
      hourlyRate: parsed.data.hourlyRate ?? null,
      contact: parsed.data.contact ?? null,
      organizationId: orgId,
      active: true,
      mustChangePassword: true,
    },
    select: userPublicSelect,
  });

  await notifyUser({
    userId: created.id,
    organizationId: orgId,
    title: "Welcome to ShiftGrid",
    body: `Your account was created by ${user.name ?? user.email}. Sign in with your email and temporary password.`,
    href: "/schedule",
  });

  return NextResponse.json(created, { status: 201 });
}
