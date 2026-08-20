import { createBrowserClient } from "@supabase/ssr";

/**
 * Client-side Supabase instance — needed only for password recovery, which
 * must read tokens Supabase puts in the URL fragment (servers never see
 * fragments, so this can't be done from a server action or route handler).
 * Everything else in the app uses the server client (src/lib/auth.ts).
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
