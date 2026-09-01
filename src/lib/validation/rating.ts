import { z } from "zod";

import { MAX_REVIEW_TEXT_LENGTH } from "@/config/site";

export const submitRatingSchema = z
  .object({
    venueId: z.uuid(),
    stars: z.number().int().min(1).max(5),
    reviewText: z
      .string()
      .trim()
      .max(MAX_REVIEW_TEXT_LENGTH)
      .nullable()
      .optional()
      .transform((value) => (value ? value : null)),
  })
  .strict();

export type SubmitRatingInput = z.infer<typeof submitRatingSchema>;

export const deleteRatingSchema = z
  .object({
    venueId: z.uuid(),
  })
  .strict();

export const removeRatingSchema = z
  .object({
    ratingId: z.uuid(),
    reason: z.string().trim().max(200).optional(),
  })
  .strict();

export const resolveVenuePhotoSchema = z
  .object({
    photoId: z.uuid(),
    action: z.enum(["approve", "reject"]),
  })
  .strict();
