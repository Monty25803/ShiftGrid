"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { PushOptIn } from "@/components/push-opt-in";
import { BrandLogo } from "@/components/brand-logo";

const links = [
  { href: "/schedule", label: "Schedule" },
  { href: "/swaps", label: "Swaps" },
  { href: "/timesheet", label: "Timesheet" },
  { href: "/team", label: "Team", roles: ["ADMIN", "MANAGER"] as const },
  { href: "/audit", label: "Audit", roles: ["ADMIN", "MANAGER"] as const },
  { href: "/inbox", label: "Inbox" },
  { href: "/profile", label: "Profile" },
  { href: "/settings", label: "Settings", roles: ["ADMIN"] as const },
];

export function AppNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const hideChrome = pathname.startsWith("/change-password");
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Failed to load notifications");
      return res.json() as Promise<{ unreadCount: number }>;
    },
    refetchInterval: 30_000,
    enabled: !hideChrome,
  });

  const visibleLinks = links.filter((link) => {
    if (!("roles" in link) || !link.roles) return true;
    const userRole = session?.user?.role;
    if (!userRole) return false;
    return (link.roles as readonly string[]).includes(userRole);
  });

  if (hideChrome) return null;

  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/schedule" className="inline-flex items-center">
            <BrandLogo size={32} />
          </Link>
          <nav className="flex flex-wrap gap-1">
            {visibleLinks.map((link) => {
              const active = pathname.startsWith(link.href);
              const badge =
                link.href === "/inbox" && data?.unreadCount
                  ? data.unreadCount
                  : null;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3 py-1.5 text-sm transition ${
                    active
                      ? "bg-[var(--accent)] text-white"
                      : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
                  }`}
                >
                  {link.label}
                  {badge ? (
                    <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1 text-xs">
                      {badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
          <PushOptIn />
          <span>
            {session?.user?.name ?? session?.user?.email} · {session?.user?.role}
          </span>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 hover:bg-[var(--surface-2)]"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
