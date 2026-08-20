import type { Metadata } from "next";

import { SignInForm } from "@/components/admin/sign-in-form";

export const metadata: Metadata = {
  title: "Admin sign in",
};

export default function AdminSignInPage() {
  return <SignInForm />;
}
