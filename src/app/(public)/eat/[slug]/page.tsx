import { notFound } from "next/navigation";

import { VenueDetail } from "@/components/venues/venue-detail";
import { getVenueBySlug } from "@/lib/db/queries";
import { getMockVenueBySlug } from "@/lib/venue-fixtures";
import type { Venue } from "@/lib/venues";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string }>;
};

export default async function VenueDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const fixture = getMockVenueBySlug(slug);
  const row = fixture ? null : await getVenueBySlug(slug);

  if (!fixture && !row) {
    notFound();
  }

  const venue: Venue = fixture ?? {
    id: row!.id,
    slug: row!.slug,
    type: row!.type,
    name: row!.name,
    description: row!.description,
    status: row!.status === "retired" ? "retired" : "published",
    zoneKey:
      row!.zoneKey === "norris" ||
      row!.zoneKey === "montgomery" ||
      row!.zoneKey === "twelfth" ||
      row!.zoneKey === "other"
        ? row!.zoneKey
        : null,
    location:
      [row!.building, row!.floor].filter(Boolean).join(" · ") ||
      "Near Temple Main Campus",
    building: row!.building,
    floor: row!.floor,
    lat: row!.lat,
    lng: row!.lng,
    acceptsCash: row!.acceptsCash,
    acceptsCard: row!.acceptsCard,
    cuisines: row!.cuisines.filter(
      (value): value is Venue["cuisines"][number] =>
        value === "american" ||
        value === "caribbean" ||
        value === "chinese" ||
        value === "fruit" ||
        value === "halal" ||
        value === "mexican" ||
        value === "other",
    ),
    hours: row!.hours,
    lastVerifiedAt: row!.lastVerifiedAt?.toISOString().slice(0, 10) ?? null,
  };
  const backPath =
    query.from?.startsWith("/") && !query.from.startsWith("//")
      ? query.from
      : "/";

  return <VenueDetail backPath={backPath} venue={venue} />;
}
