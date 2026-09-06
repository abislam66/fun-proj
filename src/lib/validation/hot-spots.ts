import { z } from "zod";

import { HOT_SPOTS_MAX } from "@/config/site";

/**
 * Admin: the ordered venue ids for the Hot Spots This Week board. Empty
 * clears the board (home panel then shows its config fallback). The action
 * additionally checks every id is an existing published venue.
 */
export const updateHotSpotsSchema = z
  .object({
    venueIds: z
      .array(z.uuid())
      .max(HOT_SPOTS_MAX, `Pick at most ${HOT_SPOTS_MAX} venues.`)
      .refine((ids) => new Set(ids).size === ids.length, {
        message: "Each venue can appear only once on the board.",
      }),
  })
  .strict();

export type UpdateHotSpotsInput = z.infer<typeof updateHotSpotsSchema>;
