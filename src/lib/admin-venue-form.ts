import { CAMPUS_BOUNDS } from "@/config/site";
import type { CuisineKey } from "@/config/cuisines";
import type { ZoneKey } from "@/config/zones";
import type { VenueRow } from "@/lib/db/schema";
import type { VenueHours } from "@/lib/hours";
import type { VenueInput } from "@/lib/validation";

export type VenueType =
  | "truck"
  | "restaurant"
  | "cafe"
  | "vending"
  | "convenience";
export type VenueStatusValue = "draft" | "published" | "retired";
export type PaymentTriState = "yes" | "no" | "unknown";

/** Form-friendly shape for the admin venue editor — bridges the UI to VenueInput/VenueRow. */
export interface VenueDraft {
  id: string;
  slug: string;
  name: string;
  type: VenueType;
  description: string;
  imageUrl: string | null;
  status: VenueStatusValue;
  lat: string;
  lng: string;
  zoneKey: ZoneKey | "";
  building: string;
  floor: string;
  acceptsCash: PaymentTriState;
  acceptsCard: PaymentTriState;
  cuisines: CuisineKey[];
  hoursKnown: boolean;
  hours: VenueHours;
  lastVerifiedAt: string | null;
  updatedAt: string | null;
}

export type VenueDraftErrors = Partial<
  Record<"name" | "lat" | "lng" | "zoneKey" | "cuisines" | "hours", string>
>;

export const EMPTY_VENUE_DRAFT: VenueDraft = {
  id: "",
  slug: "",
  name: "",
  type: "truck",
  description: "",
  imageUrl: null,
  status: "draft",
  lat: CAMPUS_BOUNDS.south.toFixed(4),
  lng: CAMPUS_BOUNDS.west.toFixed(4),
  zoneKey: "",
  building: "",
  floor: "",
  acceptsCash: "unknown",
  acceptsCard: "unknown",
  cuisines: [],
  hoursKnown: false,
  hours: {},
  lastVerifiedAt: null,
  updatedAt: null,
};

function paymentToTriState(value: boolean | null): PaymentTriState {
  if (value === true) return "yes";
  if (value === false) return "no";
  return "unknown";
}

function triStateToPayment(value: PaymentTriState): boolean | null {
  if (value === "yes") return true;
  if (value === "no") return false;
  return null;
}

export function toDraft(
  row: VenueRow,
  adminPhotoUrl: string | null = null,
): VenueDraft {
  const hours = (row.hours as VenueHours | null) ?? {};
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    type: row.type,
    description: row.description ?? "",
    imageUrl: adminPhotoUrl,
    status: row.status,
    lat: String(row.lat),
    lng: String(row.lng),
    zoneKey: (row.zoneKey as ZoneKey | null) ?? "",
    building: row.building ?? "",
    floor: row.floor ?? "",
    acceptsCash: paymentToTriState(row.acceptsCash),
    acceptsCard: paymentToTriState(row.acceptsCard),
    cuisines: row.cuisines as CuisineKey[],
    hoursKnown: Object.keys(hours).length > 0,
    hours,
    lastVerifiedAt: row.lastVerifiedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Raw payload for the upsertVenue server action — validated again server-side by venueInputSchema. */
export function fromDraft(draft: VenueDraft): Record<string, unknown> {
  const payload: Partial<VenueInput> & Record<string, unknown> = {
    name: draft.name.trim(),
    type: draft.type,
    description: draft.description.trim() || null,
    lat: Number(draft.lat),
    lng: Number(draft.lng),
    zoneKey: draft.zoneKey || null,
    building: draft.building.trim() || null,
    floor: draft.floor.trim() || null,
    acceptsCash: triStateToPayment(draft.acceptsCash),
    acceptsCard: triStateToPayment(draft.acceptsCard),
    cuisines: draft.cuisines,
    hours: draft.hoursKnown ? draft.hours : null,
  };
  if (draft.id) {
    payload.id = draft.id;
  }
  return payload;
}

export function validateVenueDraft(
  draft: VenueDraft,
  forPublish = false,
): VenueDraftErrors {
  const errors: VenueDraftErrors = {};
  const lat = Number(draft.lat);
  const lng = Number(draft.lng);

  if (!draft.name.trim()) errors.name = "Enter a venue name.";
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
  if (forPublish && !draft.zoneKey) {
    errors.zoneKey = "Choose a zone before publishing.";
  }
  if (forPublish && draft.cuisines.length === 0) {
    errors.cuisines = "Choose at least one cuisine before publishing.";
  }
  if (draft.hoursKnown) {
    const hasInvalidRange = Object.values(draft.hours).some((ranges) =>
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

export function hasValidationErrors(errors: VenueDraftErrors): boolean {
  return Object.keys(errors).length > 0;
}
