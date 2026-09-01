"use client";

import dynamic from "next/dynamic";

import type { MapZoneKey } from "@/config/map-zones";
import type { Venue, VenueFilters } from "@/lib/venues";

function MapLoadingShell() {
  return (
    <div className="venue-map venue-map-shell" aria-label="Loading campus map">
      <div className="venue-map-loading" aria-live="polite">
        Loading campus map…
      </div>
    </div>
  );
}

const VenueMap = dynamic(
  () => import("@/components/map/venue-map").then((module) => module.VenueMap),
  {
    ssr: false,
    loading: () => <MapLoadingShell />,
  },
);

export function VenueMapLoader({
  venues,
  selectedId,
  hoveredId,
  backPath,
  selectedZones,
  filters,
  onFiltersChange,
  onSelect,
  onHover,
  onClearSelection,
  onSelectZone,
}: {
  venues: Venue[];
  selectedId: string | null;
  hoveredId: string | null;
  backPath: string;
  selectedZones: MapZoneKey[];
  filters: VenueFilters;
  onFiltersChange: (filters: VenueFilters) => void;
  onSelect: (venueId: string) => void;
  onHover: (venueId: string | null) => void;
  onClearSelection: () => void;
  onSelectZone: (key: MapZoneKey | null) => void;
}) {
  return (
    <VenueMap
      backPath={backPath}
      filters={filters}
      hoveredId={hoveredId}
      onClearSelection={onClearSelection}
      onFiltersChange={onFiltersChange}
      onHover={onHover}
      onSelect={onSelect}
      onSelectZone={onSelectZone}
      selectedId={selectedId}
      selectedZones={selectedZones}
      venues={venues}
    />
  );
}
