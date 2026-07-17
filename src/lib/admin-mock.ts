import { CAMPUS_BOUNDS } from "@/config/site";
import type { CuisineKey } from "@/config/cuisines";
import type { ZoneKey } from "@/config/zones";
import { WEEKDAY_KEYS, type VenueHours } from "@/lib/hours";

export type MockVenueStatus = "draft" | "published" | "retired";
export type MockReportStatus = "open" | "actioned" | "dismissed";
export type MockPaymentValue = "yes" | "no" | "unknown";

export interface MockAdminVenue {
  id: string;
  slug: string;
  name: string;
  type: "truck" | "restaurant" | "cafe" | "vending";
  description: string;
  status: MockVenueStatus;
  lat: string;
  lng: string;
  zoneKey: ZoneKey | "";
  building: string;
  floor: string;
  acceptsCash: MockPaymentValue;
  acceptsCard: MockPaymentValue;
  cuisines: CuisineKey[];
  hoursKnown: boolean;
  hours: VenueHours;
  lastVerifiedAt: string | null;
  updatedAt: string;
}

export interface MockProblemReport {
  id: string;
  venueId: string;
  venueName: string;
  kind: "closed" | "moved" | "wrong_hours" | "other";
  note: string;
  status: MockReportStatus;
  createdAt: string;
}

export interface MockAdminState {
  venues: MockAdminVenue[];
  reports: MockProblemReport[];
}

export type VenueValidationErrors = Partial<
  Record<"name" | "lat" | "lng" | "zoneKey" | "cuisines" | "hours", string>
>;

const weekdayLunch: VenueHours = Object.fromEntries(
  WEEKDAY_KEYS.slice(0, 5).map((day) => [
    day,
    [{ open: "10:30", close: "18:00" }],
  ]),
);

export const EMPTY_MOCK_VENUE: MockAdminVenue = {
  id: "",
  slug: "",
  name: "",
  type: "truck",
  description: "",
  status: "draft",
  lat: "39.9818",
  lng: "-75.1546",
  zoneKey: "",
  building: "",
  floor: "",
  acceptsCash: "unknown",
  acceptsCard: "unknown",
  cuisines: [],
  hoursKnown: false,
  hours: {},
  lastVerifiedAt: null,
  updatedAt: "Not saved",
};

export const INITIAL_ADMIN_STATE: MockAdminState = {
  venues: [
    {
      ...EMPTY_MOCK_VENUE,
      id: "venue-cherry-cart",
      slug: "cherry-cart",
      name: "Cherry Cart",
      description: "Griddled sandwiches, loaded fries, and weekday lunch.",
      status: "published",
      zoneKey: "norris",
      cuisines: ["american"],
      acceptsCash: "yes",
      acceptsCard: "yes",
      hoursKnown: true,
      hours: weekdayLunch,
      lastVerifiedAt: "2026-07-12T14:20:00.000Z",
      updatedAt: "Jul 12, 2026",
    },
    {
      ...EMPTY_MOCK_VENUE,
      id: "venue-compass-kitchen",
      slug: "compass-kitchen",
      name: "Compass Kitchen",
      description: "Rice platters, falafel, and warm pita.",
      status: "published",
      lat: "39.9824",
      lng: "-75.1551",
      zoneKey: "montgomery",
      cuisines: ["halal"],
      acceptsCash: "yes",
      acceptsCard: "yes",
      hoursKnown: true,
      hours: weekdayLunch,
      lastVerifiedAt: "2026-07-08T16:10:00.000Z",
      updatedAt: "Jul 8, 2026",
    },
    {
      ...EMPTY_MOCK_VENUE,
      id: "venue-island-bowl",
      slug: "island-bowl",
      name: "Island Bowl",
      status: "draft",
      lat: "39.9815",
      lng: "-75.1539",
      zoneKey: "norris",
      cuisines: ["caribbean"],
      acceptsCard: "yes",
      updatedAt: "Jul 16, 2026",
    },
    {
      ...EMPTY_MOCK_VENUE,
      id: "venue-old-lunch-counter",
      slug: "old-lunch-counter",
      name: "Old Lunch Counter",
      type: "restaurant",
      status: "retired",
      lat: "39.9802",
      lng: "-75.1564",
      zoneKey: "other",
      cuisines: ["american"],
      lastVerifiedAt: "2026-03-14T13:00:00.000Z",
      updatedAt: "Mar 14, 2026",
    },
  ],
  reports: [
    {
      id: "report-1",
      venueId: "venue-compass-kitchen",
      venueName: "Compass Kitchen",
      kind: "wrong_hours",
      note: "Closed before the posted 7 p.m. time on Thursday.",
      status: "open",
      createdAt: "Jul 17, 10:42 a.m.",
    },
    {
      id: "report-2",
      venueId: "venue-island-bowl",
      venueName: "Island Bowl",
      kind: "moved",
      note: "Truck was closer to 12th Street this week.",
      status: "open",
      createdAt: "Jul 16, 2:18 p.m.",
    },
    {
      id: "report-3",
      venueId: "venue-cherry-cart",
      venueName: "Cherry Cart",
      kind: "other",
      note: "Card reader was unavailable.",
      status: "actioned",
      createdAt: "Jul 14, 11:03 a.m.",
    },
  ],
};

