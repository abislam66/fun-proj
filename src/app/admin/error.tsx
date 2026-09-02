"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Admin-scoped error boundary — overrides the public one (src/app/error.tsx)
 * for everything under /admin so a crash there doesn't show the public
 * Y2K-styled page inside the admin dashboard's own, plainer design system.
 * Styled to match AdminAccessDenied's existing signin-card pattern.
 */
export default function AdminErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled admin error:", error.digest ?? error.message);
  }, [error]);

  return (
    <main className="admin-signin">
      <section className="signin-card">
        <p className="eyebrow">Admin</p>
        <h1>Something went wrong</h1>
        <p>
          This page hit a snag loading. Try again, or head back to the venue
          list.
        </p>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.5rem" }}>
          <button
            className="button button-primary"
            onClick={() => reset()}
            type="button"
          >
            Try again
          </button>
          <Link className="button button-secondary" href="/admin">
            Venue list
          </Link>
        </div>
      </section>
    </main>
  );
}
