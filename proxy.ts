import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEMO_MODE } from "@/lib/demo/mode";

/**
 * Next.js 16 renamed `middleware` -> `proxy` (nodejs runtime only).
 *
 * Two jobs:
 *  1. Tell server code the current path (`x-pathname`) so `requireUser()` can
 *     redirect to `/login?next=<here>` instead of dropping people on Home.
 *  2. Real mode: keep the Supabase auth session fresh.
 *     Demo mode: auto-start a guest session for app routes so the landing
 *     CTAs and deep links don't dead-end at `/login`.
 *
 * Route protection itself lives in server components (`requireUser` /
 * `requireAdmin`) and Server Actions — never rely on the proxy alone.
 */

// Cookie name mirrors lib/demo/session.ts (kept literal — that module is
// "server-only" and this runs in the proxy).
const DEMO_COOKIE = "demo_session";

// App areas that require a signed-in user. Landing / auth / legal stay public;
// /admin is intentionally excluded (a guest there just bounces to /login).
const PROTECTED = [
  "/home",
  "/plan",
  "/explore",
  "/trips",
  "/bookings",
  "/profile",
  "/checkout",
  "/book",
];

function needsUser(pathname: string): boolean {
  return PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (DEMO_MODE) {
    const autoGuest =
      needsUser(pathname) && !request.cookies.get(DEMO_COOKIE);

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", pathname);
    if (autoGuest) {
      const existing = request.headers.get("cookie");
      requestHeaders.set(
        "cookie",
        existing
          ? `${existing}; ${DEMO_COOKIE}=guest`
          : `${DEMO_COOKIE}=guest`,
      );
    }

    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    if (autoGuest) {
      response.cookies.set(DEMO_COOKIE, "guest", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    }
    return response;
  }

  // ---- real mode: Supabase session refresh ----
  // Keep the proven Supabase SSR cookie pattern untouched; only add x-pathname.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        // On a token refresh we re-issue the response. x-pathname is only used
        // to build a return URL for signed-OUT users, so it's fine that this
        // branch (which implies a valid session) doesn't re-attach it.
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Touching the user refreshes an expired access token if a refresh token exists.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on everything except static assets and metadata files:
     *   _next/static, _next/image, favicon, icon, manifest,
     *   and common image extensions.
     */
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
