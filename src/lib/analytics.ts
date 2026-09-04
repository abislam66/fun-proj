/**
 * Names for TuEats' hand-instrumented PostHog events — one source of truth
 * so a typo doesn't silently split an event in two. See the table in
 * Context/decisions.md (2026-09-04) for what each one fires on and why.
 *
 * These sit alongside PostHog's own autocapture (`$autocapture`,
 * `$pageview`, …) — the events here exist either because autocapture
 * structurally can't see the interaction (MapLibre renders venue pins to a
 * `<canvas>`, not DOM) or because the raw click doesn't carry the
 * resulting app state (which filter turned on, how many results, which
 * venue).
 *
 * Every call site passes only structured properties (ids, enum keys,
 * booleans, counts) — never free text a person typed. `search performed`
 * in particular sends `query_length`, never the query string itself.
 */
export const AnalyticsEvent = {
  VenueSelected: "venue selected",
  ZoneSelected: "zone selected",
  FilterApplied: "filter applied",
  FiltersCleared: "filters cleared",
  SearchPerformed: "search performed",
  SignInGateShown: "sign in gate shown",
  SignInClicked: "sign in clicked",
  RatingSubmitted: "rating submitted",
  RatingRemoved: "rating removed",
  PhotoSubmitted: "photo submitted",
  ProblemReported: "problem reported",
  VenueDetailViewed: "venue detail viewed",
} as const;
