import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/auth";
import { buildCallbackRedirectUrl } from "@/lib/auth-callback";
import { ensureMemberProfile } from "@/lib/member-profile";
import { safeInternalPath } from "@/lib/safe-path";

/**
 * Google OAuth lands here after Supabase's own hosted callback finishes the
 * code exchange handshake. This is the one deliberate exception to "no
 * custom route handlers" (Context/decisions.md) — OAuth's redirect-based
 * flow has no server-action equivalent, unlike admin's password auth.
 *
 * Both failure modes below (the provider itself rejecting the attempt, or
 * the code exchange failing) used to redirect back to `next` in total
 * silence — no session, no error, nothing telling the user or an admin
 * reading logs what happened. Logged detail is error code/message only,
 * never the `code` param or any token (Specs/auth-security.md).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error");
  const next = safeInternalPath(url.searchParams.get("next"));

  let authFailed = false;

  if (oauthError) {
    // Google/Supabase rejected the attempt before issuing a code — most
    // often the user just declined consent (`access_denied`).
    console.error(
      "auth callback: provider returned an error",
      oauthError,
      url.searchParams.get("error_description"),
    );
    authFailed = true;
  } else if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error(
        "auth callback: exchangeCodeForSession failed",
        error.code,
        error.status,
        error.message,
      );
      authFailed = true;
    } else if (data.user) {
      await ensureMemberProfile(data.user);
    }
  }

  return NextResponse.redirect(
    buildCallbackRedirectUrl(url.origin, next, authFailed),
  );
}
