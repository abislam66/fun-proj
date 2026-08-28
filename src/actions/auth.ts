"use server";

import { createSupabaseServerClient } from "@/lib/auth";
import {
  adminSignInSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
} from "@/lib/validation";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function fail(error: unknown): ActionResult<never> {
  console.error("auth action failed:", error);

  if (error instanceof Error && error.message && error.message.trim()) {
    return { ok: false, error: error.message };
  }
  return { ok: false, error: "Something went wrong. Please try again." };
}

/**
 * Admin sign-in: email + password via Supabase Auth. This only
 * authenticates — it never grants admin access. `requireAdmin()` (checked
 * on every admin page/action) separately looks up the `profiles` row and
 * requires `role = "admin"` (Specs/auth-security.md:57).
 */
export async function signInAdmin(raw: unknown): Promise<ActionResult> {
  try {
    const { email, password } = adminSignInSchema.parse(raw);

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      throw new Error(error.message);
    }

    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}

export async function signOutAdmin(): Promise<ActionResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}

/** Regular-user (Google) sign-out — same underlying call as signOutAdmin, named for its own call site. */
export async function signOutUser(): Promise<ActionResult> {
  return signOutAdmin();
}

/**
 * Self-service "forgot password" — sends a Supabase recovery email pointed
 * at /admin/reset-password. Supabase itself never reveals whether the
 * address exists, so this always returns ok on a well-formed email.
 */
export async function requestPasswordReset(
  raw: unknown,
): Promise<ActionResult> {
  try {
    const { email } = requestPasswordResetSchema.parse(raw);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) {
      throw new Error("NEXT_PUBLIC_SITE_URL is required for auth redirects");
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/admin/reset-password`,
    });
    if (error) {
      throw new Error(error.message);
    }

    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}

/**
 * Sets a new password for whatever session is active. Only reachable with a
 * valid recovery session (established client-side on /admin/reset-password,
 * since Supabase puts recovery tokens in the URL fragment, which servers
 * never see) or an already-signed-in admin changing their own password.
 * Never touches `profiles.role` — authorization is untouched by this.
 */
export async function updateAdminPassword(raw: unknown): Promise<ActionResult> {
  try {
    const { password } = resetPasswordSchema.parse(raw);

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error(
        "Your recovery link has expired. Request a new one from the sign-in page.",
      );
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      throw new Error(error.message);
    }

    await supabase.auth.signOut();
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}
