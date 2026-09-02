import type { MetadataRoute } from "next";

import { getPublishedVenues } from "@/lib/db/queries";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Needs a live DB read (getPublishedVenues) — force-dynamic defers that to
// request time instead of build time, same pattern as /eat/[slug]/page.tsx.
// Without this, `next build` tries to prerender /sitemap.xml statically
// and fails wherever a real DB isn't reachable at build time (e.g. CI,
// which deliberately points DATABASE_URL at a non-existent local address).
export const dynamic = "force-dynamic";

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
