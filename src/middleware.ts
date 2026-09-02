import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Duplicated from src/lib/auth.ts (not imported): that module pulls in
// Drizzle/postgres and next/headers, neither safe in this file's Edge
// runtime — this tiny helper is cheaper to keep in sync by hand than to
// risk breaking middleware by importing a Node-only module graph into it.
function hardenSessionCookie(options: CookieOptions): CookieOptions {
  return {
    ...options,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: options.sameSite ?? "lax",
  };
}

/**
 * Runs on every page (not just /admin) because Supabase's SSR client can
 * only persist a refreshed access token from a request that can set
 * cookies — a Server Component can't (see the setAll comment in
 * src/lib/auth.ts). Without this running site-wide, a Google-signed-in
 * member's session would silently stop working on public pages after the
 * ~1h access token expires, even with a valid 30-day refresh token.
 *
 * The /admin redirect below is still just a soft UX guard, not the security
 * boundary — server actions always re-check via requireAdmin().
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  if (
    request.nextUrl.pathname === "/admin/sign-in" ||
    request.nextUrl.pathname === "/admin/reset-password"
  ) {
    return response;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({
          request: { headers: request.headers },
        });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, hardenSessionCookie(options));
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (request.nextUrl.pathname.startsWith("/admin") && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.searchParams.set("admin", "required");
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  // Excludes static assets, images, fonts, and the OAuth callback itself
  // (which establishes its own session and doesn't need a pre-existing one).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|fonts/|auth/callback).*)",
  ],
};
