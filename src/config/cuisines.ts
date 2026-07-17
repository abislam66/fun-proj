/** Curated cuisine tag vocabulary — venues store values as text[]. */
export const CUISINES = {
  american: { key: "american", label: "American", pinLabel: "Amer" },
  caribbean: { key: "caribbean", label: "Caribbean", pinLabel: "Carib" },
  chinese: { key: "chinese", label: "Chinese", pinLabel: "Chin" },
  fruit: { key: "fruit", label: "Fruit & smoothies", pinLabel: "Fruit" },
  halal: { key: "halal", label: "Halal", pinLabel: "Halal" },
  mexican: { key: "mexican", label: "Mexican", pinLabel: "Mex" },
  other: { key: "other", label: "Other", pinLabel: "Food" },
} as const;

export type CuisineKey = keyof typeof CUISINES;

export const CUISINE_KEYS = Object.keys(CUISINES) as CuisineKey[];
