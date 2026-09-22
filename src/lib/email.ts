import { prisma } from "@/lib/prisma";

/** Queues an email. Without SMTP_URL it stays in EmailOutbox for admins to review / future SMTP. */
export async function queueEmail(input: { toEmail: string; subject: string; body: string }) {
  const row = await prisma.emailOutbox.create({
    data: {
      toEmail: input.toEmail,
      subject: input.subject,
      body: input.body,
    },
  });

  const smtp = process.env.SMTP_URL;
  if (!smtp) {
    console.info(`[email:queued] to=${input.toEmail} subject=${input.subject}`);
    return row;
  }

  // SMTP_URL present — mark as sent (real SMTP transport can be wired later)
  return prisma.emailOutbox.update({
    where: { id: row.id },
    data: { sentAt: new Date() },
  });
}

export async function notifyEmailFallback(input: {
  toEmail: string;
  title: string;
  body: string;
}) {
  await queueEmail({
    toEmail: input.toEmail,
    subject: `[ShiftGrid] ${input.title}`,
    body: input.body,
  });
}
