"use client";

import { useState } from "react";

import { Button } from "@/components/ui/primitives";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

/**
 * `next` must be a same-origin path (validated again server-side by
 * /auth/callback) — never pass a full URL here.
 */
export function GoogleSignInButton({ next }: { next: string }) {
  const [pending, setPending] = useState(false);

  async function signIn() {
    setPending(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    // The browser navigates away to Google next — no need to reset `pending`.
  }

  return (
    <Button disabled={pending} onClick={signIn} type="button">
      {pending ? "Redirecting…" : "Continue with Google"}
    </Button>
  );
}
