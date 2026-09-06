"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { signOutUser } from "@/actions/auth";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

export type HeaderSession = {
  displayName: string;
  initials: string;
};

function ProfileGlyph() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="22"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
      viewBox="0 0 24 24"
      width="22"
    >
      <circle cx="12" cy="12" r="9.25" />
      <circle cx="12" cy="9" r="2.6" />
      <path d="M7.2 17.4c.9-2.2 2.7-3.4 4.8-3.4s3.9 1.2 4.8 3.4" />
    </svg>
  );
}

/**
 * Top-right avatar + dropdown. No profile-photo field exists on `profiles`
 * (Specs/auth-security.md: no profile photos), so signed-in renders
 * initials-in-a-circle; signed-out reuses the old header's generic
 * ProfileGlyph. "About" lives here (not top-level nav) in both states.
 */
export function UserAvatar({ session }: { session: HeaderSession | null }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    function onClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onClickOutside);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function handleSignOut() {
    setOpen(false);
    await signOutUser();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="user-avatar" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={
          session ? `Account menu for ${session.displayName}` : "Account menu"
        }
        className="user-avatar-trigger"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {session ? (
          <span aria-hidden="true" className="user-avatar-initials">
            {session.initials}
          </span>
        ) : (
          <ProfileGlyph />
        )}
      </button>
      {open ? (
        <div className="user-avatar-menu" role="menu">
          {session ? (
            <>
              <Link
                className="user-avatar-menu-item"
                href="/account"
                onClick={() => setOpen(false)}
                role="menuitem"
              >
                My Account
              </Link>
              <Link
                className="user-avatar-menu-item"
                href="/about"
                onClick={() => setOpen(false)}
                role="menuitem"
              >
                About
              </Link>
              <button
                className="user-avatar-menu-item"
                onClick={() => void handleSignOut()}
                role="menuitem"
                type="button"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                className="user-avatar-menu-item"
                href="/about"
                onClick={() => setOpen(false)}
                role="menuitem"
              >
                About
              </Link>
              <div className="user-avatar-menu-item user-avatar-menu-signin">
                <GoogleSignInButton next="/" />
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
