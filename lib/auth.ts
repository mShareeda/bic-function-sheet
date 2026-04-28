import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraId from "next-auth/providers/microsoft-entra-id";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import type { RoleName } from "@prisma/client";

const M365_ENABLED = process.env.AUTH_M365_ENABLED === "true";

const LOCKOUT_THRESHOLD = 10;
const LOCKOUT_WINDOW_MS = 60 * 60 * 1000;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      displayName: string;
      roles: RoleName[];
      mustChangePassword: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid: string;
    roles: RoleName[];
    mustChangePassword: boolean;
    displayName: string;
  }
}

const providers = [
  Credentials({
    name: "Email + password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(raw) {
      const parsed = credentialsSchema.safeParse(raw);
      if (!parsed.success) return null;
      const { email, password } = parsed.data;

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: { roles: true },
      });
      if (!user || !user.isActive || !user.passwordHash) return null;

      // Lockout check
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        return null;
      }

      const ok = await verifyPassword(user.passwordHash, password);
      if (!ok) {
        // Increment failed attempts; lock if threshold crossed within window
        const now = new Date();
        const sinceLast =
          user.lastLoginAt && now.getTime() - user.lastLoginAt.getTime() < LOCKOUT_WINDOW_MS
            ? user.failedLoginAttempts
            : 0;
        const newCount = sinceLast + 1;
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: newCount,
            lockedUntil:
              newCount >= LOCKOUT_THRESHOLD
                ? new Date(now.getTime() + LOCKOUT_DURATION_MS)
                : user.lockedUntil,
          },
        });
        return null;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: new Date(),
        },
      });

      return {
        id: user.id,
        email: user.email,
        name: user.displayName,
        displayName: user.displayName,
        roles: user.roles.map((r) => r.role),
        mustChangePassword: user.mustChangePassword,
      } as never;
    },
  }),
];

if (M365_ENABLED) {
  providers.push(
    MicrosoftEntraId({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_SECRET,
      issuer: `https://login.microsoftonline.com/${process.env.AUTH_MICROSOFT_ENTRA_TENANT_ID}/v2.0`,
    }) as never,
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60, updateAge: 12 * 60 * 60 },
  pages: { signIn: "/signin", error: "/auth-error" },
  callbacks: {
    async signIn({ user, account, profile }) {
      // M365 SSO JIT path — only reachable when AUTH_M365_ENABLED=true
      if (account?.provider === "microsoft-entra-id" && profile) {
        const oid = (profile as { oid?: string }).oid;
        const email = (profile.email ?? (profile as { preferred_username?: string }).preferred_username)?.toLowerCase();
        if (!email) return false;

        const existing = await prisma.user.findFirst({
          where: { OR: [{ azureOid: oid }, { email }] },
        });
        if (existing) {
          if (!existing.azureOid && oid) {
            await prisma.user.update({
              where: { id: existing.id },
              data: { azureOid: oid, lastLoginAt: new Date() },
            });
          } else {
            await prisma.user.update({
              where: { id: existing.id },
              data: { lastLoginAt: new Date() },
            });
          }
          (user as { id?: string }).id = existing.id;
        } else {
          // JIT-create with no roles; admin must assign roles.
          const created = await prisma.user.create({
            data: {
              email,
              displayName: profile.name ?? email,
              azureOid: oid,
              isActive: true,
              lastLoginAt: new Date(),
            },
          });
          (user as { id?: string }).id = created.id;
        }
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        const u = user as unknown as {
          id: string;
          displayName?: string;
          name?: string;
          roles?: RoleName[];
          mustChangePassword?: boolean;
        };
        token.uid = u.id;
        token.displayName = u.displayName ?? u.name ?? "";
        token.roles = u.roles ?? [];
        token.mustChangePassword = u.mustChangePassword ?? false;
      }
      // Refresh roles on session update
      if (trigger === "update" && token.uid) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.uid as string },
          include: { roles: true },
        });
        if (fresh) {
          token.roles = fresh.roles.map((r) => r.role);
          token.mustChangePassword = fresh.mustChangePassword;
          token.displayName = fresh.displayName;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.uid,
        email: session.user?.email ?? "",
        displayName: token.displayName,
        roles: token.roles ?? [],
        mustChangePassword: token.mustChangePassword ?? false,
      };
      return session;
    },
  },
});
