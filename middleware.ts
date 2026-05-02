import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { checkRateLimit } from "@/lib/rate-limit";

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = [
  "/signin",
  "/auth-error",
  "/forgot-password",
  "/reset-password",
  "/api/auth",
];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

export default auth(async (req) => {
  const { pathname } = req.nextUrl;

  // Rate-limit the credentials sign-in endpoint
  if (pathname === "/api/auth/callback/credentials" && req.method === "POST") {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";
    const result = checkRateLimit(`signin:${ip}`, 20, 10 * 60 * 1000);
    if (!result.allowed) {
      return new NextResponse("Too many login attempts. Try again later.", {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)),
          "Content-Type": "text/plain",
        },
      });
    }
  }

  if (isPublic(pathname)) return NextResponse.next();

  // req.auth is set by NextAuth when the JWT is valid; null if not signed in
  if (!req.auth) {
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // mustChangePassword is enforced in the (app) layout — no redirect needed here
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|css|js)$).*)",
  ],
};
