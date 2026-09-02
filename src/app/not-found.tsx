import Link from "next/link";

import { SiteHeader } from "@/components/layout/site-header";

export default function NotFound() {
  return (
    <div className="public-page">
      <SiteHeader />
      <main className="detail-page">
        <div className="empty-state">
          <span aria-hidden="true" className="empty-state-mark">
            /
          </span>
          <h2>Page not found</h2>
          <p>
            That page doesn&rsquo;t exist, or the spot may have been retired.
          </p>
          <Link className="button button-primary" href="/">
            Back to the map
          </Link>
        </div>
      </main>
    </div>
  );
}
