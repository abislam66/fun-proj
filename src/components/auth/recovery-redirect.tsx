"use client";

import { useEffect } from "react";

/**
 * Safety net: Supabase's dashboard-triggered "Send Password Recovery"
 * doesn't let you specify a redirect target — it always uses the project's
 * Site URL, which for us is the homepage. If recovery tokens land here
 * instead of /admin/reset-password, forward them there instead of silently
 * dropping them (a plain link is not enough — the tokens live in the URL
 * fragment, invisible to any server-side redirect).
 */
export function RecoveryRedirect() {
  useEffect(() => {
    if (
      window.location.pathname !== "/admin/reset-password" &&
      window.location.hash.includes("type=recovery")
    ) {
      window.location.replace("/admin/reset-password" + window.location.hash);
    }
  }, []);

  return null;
}
