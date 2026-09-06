import { z } from "zod";

export const submitVenueVoteSchema = z
  .object({
    venueId: z.uuid(),
    value: z.union([z.literal(1), z.literal(-1)]),
  })
  .strict();

export type SubmitVenueVoteInput = z.infer<typeof submitVenueVoteSchema>;
