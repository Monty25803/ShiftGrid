import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSessionUser } from "@/lib/api";
import { getVapidPublicKey } from "@/lib/push";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function GET() {
  return NextResponse.json({ publicKey: getVapidPublicKey() });
}

export async function POST(request: Request) {
  const result = await requireSessionUser();
  if ("error" in result) return result.error;
  const { user } = result;

  const parsed = subscribeSchema.safeParse(await request.json());
  if (!parsed.success) return jsonError(parsed.error.message);

  const sub = await prisma.pushSubscription.upsert({
    where: { endpoint: parsed.data.endpoint },
    create: {
      userId: user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
    },
    update: {
      userId: user.id,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
    },
  });

  return NextResponse.json(sub, { status: 201 });
}

export async function DELETE(request: Request) {
  const result = await requireSessionUser();
  if ("error" in result) return result.error;
  const { user } = result;
  const body = (await request.json()) as { endpoint?: string };
  if (!body.endpoint) return jsonError("endpoint required");

  await prisma.pushSubscription.deleteMany({
    where: { userId: user.id, endpoint: body.endpoint },
  });
  return NextResponse.json({ ok: true });
}
