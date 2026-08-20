import type { Metadata } from "next";

import { ResetPasswordForm } from "@/components/admin/reset-password-form";

export const metadata: Metadata = {
  title: "Reset password",
};

export default function AdminResetPasswordPage() {
  return <ResetPasswordForm />;
}
