import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

export async function GET() {
  const orgCount = await prisma.organization.count();
  const userCount = await prisma.user.count();
  return NextResponse.json({
    needsSetup: orgCount === 0 || userCount === 0,
    orgCount,
    userCount,
  });
}

const setupSchema = z.object({
  organizationName: z.string().min(2),
  timezone: z.string().min(1),
  overtimeHoursPerWeek: z.number().positive().max(168).default(40),
  maxHoursPerDay: z.number().positive().max(24).default(12),
  minBreakMinutes: z.number().int().min(0).max(720).default(0),
  minStaffPerDay: z.number().int().min(0).max(100).default(1),
  adminName: z.string().min(1),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
});

export async function POST(request: Request) {
  const orgCount = await prisma.organization.count();
  if (orgCount > 0) {
    return jsonError("Setup already completed", 409);
  }

  const parsed = setupSchema.safeParse(await request.json());
  if (!parsed.success) return jsonError(parsed.error.message);

  const email = parsed.data.adminEmail.toLowerCase().trim();
  const passwordHash = await bcrypt.hash(parsed.data.adminPassword, 10);

  const org = await prisma.organization.create({
    data: {
      name: parsed.data.organizationName.trim(),
      timezone: parsed.data.timezone,
      overtimeHoursPerWeek: parsed.data.overtimeHoursPerWeek,
      maxHoursPerDay: parsed.data.maxHoursPerDay,
      minBreakMinutes: parsed.data.minBreakMinutes,
      minStaffPerDay: parsed.data.minStaffPerDay,
      users: {
        create: {
          name: parsed.data.adminName.trim(),
          email,
          passwordHash,
          role: Role.ADMIN,
          mustChangePassword: false,
          active: true,
        },
      },
    },
    include: { users: true },
  });

  const admin = org.users[0];
  await writeAudit({
    organizationId: org.id,
    actorId: admin.id,
    action: "setup.completed",
    entityType: "Organization",
    entityId: org.id,
    meta: { timezone: org.timezone },
  });

  return NextResponse.json({
    ok: true,
    organizationId: org.id,
    adminEmail: admin.email,
  });
}
