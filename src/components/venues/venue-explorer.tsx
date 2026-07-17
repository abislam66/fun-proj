"use client";

import { useEffect, useMemo, useState } from "react";

import { MapPlaceholder } from "@/components/layout/map-placeholder";
import { SiteHeader } from "@/components/layout/site-header";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import { Button } from "@/components/ui/primitives";
import { FilterBar } from "@/components/venues/filter-bar";
import { VenueList } from "@/components/venues/venue-list";
import type { Venue, VenueFilters } from "@/lib/venues";
import {
  countUnknownHours,
  EMPTY_VENUE_FILTERS,
  filterVenues,
  parseVenueFilters,
  serializeVenueFilters,
} from "@/lib/venues";

function ResultsPanel({
  venues,
  filters,
  setFilters,
  backPath,
  unknownHours,
}: {
  venues: Venue[];
  filters: VenueFilters;
  setFilters: (filters: VenueFilters) => void;
  backPath: string;
  unknownHours: number;
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
        onClear={() => setFilters(EMPTY_VENUE_FILTERS)}
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
  const [filters, setFilters] = useState(() =>
    parseVenueFilters(new URLSearchParams(initialQuery)),
  );
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

  useEffect(() => {
    const next = query ? `/?${query}` : "/";
    window.history.replaceState(window.history.state, "", next);
  }, [query]);

  const panel = (
    <ResultsPanel
      backPath={backPath}
      filters={filters}
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
        <MapPlaceholder />
      </div>
      <div className="mobile-results">
        <MobileSheet>{panel}</MobileSheet>
      </div>
    </main>
  );
}
