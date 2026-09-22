import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Next.js 16: prefer `proxy` over deprecated `middleware` filename.
export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|favicon\\.svg|logo\\.svg|sw\\.js|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
