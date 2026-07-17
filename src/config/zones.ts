/** Curated campus zones — venues store `zone_key`, not a FK. */
export const ZONES = {
  norris: {
    key: "norris",
    label: "Norris Street",
    description: "Food truck corridor along Norris Street (12th–13th).",
    sort: 1,
  },
  montgomery: {
    key: "montgomery",
    label: "Montgomery Avenue",
    description: "Food truck corridor along Montgomery Avenue (12th–13th).",
    sort: 2,
  },
  twelfth: {
    key: "twelfth",
    label: "12th Street",
    description: "The spur between Norris and Montgomery near 12th Street.",
    sort: 3,
  },
  other: {
    key: "other",
    label: "Elsewhere near campus",
    description: "Outliers near main campus (e.g. 11th Street).",
    sort: 99,
  },
} as const;

export type ZoneKey = keyof typeof ZONES;

export const ZONE_KEYS = Object.keys(ZONES) as ZoneKey[];
