import { SiteHeader } from "@/components/layout/site-header";

export default function Loading() {
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