export function slugifyMockVenue(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "untitled-venue"
  );
}

export function validateMockVenue(
  venue: MockAdminVenue,
  forPublish = false,
): VenueValidationErrors {
  const errors: VenueValidationErrors = {};
  const lat = Number(venue.lat);
  const lng = Number(venue.lng);

  if (!venue.name.trim()) errors.name = "Enter a venue name.";
  if (
    !Number.isFinite(lat) ||
    lat < CAMPUS_BOUNDS.south ||
    lat > CAMPUS_BOUNDS.north
  ) {
    errors.lat = `Use a latitude from ${CAMPUS_BOUNDS.south} to ${CAMPUS_BOUNDS.north}.`;
  }
  if (
    !Number.isFinite(lng) ||
    lng < CAMPUS_BOUNDS.west ||
    lng > CAMPUS_BOUNDS.east
  ) {
    errors.lng = `Use a longitude from ${CAMPUS_BOUNDS.west} to ${CAMPUS_BOUNDS.east}.`;
  }

  if (forPublish && !venue.zoneKey) {
    errors.zoneKey = "Choose a zone before publishing.";
  }
  if (forPublish && venue.cuisines.length === 0) {
    errors.cuisines = "Choose at least one cuisine before publishing.";
  }
  if (venue.hoursKnown) {
    const hasInvalidRange = Object.values(venue.hours).some((ranges) =>
      ranges?.some(
        ({ open, close }) =>
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(open) ||
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(close) ||
          open === close,
      ),
    );
    if (hasInvalidRange) {
      errors.hours = "Each open and close time must be valid and different.";
    }
  }

  return errors;
}

export function hasValidationErrors(errors: VenueValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function saveMockVenue(
  state: MockAdminState,
  draft: MockAdminVenue,
  now = new Date(),
): { state: MockAdminState; venue: MockAdminVenue } {
  const isNew = !draft.id;
  const id = isNew ? `venue-${now.getTime()}` : draft.id;
  const baseSlug = slugifyMockVenue(draft.name);
  const slug =
    draft.slug ||
    uniqueMockSlug(
      baseSlug,
      state.venues.filter((venue) => venue.id !== id).map((venue) => venue.slug),
    );
  const venue = {
    ...draft,
    id,
    slug,
    updatedAt: now.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  };

  return {
    state: {
      ...state,
      venues: isNew
        ? [venue, ...state.venues]
        : state.venues.map((item) => (item.id === id ? venue : item)),
    },
    venue,
  };
}

function uniqueMockSlug(base: string, taken: string[]): string {
  if (!taken.includes(base)) return base;
  let suffix = 2;
  while (taken.includes(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

export function setMockVenueStatus(
  state: MockAdminState,
  venueId: string,
  status: MockVenueStatus,
): MockAdminState {
  return {
    ...state,
    venues: state.venues.map((venue) =>
      venue.id === venueId ? { ...venue, status } : venue,
    ),
  };
}

export function verifyMockVenue(
  state: MockAdminState,
  venueId: string,
  now = new Date(),
): MockAdminState {
  return {
    ...state,
    venues: state.venues.map((venue) =>
      venue.id === venueId
        ? { ...venue, lastVerifiedAt: now.toISOString() }
        : venue,
    ),
  };
}

export function setMockReportStatus(
  state: MockAdminState,
  reportId: string,
  status: MockReportStatus,
): MockAdminState {
  return {
    ...state,
    reports: state.reports.map((report) =>
      report.id === reportId ? { ...report, status } : report,
    ),
  };
}
