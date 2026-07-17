import type { Metadata } from "next";

import { MockSignIn } from "@/components/admin/mock-sign-in";

export const metadata: Metadata = {
  title: "Admin sign in",
};

export default function AdminSignInPage() {
  return <MockSignIn />;
}
