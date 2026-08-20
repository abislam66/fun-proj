import { z } from "zod";

/**
 * Admin email/password sign-in. Not domain-restricted — the admin role is
 * granted only via direct DB access (Specs/auth-security.md:57), so the
 * campus-email gate that applied to the old OTP flow doesn't apply here.
 */
export const adminSignInSchema = z
  .object({
    email: z.string().trim().toLowerCase().min(1, "Email is required."),
    password: z.string().min(1, "Password is required."),
  })
  .strict();

export type AdminSignInInput = z.infer<typeof adminSignInSchema>;

/** Self-service "forgot password" request — same non-enumerating behavior as Supabase's API. */
export const requestPasswordResetSchema = z
  .object({
    email: z.string().trim().toLowerCase().min(1, "Email is required."),
  })
  .strict();

export type RequestPasswordResetInput = z.infer<
  typeof requestPasswordResetSchema
>;

/** New password submitted from the recovery screen. */
export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters."),
  })
  .strict();

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
