"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!session.user.mustChangePassword) return;
    if (pathname.startsWith("/change-password")) return;
    router.replace("/change-password");
  }, [session, status, pathname, router]);

  return <>{children}</>;
}
