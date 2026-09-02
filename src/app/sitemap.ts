import type { MetadataRoute } from "next";

import { getPublishedVenues } from "@/lib/db/queries";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const venues = await getPublishedVenues();

  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
    // getPublishedVenues() already filters to status "published" at the DB
    // level — draft/retired venues never reach this list.
    ...venues.map((venue): MetadataRoute.Sitemap[number] => ({
      url: `${SITE_URL}/eat/${venue.slug}`,
      changeFrequency: "weekly",
      priority: 0.6,
    })),
  ];
}
