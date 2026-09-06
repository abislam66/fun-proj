"use client";

import { useEffect, useMemo, useState } from "react";
import { usePostHog } from "posthog-js/react";

import { VenueMapLoader } from "@/components/map/venue-map-loader";
import { SiteHeader } from "@/components/layout/site-header";
import type { HeaderSession } from "@/components/layout/user-avatar";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import { Button } from "@/components/ui/primitives";
import { HotSpotsPanel } from "@/components/venues/hot-spots-panel";
import { MapSearchOverlay } from "@/components/venues/map-search-overlay";
import { VenueList } from "@/components/venues/venue-list";
import { VenuePreview } from "@/components/venues/venue-preview";
import { AnalyticsEvent } from "@/lib/analytics";
import {
  DESKTOP_MEDIA_QUERY,
  type MobileSheetSnap,
} from "@/lib/mobile-sheet-heights";
import type { Venue } from "@/lib/venues";
import {
  countUnknownHours,
  EMPTY_VENUE_FILTERS,
  filterVenues,
  parseVenueFilters,
  serializeVenueFilters,
} from "@/lib/venues";

type ViewMode = "map" | "hotspots";

function ResultsPanel({
  venues,
  backPath,
  onClearFilters,
  unknownHours,
  filtersActive,
  selectedId,
  hoveredId,
  onHover,
}: {
  venues: Venue[];
  backPath: string;
  onClearFilters: () => void;
  unknownHours: number;
  filtersActive: boolean;
  selectedId: string | null;
  hoveredId: string | null;
  onHover: (venueId: string | null) => void;
}) {
  return (
    <div className="results-panel">
      <div className="results-summary" aria-live="polite">
        <span>
          {venues.length} {venues.length === 1 ? "place" : "places"}
        </span>
        {unknownHours > 0 ? (
          <span className="unknown-count">
            +{unknownHours} with unknown hours
          </span>
        ) : null}
        {filtersActive ? (
          <Button
            className="clear-button"
            onClick={onClearFilters}
            variant="ghost"
          >
            Clear
          </Button>
        ) : null}
      </div>
      <VenueList
        backPath={backPath}
        hoveredId={hoveredId}
        onClear={onClearFilters}
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
  session = null,
}: {
  venues: Venue[];
  initialQuery: string;
  session?: HeaderSession | null;
}) {
  const initialParams = useMemo(
    () => new URLSearchParams(initialQuery),
    [initialQuery],
  );
  const [filters, setFilters] = useState(() =>
    parseVenueFilters(initialParams),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    initialParams.get("view") === "hotspots" ? "hotspots" : "map",
  );
  // The results sheet now overlays the map at every breakpoint — map
  // dominates on load, so it starts collapsed everywhere, not just mobile.
  // A bookmarked "?view=restaurants" link opens straight to the list.
  const [snap, setSnap] = useState<MobileSheetSnap>(() =>
    initialParams.get("view") === "restaurants" ? "peek" : "collapsed",
  );
  // On mobile, selecting a venue swaps the sheet into a preview card (no
  // room for both a browse view and a floating mini-card at once). On
  // desktop the mini-card handles the selection instead — the sheet stays
  // in whatever browse content it already had, so picking a venue never
  // silently discards an open Hot Spots board or restaurant list.
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === "undefined"
      ? false
      : window.matchMedia(DESKTOP_MEDIA_QUERY).matches,
  );
  const posthog = usePostHog();

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_MEDIA_QUERY);
    function sync() {
      setIsDesktop(media.matches);
    }
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  // Venue pills are drawn on the map's canvas (a MapLibre symbol layer, see
  // venue-pill-layer.tsx) — not DOM elements — so autocapture is
  // structurally blind to a pin tap. This is the one interaction on the
  // site autocapture genuinely cannot see; every other custom event here
  // just adds semantic state on top of what autocapture already gets free.
  function captureVenueSelected(venueId: string, source: "map" | "list") {
    const venue = visibleVenues.find((candidate) => candidate.id === venueId);
    posthog.capture(AnalyticsEvent.VenueSelected, {
      venue_id: venueId,
      venue_type: venue?.type ?? null,
      source,
    });
  }

  // List rows hand the stage to the map: select the venue. On mobile the
  // results sheet swaps to the venue preview; on desktop the pin card
  // pops. Map-originated zone taps keep the browse sheet where it is.
  function selectFromList(venueId: string | null) {
    if (venueId) captureVenueSelected(venueId, "list");
    setSelectedId(venueId);
  }

  function selectFromMap(venueId: string | null) {
    if (venueId) captureVenueSelected(venueId, "map");
    setSelectedId(venueId);
  }

  function clearFilters() {
    posthog.capture(AnalyticsEvent.FiltersCleared);
    setFilters(EMPTY_VENUE_FILTERS);
  }

  function goHome() {
    setViewMode("map");
  }

  function openHotSpots() {
    posthog.capture(AnalyticsEvent.HotSpotsViewed);
    setViewMode("hotspots");
    setSnap((current) => (current === "collapsed" ? "peek" : current));
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
  const filtersActive = query.length > 0;

  useEffect(() => {
    const params = new URLSearchParams(query);
    if (viewMode === "hotspots") params.set("view", "hotspots");
    const combined = params.toString();
    const next = combined ? `/?${combined}` : "/";
    window.history.replaceState(window.history.state, "", next);
  }, [query, viewMode]);

  useEffect(() => {
    if (selectedId && !visibleVenues.some((venue) => venue.id === selectedId)) {
      setSelectedId(null);
    }
  }, [selectedId, visibleVenues]);

  // Debounced so typing "cha cha" fires one event, not seven — and only
  // the length/result count are sent, never the query text itself.
  useEffect(() => {
    const trimmed = filters.query.trim();
    if (!trimmed) return;
    const timeout = setTimeout(() => {
      posthog.capture(AnalyticsEvent.SearchPerformed, {
        query_length: trimmed.length,
        result_count: visibleVenues.length,
      });
    }, 600);
    return () => clearTimeout(timeout);
  }, [filters.query, visibleVenues.length, posthog]);

  // Keyboard escape hatch: pin selection is otherwise dismissed only by
  // clicking empty map space or the preview close control.
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

  const selectedVenue = venues.find((venue) => venue.id === selectedId) ?? null;
  // See the isDesktop comment above: only mobile ever swaps the sheet into
  // the preview card.
  const sheetMode = selectedVenue && !isDesktop ? "preview" : "browse";

  const sheetBody =
    sheetMode === "preview" && selectedVenue ? (
      <VenuePreview
        backPath={backPath}
        onClose={() => setSelectedId(null)}
        venue={selectedVenue}
      />
    ) : viewMode === "hotspots" ? (
      <HotSpotsPanel
        hoveredId={hoveredId}
        isSignedIn={session !== null}
        onHover={setHoveredId}
        onSelect={selectFromList}
        selectedId={selectedId}
      />
    ) : (
      <ResultsPanel
        backPath={backPath}
        filtersActive={filtersActive}
        hoveredId={hoveredId}
        onClearFilters={clearFilters}
        onHover={setHoveredId}
        selectedId={selectedId}
        unknownHours={unknownHours}
        venues={visibleVenues}
      />
    );

  return (
    <main className="explorer">
      {/* The map-first redesign dropped the visible "Find your next campus
          bite" hero text (map dominates instead), but the page still needs
          exactly one real h1 for accessibility/SEO. */}
      <h1 className="sr-only">TuEats — food around Temple University</h1>
      <SiteHeader
        onHome={goHome}
        onHotSpots={openHotSpots}
        session={session}
        viewMode={viewMode}
      />
      <div className="explorer-map">
        <VenueMapLoader
          backPath={backPath}
          hoveredId={hoveredId}
          onClearSelection={() => setSelectedId(null)}
          onHover={setHoveredId}
          onSelect={selectFromMap}
          onSelectZone={(key) => {
            posthog.capture(AnalyticsEvent.ZoneSelected, { zone: key });
            setFilters((current) => ({
              ...current,
              zones: key ? [key] : [],
            }));
          }}
          selectedId={selectedId}
          selectedZones={filters.zones}
          venues={visibleVenues}
        />
        <MapSearchOverlay
          active={filtersActive}
          filters={filters}
          onChange={setFilters}
          onClear={clearFilters}
        />
      </div>
      <div className="results-sheet-region">
        <MobileSheet
          browseLabel="All Restaurants ⌃"
          mode={sheetMode}
          onDismissPreview={() => setSelectedId(null)}
          onSnapChange={setSnap}
          snap={snap}
        >
          {sheetBody}
        </MobileSheet>
      </div>
    </main>
  );
}
