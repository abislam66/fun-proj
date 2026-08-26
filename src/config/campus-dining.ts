/**
 * Meal-plan dining halls TuEats deliberately does not cover
 * (`Specs/overview.md` scopes the product to off-meal-plan food). Each
 * building still gets one neutral info pin on the map so a hungry student
 * isn't left wondering why the big food buildings look empty — the pin
 * just names what's there.
 *
 * Static config, not venues: these never enter the database, have no
 * detail pages, hours, or reviews, and are not tappable on the map.
 * Coordinates are the curated footprint centroids from
 * `public/maps/campus-buildings.geojson` (Morgan sits between the North
 * and South towers, where the dining floor actually is).
 */

export type CampusDiningMarker = {
  id: string;
  label: string;
  lng: number;
  lat: number;
};

export const CAMPUS_DINING_MARKERS: CampusDiningMarker[] = [
  {
    id: "student-center-food-court",
    label: "Student Center Food Court",
    lng: -75.154964,
    lat: 39.979361,
  },
  {
    id: "jh-dining-hall",
    label: "J&H Dining Hall",
    lng: -75.155856,
    lat: 39.984044,
  },
  {
    id: "morgan-food-court",
    label: "Morgan Hall Food Court",
    lng: -75.157413,
    lat: 39.977877,
  },
];
