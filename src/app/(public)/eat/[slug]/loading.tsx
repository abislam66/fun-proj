import { SiteHeader } from "@/components/layout/site-header";

export default function VenueLoading() {
  return (
    <div className="public-page">
      <SiteHeader />
      <main className="detail-page">
        <p aria-live="polite" className="page-loading" role="status">
          Loading…
        </p>
      </main>
    </div>
  );
}
