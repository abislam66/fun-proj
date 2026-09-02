"use client";

import { useEffect, useMemo, useState } from "react";

import { VenueMapLoader } from "@/components/map/venue-map-loader";
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
  unknownHours,
  selectedId,
  hoveredId,
  onHover,
  onSelect,
}: {
  venues: Venue[];
  filters: VenueFilters;
  setFilters: (filters: VenueFilters) => void;
  unknownHours: number;
  selectedId: string | null;
  hoveredId: string | null;
  onHover: (venueId: string | null) => void;
  onSelect: (venueId: string | null) => void;
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
        hoveredId={hoveredId}
        onClear={() => setFilters(EMPTY_VENUE_FILTERS)}
        onHover={onHover}
        onSelect={onSelect}
        selectedId={selectedId}
        venues={venues}
      />
    </div>
  );
}

export function VenueExplorer({
  venues,
  initialQuery,
  user,
}: {
  venues: Venue[];
  initialQuery: string;
  user: { displayName: string } | null;
}) {
  const [filters, setFilters] = useState(() =>
    parseVenueFilters(new URLSearchParams(initialQuery)),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [sheetCollapse, setSheetCollapse] = useState(0);

  // List rows hand the stage to the map: select the venue AND (on mobile)
  // tuck the sheet to peek so the flown-to pin and its popup are visible.
  // Map-originated selections keep the sheet where it is.
  function selectFromList(venueId: string | null) {
    setSelectedId(venueId);
    if (venueId) setSheetCollapse((count) => count + 1);
  }
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

  useEffect(() => {
    if (selectedId && !visibleVenues.some((venue) => venue.id === selectedId)) {
      setSelectedId(null);
    }
  }, [selectedId, visibleVenues]);

  // Keyboard escape hatch: pin selection is otherwise dismissed only by
  // clicking empty map space or the mini-card's close button.
  useEffect(() => {
    if (!selectedId) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !event.defaultPrevented) {
        setSelectedId(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId]);

  const panel = (
    <ResultsPanel
      filters={filters}
      hoveredId={hoveredId}
      onHover={setHoveredId}
      onSelect={selectFromList}
      selectedId={selectedId}
      setFilters={setFilters}
      unknownHours={unknownHours}
      venues={visibleVenues}
    />
  );

  return (
    <main className="explorer">
      <SiteHeader user={user} />
      <div className="desktop-results">{panel}</div>
      <div className="explorer-map">
        <VenueMapLoader
          backPath={backPath}
          hoveredId={hoveredId}
          onClearSelection={() => setSelectedId(null)}
          onHover={setHoveredId}
          onSelect={setSelectedId}
          onSelectZone={(key) => {
            setFilters((current) => ({
              ...current,
              zones: key ? [key] : [],
            }));
            // Zone chosen on the map itself — hand the stage to the map
            // (the zone flight would otherwise land behind the sheet).
            if (key) setSheetCollapse((count) => count + 1);
          }}
          selectedId={selectedId}
          selectedZones={filters.zones}
          venues={visibleVenues}
        />
      </div>
      <div className="mobile-results">
        <MobileSheet collapseSignal={sheetCollapse}>{panel}</MobileSheet>
      </div>
    </main>
  );
}
