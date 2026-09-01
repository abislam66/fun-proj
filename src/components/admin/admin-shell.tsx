"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { signOutAdmin } from "@/actions/auth";
import { Wordmark } from "@/components/ui/primitives";

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await signOutAdmin();
    router.push("/admin/sign-in");
    router.refresh();
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div className="admin-brand">
          <Wordmark />
          <span className="admin-brand-divider" aria-hidden="true" />
          <span>Admin</span>
        </div>
        <div className="admin-header-actions">
          <Link className="admin-public-link" href="/">
            View public site
          </Link>
          <button className="admin-public-link" onClick={signOut} type="button">
            Sign out
          </button>
        </div>
      </header>

      <nav className="admin-nav" aria-label="Admin navigation">
        <Link
          aria-current={pathname === "/admin" ? "page" : undefined}
          className={pathname === "/admin" ? "is-active" : undefined}
          href="/admin"
        >
          Overview
        </Link>
        <Link
          aria-current={
            pathname.startsWith("/admin/venues") ? "page" : undefined
          }
          className={
            pathname.startsWith("/admin/venues") ? "is-active" : undefined
          }
          href="/admin#venues"
        >
          Venues
        </Link>
        <Link href="/admin#reports">Problem reports</Link>
        <Link href="/admin#photos">Photo queue</Link>
      </nav>

      <main className="admin-main">{children}</main>
    </div>
  );
}
