"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function HeaderNav() {
  const pathname = usePathname();
  const onAccount = pathname === "/account";
  const onAbout = pathname === "/about";

  return (
    <nav aria-label="Primary navigation">
      <Link aria-current={onAbout ? "page" : undefined} href="/about">
        About
      </Link>
      <Link
        aria-current={onAccount ? "page" : undefined}
        aria-label="Your account"
        className="header-profile"
        href="/account"
        title="Your account"
      >
        <ProfileGlyph />
      </Link>
    </nav>
  );
}

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
