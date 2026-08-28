import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/auth";
import { ensureMemberProfile } from "@/lib/member-profile";
import { safeInternalPath } from "@/lib/safe-path";

/**
 * Google OAuth lands here after Supabase's own hosted callback finishes the
 * code exchange handshake. This is the one deliberate exception to "no
 * custom route handlers" (Context/decisions.md) — OAuth's redirect-based
 * flow has no server-action equivalent, unlike admin's password auth.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeInternalPath(url.searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      await ensureMemberProfile(data.user);
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
