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

/**
 * The map pin's short label: primary (first) cuisine wins; an untagged venue
 * still reads as food ("Food"). See DESIGN.md → Pins and public/pins/README.md.
 */
export function cuisinePinLabel(cuisines: readonly CuisineKey[]): string {
  const primary = cuisines[0];
  return primary ? CUISINES[primary].pinLabel : CUISINES.other.pinLabel;
}
