import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { checkRateLimit } from "@/lib/rate-limit";

const PUBLIC_PATHS = [
  "/signin",
  "/auth-error",
  "/forgot-password",
  "/api/auth",
];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

// NextAuth v5 (Auth.js) cookie names. v5 changed the prefix from
// `next-auth.session-token` (v4) to `authjs.session-token`. getToken()
// defaults to the v4 name, so without overriding it the middleware can
// never find the session and bounces every authenticated request back
// to /signin — the login-loop symptom.
const SESSION_COOKIE =
  process.env.NODE_ENV === "production"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rate-limit the NextAuth credentials sign-in endpoint.
  // 20 POST attempts per IP per 10 minutes keeps the UI responsive while
  // blocking credential-stuffing bursts before they reach the auth handler.
  if (
    pathname === "/api/auth/callback/credentials" &&
    req.method === "POST"
  ) {
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

  // Allow reset-password/[token] without session
  if (pathname.startsWith("/reset-password")) return NextResponse.next();
  if (isPublic(pathname)) return NextResponse.next();

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
    cookieName: SESSION_COOKIE,
    salt: SESSION_COOKIE,
  });

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // Force password change if flag is set (except on the change-password page itself)
  if (token.mustChangePassword && pathname !== "/change-password") {
    const url = req.nextUrl.clone();
    url.pathname = "/change-password";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|css|js)$).*)"],
};
