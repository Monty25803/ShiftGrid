import { prisma } from "@/lib/prisma";
import { sendWebPushToUser } from "@/lib/push";
import { notifyEmailFallback } from "@/lib/email";

export async function notifyUser(input: {
  userId: string;
  organizationId: string;
  title: string;
  body: string;
  href?: string;
}) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      organizationId: input.organizationId,
      title: input.title,
      body: input.body,
      href: input.href,
    },
  });

  await sendWebPushToUser(input.userId, {
    title: input.title,
    body: input.body,
    href: input.href,
  });

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { email: true },
  });
  if (user?.email) {
    await notifyEmailFallback({
      toEmail: user.email,
      title: input.title,
      body: `${input.body}${input.href ? `\n\nOpen: ${process.env.NEXTAUTH_URL ?? ""}${input.href}` : ""}`,
    });
  }

  return notification;
}

export async function notifyUsers(
  userIds: string[],
  payload: Omit<Parameters<typeof notifyUser>[0], "userId">,
) {
  const unique = [...new Set(userIds.filter(Boolean))];
  await Promise.all(unique.map((userId) => notifyUser({ ...payload, userId })));
}
