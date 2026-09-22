import { auth } from "@/lib/auth";
import { getSessionUser, type SessionUser } from "@/lib/rbac";
import { NextResponse } from "next/server";

export async function requireSessionUser(): Promise<
  { user: SessionUser } | { error: NextResponse }
> {
  const session = await auth();
  const user = getSessionUser(session);
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { user };
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
