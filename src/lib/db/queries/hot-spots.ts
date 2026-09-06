import { unstable_cache } from "next/cache";
import { asc } from "drizzle-orm";

import { db } from "@/lib/db";
import { hotSpots, type HotSpotRow } from "@/lib/db/schema";

/**
 * The admin-curated "Hot Spots This Week" board, ordered by position.
 * Event-driven cache (tag `hot-spots`) invalidated only by the admin
 * `updateHotSpots` write — there is no TTL. An empty table is a valid
 * state: the home panel falls back to its config default when this is
 * empty (see `HotSpotsPanel`).
 */
async function fetchHotSpots(): Promise<HotSpotRow[]> {
  return db.select().from(hotSpots).orderBy(asc(hotSpots.position));
}

export function getHotSpots(): Promise<HotSpotRow[]> {
  return unstable_cache(fetchHotSpots, ["hot-spots"], {
    tags: ["hot-spots"],
  })();
}

/** Ordered venue ids for the board — the shape the public panel consumes. */
export async function getHotSpotVenueIds(): Promise<string[]> {
  const rows = await getHotSpots();
  return rows.map((row) => row.venueId);
}

/**
 * Admin: replace the whole board in one transaction. `venueIds` is the
 * ordered list (index 0 → position 1); an empty array clears the board.
 * Callers validate that every id is an existing published venue first.
 */
export async function replaceHotSpots(venueIds: string[]): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(hotSpots);
    if (venueIds.length === 0) return;
    await tx.insert(hotSpots).values(
      venueIds.map((venueId, index) => ({
        position: index + 1,
        venueId,
        updatedAt: new Date(),
      })),
    );
  });
}
