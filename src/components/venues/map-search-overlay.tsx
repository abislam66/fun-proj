"use client";

import { FilterBar } from "@/components/venues/filter-bar";
import type { VenueFilters } from "@/lib/venues";

/**
 * Floating search+filters card over the map — the map-first landing's
 * replacement for the old always-visible list pane's search bar. Reuses
 * FilterBar as-is; only the placement (absolute, over the map) and the
 * placeholder copy are new.
 */
export function MapSearchOverlay({
  filters,
  onChange,
  onClear,
  active,
}: {
  filters: VenueFilters;
  onChange: (filters: VenueFilters) => void;
  onClear: () => void;
  active: boolean;
}) {
  return (
    <div className="map-search-overlay">
      <FilterBar
        active={active}
        filters={filters}
        onChange={onChange}
        onClear={onClear}
        searchPlaceholder="tueats.co"
      />
    </div>
  );
}
