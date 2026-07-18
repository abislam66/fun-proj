import { z } from "zod";

import { CUISINE_KEYS } from "@/config/cuisines";
import {
  CAMPUS_COORDINATE_BOUNDS,
  MAX_PROBLEM_NOTE_LENGTH,
  MAX_VENUE_DESCRIPTION_LENGTH,
  MAX_VENUE_NAME_LENGTH,
} from "@/config/site";
import { ZONE_KEYS } from "@/config/zones";
import { WEEKDAY_KEYS } from "@/lib/hours";

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Expected HH:mm wall-clock time");

const hoursRangeSchema = z
  .object({
    open: timeSchema,
    close: timeSchema,
  })
  .strict();

export const venueHoursSchema = z
  .partialRecord(z.enum(WEEKDAY_KEYS), z.array(hoursRangeSchema).max(4))
  .nullable();

export const venueTypeSchema = z.enum([
  "truck",
  "restaurant",
  "cafe",
  "vending",
]);

export const venueStatusSchema = z.enum(["draft", "published", "retired"]);

export const venueInputSchema = z
  .object({
    id: z.uuid().optional(),
    name: z.string().trim().min(1).max(MAX_VENUE_NAME_LENGTH),
    type: venueTypeSchema.default("truck"),
    description: z
      .string()
      .trim()
      .max(MAX_VENUE_DESCRIPTION_LENGTH)
      .nullable()
      .optional(),
    lat: z
      .number()
      .min(CAMPUS_COORDINATE_BOUNDS.south)
      .max(CAMPUS_COORDINATE_BOUNDS.north),
    lng: z
      .number()
      .min(CAMPUS_COORDINATE_BOUNDS.west)
      .max(CAMPUS_COORDINATE_BOUNDS.east),
    zoneKey: z.enum(ZONE_KEYS).nullable().optional(),
    building: z.string().trim().max(120).nullable().optional(),
    floor: z.string().trim().max(40).nullable().optional(),
    acceptsCash: z.boolean().nullable().optional(),
    acceptsCard: z.boolean().nullable().optional(),
    cuisines: z.array(z.enum(CUISINE_KEYS)).max(8).default([]),
    hours: venueHoursSchema.optional(),
  })
  .strict();

export type VenueInput = z.infer<typeof venueInputSchema>;

export const publishVenueSchema = z
  .object({
    id: z.uuid(),
  })
  .strict();

export const venueIdSchema = z
  .object({
    id: z.uuid(),
  })
  .strict();

export const problemKindSchema = z.enum([
  "closed",
  "moved",
  "wrong_hours",
  "other",
]);

export const reportProblemSchema = z
  .object({
    venueId: z.uuid(),
    kind: problemKindSchema,
    note: z.string().trim().max(MAX_PROBLEM_NOTE_LENGTH).optional().nullable(),
    /** Honeypot — must be empty. Bots fill it; humans leave it blank. */
    website: z.string().max(0).optional().default(""),
  })
  .strict();

export type ReportProblemInput = z.infer<typeof reportProblemSchema>;

export const resolveProblemReportSchema = z
  .object({
    id: z.uuid(),
    status: z.enum(["dismissed", "actioned"]),
  })
  .strict();
