import { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      organizationId: string | null;
      mustChangePassword?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    organizationId: string | null;
    mustChangePassword?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    organizationId?: string | null;
    mustChangePassword?: boolean;
  }
}
