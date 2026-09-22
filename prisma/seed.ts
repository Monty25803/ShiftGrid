import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, setHours, setMinutes, startOfWeek } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  await prisma.attendance.deleteMany();
  await prisma.swapRequest.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  const org = await prisma.organization.create({
    data: {
      name: "Demo Cafe",
      timezone: "America/Los_Angeles",
      overtimeHoursPerWeek: 40,
      requireLocationClockIn: false,
      maxHoursPerDay: 12,
      minBreakMinutes: 30,
      minStaffPerDay: 2,
    },
  });

  const [manager, staffA, staffB, admin] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Morgan Manager",
        email: "manager@demo.local",
        passwordHash,
        role: Role.MANAGER,
        hourlyRate: 28,
        contact: "+1-555-0100",
        organizationId: org.id,
        mustChangePassword: false,
      },
    }),
    prisma.user.create({
      data: {
        name: "Sam Staff",
        email: "staff@demo.local",
        passwordHash,
        role: Role.STAFF,
        hourlyRate: 18,
        contact: "+1-555-0101",
        organizationId: org.id,
        mustChangePassword: false,
      },
    }),
    prisma.user.create({
      data: {
        name: "Alex Barista",
        email: "alex@demo.local",
        passwordHash,
        role: Role.STAFF,
        hourlyRate: 17,
        contact: "+1-555-0102",
        organizationId: org.id,
        mustChangePassword: false,
      },
    }),
    prisma.user.create({
      data: {
        name: "Ada Admin",
        email: "admin@demo.local",
        passwordHash,
        role: Role.ADMIN,
        hourlyRate: 35,
        contact: "+1-555-0199",
        organizationId: org.id,
        mustChangePassword: false,
      },
    }),
  ]);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  const mkShift = (
    dayOffset: number,
    startHour: number,
    endHour: number,
    assigneeId: string,
    roleRequirement: string,
  ) => {
    const day = addDays(weekStart, dayOffset);
    return {
      start: setMinutes(setHours(day, startHour), 0),
      end: setMinutes(setHours(day, endHour), 0),
      roleRequirement,
      location: "Front Counter",
      organizationId: org.id,
      assigneeId,
    };
  };

  await prisma.shift.createMany({
    data: [
      mkShift(0, 8, 14, staffA.id, "Barista"),
      mkShift(0, 14, 20, staffB.id, "Barista"),
      mkShift(1, 8, 16, staffA.id, "Barista"),
      mkShift(2, 10, 18, staffB.id, "Shift Lead"),
      mkShift(3, 8, 14, staffA.id, "Barista"),
      mkShift(4, 12, 20, staffB.id, "Barista"),
    ],
  });

  console.log("Seeded Demo Cafe");
  console.log("  admin@demo.local / password123");
  console.log("  manager@demo.local / password123");
  console.log("  staff@demo.local / password123");
  console.log("  alex@demo.local / password123");
  console.log(`  users: ${admin.email}, ${manager.email}, ${staffA.email}, ${staffB.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
