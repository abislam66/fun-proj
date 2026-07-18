"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { MapPlaceholder } from "@/components/layout/map-placeholder";
import { SiteHeader } from "@/components/layout/site-header";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import { Button } from "@/components/ui/primitives";
import { FilterBar } from "@/components/venues/filter-bar";
import { VenueList, VenueMiniCard } from "@/components/venues/venue-list";
import type { Venue, VenueFilters } from "@/lib/venues";
import {
  countUnknownHours,
  EMPTY_VENUE_FILTERS,
  filterVenues,
  parseVenueFilters,
  serializeVenueFilters,
} from "@/lib/venues";

// MapLibre is the heaviest dependency — lazy-load it so the list is interactive
// well under the 2s budget and renders even if the map chunk/tiles fail.
const VenueMap = dynamic(
  () => import("@/components/map/venue-map").then((mod) => mod.VenueMap),
  { ssr: false, loading: () => <MapPlaceholder /> },
);

function ResultsPanel({
  venues,
  filters,
  setFilters,
  backPath,
  unknownHours,
  selectedId,
  hoveredId,
  onHover,
}: {
  venues: Venue[];
  filters: VenueFilters;
  setFilters: (filters: VenueFilters) => void;
  backPath: string;
  unknownHours: number;
  selectedId: string | null;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
}) {
  return (
    <div className="results-panel">
      <div className="results-intro">
        <p className="eyebrow">Off-meal-plan food near Temple</p>
        <h1>Find your next campus bite.</h1>
      </div>
      <FilterBar filters={filters} onChange={setFilters} />
      <div className="results-summary" aria-live="polite">
        <span>
          {venues.length} {venues.length === 1 ? "place" : "places"}
        </span>
        {unknownHours > 0 ? (
          <span className="unknown-count">
            +{unknownHours} with unknown hours
          </span>
        ) : null}
        {serializeVenueFilters(filters) ? (
          <Button
            className="clear-button"
            onClick={() => setFilters(EMPTY_VENUE_FILTERS)}
            variant="ghost"
          >
            Clear
          </Button>
        ) : null}
      </div>
      <VenueList
        backPath={backPath}
        hoveredId={hoveredId}
        onClear={() => setFilters(EMPTY_VENUE_FILTERS)}
        onHover={onHover}
        selectedId={selectedId}
        venues={venues}
      />
    </div>
  );
}

export function VenueExplorer({
  venues,
  initialQuery,
}: {
  venues: Venue[];
  initialQuery: string;
}) {
  const router = useRouter();
  const [filters, setFilters] = useState(() =>
    parseVenueFilters(new URLSearchParams(initialQuery)),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const query = serializeVenueFilters(filters);
  const backPath = query ? `/?${query}` : "/";
  const visibleVenues = useMemo(
    () => filterVenues(venues, filters),
    [venues, filters],
  );
  const unknownHours = useMemo(
    () => countUnknownHours(venues, filters),
    [venues, filters],
  );

  const selectedVenue = useMemo(
    () => visibleVenues.find((venue) => venue.id === selectedId) ?? null,
    [visibleVenues, selectedId],
  );
  const detailHref = selectedVenue
    ? `/eat/${selectedVenue.slug}?from=${encodeURIComponent(backPath)}`
    : "/";

  // Drop a selection that a filter change just hid.
  useEffect(() => {
    if (selectedId && !visibleVenues.some((venue) => venue.id === selectedId)) {
      setSelectedId(null);
    }
  }, [visibleVenues, selectedId]);

  useEffect(() => {
    const next = query ? `/?${query}` : "/";
    window.history.replaceState(window.history.state, "", next);
  }, [query]);

  // First tap selects (mini-card); second tap on the same pin opens detail.
  const onSelect = useCallback(
    (id: string) => {
      setSelectedId((current) => {
        if (current === id) {
          const venue = visibleVenues.find((item) => item.id === id);
          if (venue) {
            router.push(
              `/eat/${venue.slug}?from=${encodeURIComponent(backPath)}`,
            );
          }
          return current;
        }
        return id;
      });
    },
    [visibleVenues, backPath, router],
  );

  const onHover = useCallback((id: string | null) => setHoveredId(id), []);

  const panel = (
    <ResultsPanel
      backPath={backPath}
      filters={filters}
      hoveredId={hoveredId}
      onHover={onHover}
      selectedId={selectedId}
      setFilters={setFilters}
      unknownHours={unknownHours}
      venues={visibleVenues}
    />
  );

  return (
    <main className="explorer">
      <SiteHeader />
      <div className="desktop-results">{panel}</div>
      <div className="explorer-map">
        <VenueMap
          hoveredId={hoveredId}
          onHover={onHover}
          onSelect={onSelect}
          selectedId={selectedId}
          venues={visibleVenues}
        />
        {selectedVenue ? (
          <div className="map-mini-card">
            <VenueMiniCard
              href={detailHref}
              onClose={() => setSelectedId(null)}
              venue={selectedVenue}
            />
          </div>
        ) : null}
      </div>
      <div className="mobile-results">
        <MobileSheet>{panel}</MobileSheet>
      </div>
    </main>
  );
}
