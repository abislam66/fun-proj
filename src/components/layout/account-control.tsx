"use client";

import { useRouter } from "next/navigation";

import { signOutUser } from "@/actions/auth";

export function AccountControl({ displayName }: { displayName: string }) {
  const router = useRouter();

  async function handleSignOut() {
    await signOutUser();
    router.push("/");
    router.refresh();
  }

  return (
    <span className="account-control">
      <span className="account-name">{displayName}</span>
      <button
        className="text-link account-sign-out"
        onClick={handleSignOut}
        type="button"
      >
        Sign out
      </button>
    </span>
  );
}
