"use client";

import dynamic from "next/dynamic";

import type { Venue } from "@/lib/venues";

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
  onSelect,
  onHover,
  onClearSelection,
}: {
  venues: Venue[];
  selectedId: string | null;
  hoveredId: string | null;
  backPath: string;
  onSelect: (venueId: string) => void;
  onHover: (venueId: string | null) => void;
  onClearSelection: () => void;
}) {
  return (
    <VenueMap
      backPath={backPath}
      hoveredId={hoveredId}
      onClearSelection={onClearSelection}
      onHover={onHover}
      onSelect={onSelect}
      selectedId={selectedId}
      venues={venues}
    />
  );
}
