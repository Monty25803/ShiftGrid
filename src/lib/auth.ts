import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "@/lib/auth.config";
import { prisma } from "@/lib/prisma";
import { isLoginLocked, recordLoginAttempt } from "@/lib/rate-limit";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const email = parsed.data.email.toLowerCase();
        if (await isLoginLocked(email)) {
          throw new Error("Too many failed attempts. Try again in 15 minutes.");
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash || !user.active) {
          await recordLoginAttempt({ email, success: false });
          return null;
        }

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) {
          await recordLoginAttempt({ email, success: false });
          return null;
        }

        await recordLoginAttempt({ email, success: true });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
});
