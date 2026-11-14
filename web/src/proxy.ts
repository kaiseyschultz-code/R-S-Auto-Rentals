import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Runs before every page request.
 *
 * 1. OPS-ONLY MODE (OPS_ONLY=true): this app is deployed beside the live
 *    public site (e.g. at ops.rsautorentals.com), so only the staff CRM and
 *    renter inspection links are served here. "/" goes to the CRM; any other
 *    public page redirects to MAIN_SITE_URL.
 * 2. /admin: keeps the staff session fresh and sends signed-out visitors to
 *    the login page. Pages still check permissions themselves (see
 *    lib/crm/session.ts); this is the first gate, not the only one.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  if (process.env.OPS_ONLY === "true" && !isOpsPath(pathname)) {
    if (pathname === "/") return NextResponse.redirect(new URL("/admin", request.url));
    const main = process.env.MAIN_SITE_URL || "https://www.rsautorentals.com";
    return NextResponse.redirect(new URL(pathname + request.nextUrl.search, main), 308);
  }

  if (!isAdmin) return NextResponse.next();
  return adminSession(request);
}

/** Paths an ops-only deployment serves. */
function isOpsPath(pathname: string): boolean {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/inspect/") ||
    pathname.startsWith("/api/inspect/")
  );
}

async function adminSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const isLogin = request.nextUrl.pathname.startsWith("/admin/login");

  if (!signedIn && !isLogin) {
    const login = request.nextUrl.clone();
    login.pathname = "/admin/login";
    login.search = "";
    return NextResponse.redirect(login);
  }

  return response;
}

export const config = {
  // Everything except build assets and files with an extension (images, icons, robots.txt…).
  matcher: ["/((?!_next/static|_next/image|.*\\.[a-zA-Z0-9]+$).*)"],
};
