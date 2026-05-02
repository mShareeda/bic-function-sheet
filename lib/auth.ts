import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraId from "next-auth/providers/microsoft-entra-id";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { authConfig } from "@/auth.config";
import { notify } from "@/lib/notifications";
import type { RoleName } from "@prisma/client";
import type { JWT } from "@auth/core/jwt";

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

// Internal token shape (not a module augmentation — avoids TS2664 with bundler resolution)
type BicJWT = JWT & {
  uid?: string;
  displayName?: string;
  roles?: RoleName[];
  mustChangePassword?: boolean;
};

const providers = [
  Credentials({
    name: "Email + password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(raw) {
      try {
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
      } catch (err) {
        // Prevent unhandled DB/crypto exceptions from surfacing as NextAuth
        // "server configuration" errors — return null (invalid credentials) instead.
        console.error("[authorize] unexpected error:", err);
        return null;
      }
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
  ...authConfig,
  providers,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account, profile }) {
      // M365 SSO JIT path — only reachable when AUTH_M365_ENABLED=true
      if (account?.provider === "microsoft-entra-id" && profile) {
        const oid = (profile as { oid?: string }).oid;
        const email = (
          profile.email ??
          (profile as { preferred_username?: string }).preferred_username
        )?.toLowerCase();

        if (!oid || !email) return false;

        const byOid = await prisma.user.findUnique({ where: { azureOid: oid } });
        if (byOid) {
          if (!byOid.isActive) return "/auth-error?error=PendingApproval";
          await prisma.user.update({
            where: { id: byOid.id },
            data: { lastLoginAt: new Date() },
          });
          (user as { id?: string }).id = byOid.id;
          return true;
        }

        const byEmail = await prisma.user.findUnique({ where: { email } });
        if (byEmail) return false;

        const now = new Date();
        const created = await prisma.user.create({
          data: {
            email,
            displayName: profile.name ?? email,
            azureOid: oid,
            isActive: false,
            ssoProvisionedAt: now,
          },
        });
        (user as { id?: string }).id = created.id;

        // Notify all admins so they can approve or reject the new user
        const admins = await prisma.userRole.findMany({
          where: { role: "ADMIN" },
          select: { userId: true },
        });
        const adminIds = admins.map((a) => a.userId);
        if (adminIds.length) {
          const appUrl = process.env.APP_URL ?? "http://localhost:3000";
          await notify({
            userIds: adminIds,
            type: "SSO_PENDING_APPROVAL",
            title: `New M365 user pending approval: ${created.displayName}`,
            body: created.email,
            url: `${appUrl}/admin/users/${created.id}`,
            sendEmail: true,
            emailSubject: `[BIC] New SSO user needs approval: ${created.email}`,
            emailText: `A new user signed in via Microsoft 365 and needs your approval.\n\nName: ${created.displayName}\nEmail: ${created.email}\n\nApprove or reject: ${appUrl}/admin/users/${created.id}`,
            emailHtml: `<p>A new user signed in via Microsoft 365 and needs your approval.</p><p><strong>Name:</strong> ${created.displayName}<br><strong>Email:</strong> ${created.email}</p><p><a href="${appUrl}/admin/users/${created.id}">Approve or reject</a></p>`,
          });
        }

        // Block sign-in until approved — return "/auth-error" to redirect
        return "/auth-error?error=PendingApproval";
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      const t = token as BicJWT;
      // Sign-in: copy user fields into JWT
      if (user) {
        const u = user as unknown as {
          id: string;
          displayName?: string;
          name?: string;
          roles?: RoleName[];
          mustChangePassword?: boolean;
        };
        t.uid = u.id;
        t.displayName = u.displayName ?? u.name ?? "";
        t.roles = u.roles ?? [];
        t.mustChangePassword = u.mustChangePassword ?? false;
      }
      // Refresh roles from DB when session is explicitly updated
      if (trigger === "update" && t.uid) {
        const fresh = await prisma.user.findUnique({
          where: { id: t.uid },
          include: { roles: true },
        });
        if (fresh) {
          t.roles = fresh.roles.map((r) => r.role);
          t.mustChangePassword = fresh.mustChangePassword;
          t.displayName = fresh.displayName;
        }
      }
      return t as JWT;
    },
    async session({ session, token }) {
      const t = token as BicJWT;
      session.user = {
        ...session.user,
        id: t.uid ?? "",
        email: session.user?.email ?? "",
        displayName: t.displayName ?? "",
        roles: (t.roles ?? []) as RoleName[],
        mustChangePassword: t.mustChangePassword ?? false,
      };
      return session;
    },
  },
});
