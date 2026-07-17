import { notFound } from "next/navigation";

import { getVenueBySlug } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

/**
 * Data-only venue detail shell — UI agent owns presentation.
 * ISR + tag revalidation via getVenueBySlug cache tags.
 */
export default async function VenueDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const venue = await getVenueBySlug(slug);

  if (!venue) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-[40rem] px-md py-xl">
      <p className="text-micro text-ink-muted">Data shell · UI forthcoming</p>
      <h1 className="font-display text-title mt-sm">{venue.name}</h1>
      {venue.status === "retired" ? (
        <p className="mt-sm text-ink-secondary">Closed</p>
      ) : null}
      <p className="mt-md text-ink-secondary">
        {venue.description ?? "No description yet."}
      </p>
      <pre className="text-micro mt-xl overflow-auto text-ink-muted">
        {JSON.stringify(
          {
            slug: venue.slug,
            type: venue.type,
            zoneKey: venue.zoneKey,
            cuisines: venue.cuisines,
            hours: venue.hours,
            acceptsCash: venue.acceptsCash,
            acceptsCard: venue.acceptsCard,
            lastVerifiedAt: venue.lastVerifiedAt,
          },
          null,
          2,
        )}
      </pre>
    </main>
  );
}
