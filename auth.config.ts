// Edge-safe NextAuth v5 config — no Prisma, no native modules.
// Used by middleware.ts (Edge runtime) and extended by lib/auth.ts (Node.js).
import type { NextAuthConfig } from "next-auth";
import type { RoleName } from "@prisma/client";

export const authConfig = {
  pages: { signIn: "/signin", error: "/auth-error" },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60, updateAge: 5 * 60 },
  // trustHost must be explicit so NextAuth never rejects a valid request as UntrustedHost,
  // regardless of whether AUTH_TRUST_HOST env var is picked up at runtime.
  trustHost: true,
  callbacks: {
    async jwt({ token, user }) {
      // On sign-in `user` is populated; copy fields into the JWT.
      // The DB-refresh path (trigger === "update") lives in lib/auth.ts only.
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
      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.uid as string,
        email: session.user?.email ?? "",
        displayName: token.displayName as string,
        roles: (token.roles ?? []) as RoleName[],
        mustChangePassword: (token.mustChangePassword ?? false) as boolean,
      };
      return session;
    },
  },
  providers: [], // Providers added in lib/auth.ts — not safe for Edge
} satisfies NextAuthConfig;
