import { prisma } from "@/lib/prisma";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;

export async function isLoginLocked(email: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  const failures = await prisma.loginAttempt.count({
    where: { email: email.toLowerCase(), success: false, createdAt: { gte: since } },
  });
  return failures >= MAX_FAILURES;
}

export async function recordLoginAttempt(input: {
  email: string;
  success: boolean;
  ip?: string | null;
}) {
  await prisma.loginAttempt.create({
    data: {
      email: input.email.toLowerCase(),
      success: input.success,
      ip: input.ip ?? null,
    },
  });
}
