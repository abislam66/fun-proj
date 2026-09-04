"use client";

import { useRouter } from "next/navigation";

import { signOutUser } from "@/actions/auth";
import { Button } from "@/components/ui/primitives";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await signOutUser();
    router.push("/");
    router.refresh();
  }

  return (
    <Button
      className="account-sign-out"
      onClick={() => void handleSignOut()}
      type="button"
      variant="secondary"
    >
      Sign out
    </Button>
  );
}
