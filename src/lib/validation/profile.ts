import { z } from "zod";

import {
  DISPLAY_NAME_PATTERN,
  GRADUATION_YEAR_MAX,
  GRADUATION_YEAR_MIN,
  MAX_DISPLAY_NAME_LENGTH,
  MAX_USERNAME_LENGTH,
  MIN_DISPLAY_NAME_LENGTH,
  MIN_USERNAME_LENGTH,
  USERNAME_PATTERN,
} from "@/config/site";
import { isReservedUsername } from "@/lib/username";

export const updateOwnProfileSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(MIN_DISPLAY_NAME_LENGTH)
      .max(MAX_DISPLAY_NAME_LENGTH)
      .regex(DISPLAY_NAME_PATTERN, "Use letters, numbers, and spaces only."),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .min(MIN_USERNAME_LENGTH)
      .max(MAX_USERNAME_LENGTH)
      .regex(
        USERNAME_PATTERN,
        "Usernames start with a letter and use lowercase letters, numbers, or underscore.",
      )
      .refine(
        (value) => !isReservedUsername(value),
        "That username is reserved.",
      ),
    graduationYear: z
      .number()
      .int()
      .min(GRADUATION_YEAR_MIN)
      .max(GRADUATION_YEAR_MAX)
      .nullable(),
  })
  .strict();

export type UpdateOwnProfileInput = z.infer<typeof updateOwnProfileSchema>;
