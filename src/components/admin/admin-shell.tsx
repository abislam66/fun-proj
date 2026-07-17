"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Wordmark } from "@/components/ui/primitives";

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div className="admin-brand">
          <Wordmark />
          <span className="admin-brand-divider" aria-hidden="true" />
          <span>Admin</span>
        </div>
        <div className="admin-header-actions">
          <span className="mock-badge">Mock workspace</span>
          <Link className="admin-public-link" href="/">
            View public site
          </Link>
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
      </nav>

      <main className="admin-main">{children}</main>
    </div>
  );
}
