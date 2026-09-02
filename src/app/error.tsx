"use client";

import Link from "next/link";
import { useEffect } from "react";

import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/primitives";

/**
 * Root error boundary for every public route. Never shows the raw
 * Next.js crash screen or any internal error detail — `error.message`/
 * `error.stack` are deliberately never rendered, only logged server-side
 * via the digest Next.js already redacts client-visible detail behind.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled route error:", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="public-page">
      <SiteHeader />
      <main className="detail-page">
        <div className="empty-state">
          <span aria-hidden="true" className="empty-state-mark">
            !
          </span>
          <h2>Something went wrong</h2>
          <p>
            This page hit a snag loading. It&rsquo;s not you — try again, or
            head back home.
          </p>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button onClick={() => reset()} type="button">
              Try again
            </Button>
            <Link className="button button-secondary" href="/">
              Go home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
