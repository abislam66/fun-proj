import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

import { assertIsAdmin, assertIsMember } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { profiles, type ProfileRow } from "@/lib/db/schema";

export { assertIsAdmin, AuthError } from "@/lib/auth-guards";

/**
 * Session cookies must be unreadable to page JS (defense-in-depth against
 * XSS reading/exfiltrating the session) and HTTPS-only in production.
 * Only ever applied to cookies written from SERVER code (here and
 * middleware.ts) — `httpOnly` can only take effect via a real Set-Cookie
 * response header, never via `document.cookie`, so the browser client
 * used for password recovery (supabase-browser.ts, which must read
 * fragment tokens client-side) is architecturally unaffected either way:
 * it isn't touched by this helper, and the next server response still
 * re-asserts these flags on the same cookie names regardless.
 */
export function hardenSessionCookie(options: CookieOptions): CookieOptions {
  return {
    ...options,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: options.sameSite ?? "lax",
  };
}

export type SessionUser = {
  id: string;
  profile: ProfileRow;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, hardenSessionCookie(options));
            }
          } catch {
            // Called from a Server Component — middleware will refresh sessions.
          }
        },
      },
    },
  );
}

/** Verified session user + profile, or null. Never trust client-supplied identity. */
export async function getUser(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  if (!profile) {
    return null;
  }

  return { id: user.id, profile };
}

export async function requireAdmin(): Promise<SessionUser> {
  const session = await getUser();
  assertIsAdmin(session?.profile);
  return session!;
}

/** Signed-in profile that is not struck — members and admins. */
export async function requireMember(): Promise<SessionUser> {
  const session = await getUser();
  assertIsMember(session?.profile);
  return session!;
}
