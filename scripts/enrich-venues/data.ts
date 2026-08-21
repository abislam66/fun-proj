/**
 * Hand-merged research output for the venue enrichment backfill.
 * Keyed by slug (stable). Only fields present here get touched by
 * apply.ts — cuisines fully replace the venue's current set, hours
 * fully replace (null = "Posted hours are known" left unchecked, i.e.
 * "Hours unknown" — never a guess), type only reclassifies away from
 * the seed script's hardcoded "truck" default when explicitly set.
 *
 * hours are local Philadelphia wall-clock, one range/day (the admin
 * form's own constraint), only for days the source confirms as open.
 */
import type { CuisineKey } from "../../src/config/cuisines";
import type { VenueHours } from "../../src/lib/hours";
import type { VenueType } from "../../src/lib/admin-venue-form";

export type VenueEnrichment = {
  slug: string;
  type?: VenueType;
  cuisines: CuisineKey[];
  hours: VenueHours | null;
  note?: string;
};

export const ENRICHMENT: VenueEnrichment[] = [
  // --- Batch A (chains) ---
  {
    slug: "asia-bite",
    cuisines: ["chinese"],
    hours: {
      mon: [{ open: "11:30", close: "22:30" }],
      tue: [{ open: "11:30", close: "22:30" }],
      wed: [{ open: "11:30", close: "22:30" }],
      thu: [{ open: "11:30", close: "22:30" }],
      fri: [{ open: "11:30", close: "23:00" }],
      sat: [{ open: "11:30", close: "23:00" }],
    },
  },
  {
    slug: "brunch-brothers",
    cuisines: ["american"],
    hours: {
      mon: [{ open: "06:00", close: "17:00" }],
      tue: [{ open: "06:00", close: "17:00" }],
      wed: [{ open: "06:00", close: "17:00" }],
      thu: [{ open: "06:00", close: "17:00" }],
      fri: [{ open: "06:00", close: "17:00" }],
      sat: [{ open: "06:00", close: "17:00" }],
      sun: [{ open: "08:00", close: "15:00" }],
    },
  },
  {
    slug: "burgerfi",
    cuisines: ["american"],
    hours: {
      mon: [{ open: "11:00", close: "20:00" }],
      tue: [{ open: "11:00", close: "20:00" }],
      wed: [{ open: "11:00", close: "20:00" }],
      thu: [{ open: "11:00", close: "20:00" }],
      fri: [{ open: "11:00", close: "20:00" }],
      sat: [{ open: "11:30", close: "17:30" }],
      sun: [{ open: "11:30", close: "17:30" }],
    },
  },
  {
    slug: "cava",
    cuisines: ["mediterranean"],
    hours: {
      mon: [{ open: "10:30", close: "22:00" }],
      tue: [{ open: "10:30", close: "22:00" }],
      wed: [{ open: "10:30", close: "22:00" }],
      thu: [{ open: "10:30", close: "22:00" }],
      fri: [{ open: "10:30", close: "22:00" }],
      sat: [{ open: "10:30", close: "22:00" }],
      sun: [{ open: "10:30", close: "22:00" }],
    },
  },
  {
    slug: "champs-diner",
    cuisines: ["american"],
    hours: {
      mon: [{ open: "06:30", close: "14:00" }],
      wed: [{ open: "06:30", close: "14:00" }],
      thu: [{ open: "06:30", close: "14:00" }],
      fri: [{ open: "06:30", close: "14:00" }],
      sat: [{ open: "06:30", close: "14:30" }],
      sun: [{ open: "06:30", close: "14:30" }],
    },
  },
  {
    slug: "chick-fil-a",
    cuisines: ["american"],
    hours: {
      mon: [{ open: "11:00", close: "20:00" }],
      tue: [{ open: "11:00", close: "20:00" }],
      wed: [{ open: "11:00", close: "20:00" }],
      thu: [{ open: "11:00", close: "20:00" }],
      fri: [{ open: "11:00", close: "20:00" }],
      sat: [{ open: "11:30", close: "17:30" }],
    },
    note: "Temple Dining's own Fall 2025 hours PDF; conflicts with chick-fil-a.com's generic store page (11-4 Mon-Fri, closed weekends) — likely a different/stale listing, but worth a human check",
  },
  {
    slug: "city-view-pizza-and-grill",
    cuisines: ["pizza", "american"],
    hours: null, // only a single unverified Yelp-derived summary — held back
  },
  {
    slug: "columbia-diner",
    cuisines: ["american"],
    hours: null, // MenuPix and Yelp give conflicting daily hours
  },
  {
    slug: "honeygrow",
    cuisines: ["other"], // build-your-own stir-fry/salad fusion, no clean taxonomy fit
    hours: {
      mon: [{ open: "10:30", close: "22:00" }],
      tue: [{ open: "10:30", close: "22:00" }],
      wed: [{ open: "10:30", close: "22:00" }],
      thu: [{ open: "10:30", close: "22:00" }],
      fri: [{ open: "10:30", close: "22:00" }],
      sat: [{ open: "10:30", close: "22:00" }],
      sun: [{ open: "10:30", close: "22:00" }],
    },
  },
  {
    slug: "panda-express",
    cuisines: ["chinese"],
    hours: null, // hours already set — cuisine-only fill
  },
  {
    slug: "saladworks",
    cuisines: ["american"],
    hours: {
      mon: [{ open: "11:00", close: "20:00" }],
      tue: [{ open: "11:00", close: "20:00" }],
      wed: [{ open: "11:00", close: "20:00" }],
      thu: [{ open: "11:00", close: "20:00" }],
      fri: [{ open: "11:00", close: "20:00" }],
    },
  },
  {
    slug: "shing-tea-79",
    cuisines: ["other"], // Taiwanese bubble/boba tea, no tea category exists
    hours: null, // hours already set — cuisine-only fill
  },
  {
    slug: "tropical-smoothie-cafe",
    type: "cafe", // confirmed brick-and-mortar storefront, not a literal truck
    cuisines: ["fruit"],
    hours: {
      mon: [{ open: "07:00", close: "22:00" }],
      tue: [{ open: "07:00", close: "22:00" }],
      wed: [{ open: "07:00", close: "22:00" }],
      thu: [{ open: "07:00", close: "22:00" }],
      fri: [{ open: "07:00", close: "22:00" }],
      sat: [{ open: "08:00", close: "22:00" }],
      sun: [{ open: "08:00", close: "21:00" }],
    },
  },
  // --- Batch B (halal/ethnic cluster) ---
  {
    slug: "chop-chop",
    cuisines: ["vietnamese"],
    hours: {
      mon: [{ open: "11:00", close: "20:00" }],
      tue: [{ open: "11:00", close: "20:00" }],
      wed: [{ open: "11:00", close: "20:00" }],
      thu: [{ open: "11:00", close: "20:00" }],
      fri: [{ open: "11:00", close: "20:00" }],
    },
    note: "hours medium-confidence (Yelp aggregator, not directly fetched)",
  },
  {
    slug: "chopsticks-express",
    cuisines: ["chinese"],
    hours: {
      mon: [{ open: "10:30", close: "22:00" }],
      tue: [{ open: "10:30", close: "22:00" }],
      wed: [{ open: "10:30", close: "22:00" }],
      thu: [{ open: "10:30", close: "22:00" }],
      fri: [{ open: "10:30", close: "22:00" }],
      sat: [{ open: "10:30", close: "22:00" }],
      sun: [{ open: "10:30", close: "22:00" }],
    },
  },
  {
    slug: "e-and-e-gourmet-express",
    cuisines: ["american"],
    hours: null,
  },
  {
    slug: "eddies-pizza",
    cuisines: ["pizza", "american"],
    hours: null, // search-engine synthesis only, not a verified fetch — held back
  },
  {
    slug: "el-guaco-loco",
    cuisines: ["mexican"],
    hours: null,
  },
  {
    slug: "famous-halal-food",
    cuisines: ["halal"],
    hours: null,
  },
  {
    slug: "fancy-halal-grill",
    cuisines: ["halal"],
    hours: {
      mon: [{ open: "10:00", close: "22:00" }],
      tue: [{ open: "10:00", close: "22:00" }],
      wed: [{ open: "10:00", close: "22:00" }],
      thu: [{ open: "10:00", close: "22:00" }],
      fri: [{ open: "10:00", close: "00:00" }],
      sat: [{ open: "10:00", close: "00:00" }],
      sun: [{ open: "12:00", close: "22:00" }],
    },
  },
  {
    slug: "jamaican-ds",
    cuisines: ["caribbean"],
    hours: null,
    note: "possibly stale/closed listing near campus — worth a manual check",
  },
  {
    slug: "johnys-express",
    cuisines: ["chinese"],
    hours: {
      mon: [{ open: "11:00", close: "17:00" }],
      tue: [{ open: "11:00", close: "17:00" }],
      wed: [{ open: "11:00", close: "17:00" }],
      thu: [{ open: "11:00", close: "17:00" }],
      fri: [{ open: "11:00", close: "17:00" }],
    },
  },
  {
    slug: "korea-house",
    cuisines: ["korean"],
    hours: {
      mon: [{ open: "10:00", close: "18:30" }],
      tue: [{ open: "10:00", close: "18:30" }],
      wed: [{ open: "10:00", close: "18:30" }],
      thu: [{ open: "10:00", close: "18:30" }],
      fri: [{ open: "10:00", close: "18:30" }],
    },
    note: "confirmed as an actual food truck (delivery-platform listings), type stays truck",
  },
  {
    slug: "maple-star",
    cuisines: ["chinese", "japanese"],
    hours: {
      mon: [{ open: "12:00", close: "22:30" }],
      wed: [{ open: "12:00", close: "22:30" }],
      thu: [{ open: "12:00", close: "22:30" }],
      fri: [{ open: "12:00", close: "23:00" }],
      sat: [{ open: "12:00", close: "23:00" }],
      sun: [{ open: "12:30", close: "22:30" }],
    },
  },
  {
    slug: "samosa-deb",
    cuisines: ["indian"],
    hours: null,
  },
  {
    slug: "sunny-halal-food",
    cuisines: ["halal"],
    hours: null,
  },
  {
    slug: "temple-star-chinese-restaurant",
    cuisines: ["chinese"],
    hours: {
      tue: [{ open: "13:00", close: "00:00" }],
      wed: [{ open: "13:00", close: "00:00" }],
      thu: [{ open: "13:00", close: "00:00" }],
      fri: [{ open: "13:00", close: "01:00" }],
      sat: [{ open: "13:00", close: "01:00" }],
      sun: [{ open: "13:00", close: "00:00" }],
    },
  },
  // --- Batch C (Norris cluster + small trucks) ---
  // Pretzel Dough intentionally omitted — research couldn't confirm this
  // business exists near campus under this name; needs manual follow-up.
  // Squared2, Nanu's Hot Chicken, Top Bap omitted — researched hours came
  // back null (no reliable source) and cuisines were already correctly
  // set, so there's nothing to actually change for these three.
  {
    slug: "cha-cha",
    cuisines: ["korean", "japanese"],
    hours: {
      mon: [{ open: "09:00", close: "18:00" }],
      tue: [{ open: "09:00", close: "18:00" }],
      wed: [{ open: "09:00", close: "18:00" }],
      thu: [{ open: "09:00", close: "18:00" }],
      fri: [{ open: "09:00", close: "18:00" }],
    },
  },
  {
    slug: "dunkin",
    cuisines: ["american"],
    hours: null, // hours already set — cuisine-only fill
  },
  {
    slug: "eppys-truck",
    cuisines: ["american"],
    hours: null,
  },
  {
    slug: "ernies",
    cuisines: ["american"],
    hours: null,
  },
  {
    slug: "foot-long",
    cuisines: ["american"],
    hours: null,
  },
  {
    slug: "hanks-cafe",
    cuisines: ["chinese"], // closest fit for a Taiwanese-style snack/boba cafe
    hours: null, // only source was explicitly "summer hours" — held back
  },
  {
    slug: "honey",
    cuisines: ["korean"],
    hours: {
      mon: [{ open: "11:00", close: "16:00" }],
      tue: [{ open: "11:00", close: "16:00" }],
      wed: [{ open: "11:00", close: "16:00" }],
      thu: [{ open: "11:00", close: "16:00" }],
      fri: [{ open: "11:00", close: "16:00" }],
    },
  },
  {
    slug: "pinky-fresh-fruit-salad-and-smoothies",
    cuisines: ["fruit"],
    hours: {
      mon: [{ open: "08:00", close: "18:00" }],
      tue: [{ open: "08:00", close: "18:00" }],
      wed: [{ open: "08:00", close: "18:00" }],
      thu: [{ open: "08:00", close: "18:00" }],
      fri: [{ open: "08:00", close: "18:00" }],
      sat: [{ open: "09:00", close: "17:00" }],
      sun: [{ open: "09:00", close: "17:00" }],
    },
  },
  {
    slug: "richies-sandwich-shop",
    cuisines: ["american"],
    hours: null, // identity-inference caveat (may be a different nearby Richie's) — held back
  },
  {
    slug: "stellas",
    cuisines: ["american"],
    hours: null,
  },
  {
    slug: "the-artists-pallet-cafe",
    cuisines: ["american"],
    hours: null, // hours already set — cuisine-only fill
  },
  {
    slug: "the-crepe-truck",
    cuisines: ["other"],
    hours: null, // hours already set — cuisine-only fill
  },
  // --- Batch D (outliers) ---
  // Vegan Tree intentionally omitted — current Yelp (checked Apr 2026)
  // shows this business as CLOSED at both known locations; that's a
  // status/retirement question for a human admin, not a data-fill.
  {
    slug: "7-eleven",
    type: "convenience",
    cuisines: ["other"],
    hours: {
      mon: [{ open: "00:00", close: "23:59" }],
      tue: [{ open: "00:00", close: "23:59" }],
      wed: [{ open: "00:00", close: "23:59" }],
      thu: [{ open: "00:00", close: "23:59" }],
      fri: [{ open: "00:00", close: "23:59" }],
      sat: [{ open: "00:00", close: "23:59" }],
      sun: [{ open: "00:00", close: "23:59" }],
    },
  },
  {
    slug: "caribbean-feast", // "The Patty Wagon"
    cuisines: ["caribbean"],
    hours: {
      mon: [{ open: "11:00", close: "17:00" }],
      tue: [{ open: "11:00", close: "17:00" }],
      wed: [{ open: "11:00", close: "17:00" }],
      thu: [{ open: "11:00", close: "17:00" }],
      fri: [{ open: "11:00", close: "17:00" }],
    },
  },
  {
    slug: "uncle-ls-barbecue",
    cuisines: ["american"],
    hours: null, // only source is a 5-year-stale article — held back
  },
  {
    slug: "yummy-pho",
    type: "restaurant", // confirmed sit-down/takeout storefront, not a truck
    cuisines: ["vietnamese"],
    hours: {
      mon: [{ open: "10:30", close: "20:00" }],
      tue: [{ open: "10:30", close: "20:00" }],
      wed: [{ open: "10:30", close: "20:00" }],
      thu: [{ open: "10:30", close: "20:00" }],
      fri: [{ open: "10:30", close: "20:00" }],
      sat: [{ open: "10:30", close: "20:00" }],
    },
  },
  {
    slug: "zen-japanese-food-fast-at-temple-university",
    type: "restaurant", // confirmed fixed kiosk in the Student Center food court, not a truck
    cuisines: ["japanese"],
    hours: null, // real open-time discrepancy across sources (10:30 vs 11:00) — held back
  },
];
