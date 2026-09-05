/**
 * Curated cuisine tag vocabulary — venues store values as text[].
 *
 * `cafe` is deliberately independent from `venue.type === "cafe"` (the
 * public "Café" chip / `VenueFilters.isCafe`) — a venue's Type and its
 * cuisine tags are separate concepts, so a truck or restaurant can carry
 * the "Cafe" cuisine tag without its Type being Cafe, and vice versa. See
 * Context/decisions.md 2026-09-04 for why this went back and forth
 * (added in PR #17, reverted the same day, restored by explicit request).
 */
export const CUISINES = {
  american: { key: "american", label: "American", pinLabel: "Amer" },
  cafe: { key: "cafe", label: "Cafe", pinLabel: "Cafe" },
  caribbean: { key: "caribbean", label: "Caribbean", pinLabel: "Carib" },
  chinese: { key: "chinese", label: "Chinese", pinLabel: "Chin" },
  fruit: { key: "fruit", label: "Fruit & smoothies", pinLabel: "Fruit" },
  halal: { key: "halal", label: "Halal", pinLabel: "Halal" },
  indian: { key: "indian", label: "Indian", pinLabel: "Indian" },
  japanese: { key: "japanese", label: "Japanese", pinLabel: "Japan" },
  korean: { key: "korean", label: "Korean", pinLabel: "Korean" },
  mediterranean: {
    key: "mediterranean",
    label: "Mediterranean",
    pinLabel: "Med",
  },
  mexican: { key: "mexican", label: "Mexican", pinLabel: "Mex" },
  pizza: { key: "pizza", label: "Pizza", pinLabel: "Pizza" },
  turkish: { key: "turkish", label: "Turkish", pinLabel: "Turk" },
  vietnamese: { key: "vietnamese", label: "Vietnamese", pinLabel: "Viet" },
  other: { key: "other", label: "Other", pinLabel: "Food" },
} as const;

export type CuisineKey = keyof typeof CUISINES;

export const CUISINE_KEYS = Object.keys(CUISINES) as CuisineKey[];
