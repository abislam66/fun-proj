"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";

import { Button, Input } from "@/components/ui/primitives";
import {
  CAMPUS_BOUNDS,
  CAMPUS_MAX_BOUNDS,
  DEFAULT_VIEWPORT,
  MAP_STYLE_URL,
} from "@/config/site";

import "maplibre-gl/dist/maplibre-gl.css";

type GeocodeResult = { label: string; lat: number; lng: number };

/**
 * Nominatim search, biased (not restricted) to the campus area via
 * viewbox. Deliberately NOT autocomplete-as-you-type — explicit submit
 * only, both simpler and friendlier to Nominatim's usage policy against
 * rapid-fire querying. Never sets the venue's coordinates itself — it
 * only recenters the map; the admin still clicks/drags the pin to
 * actually confirm a location (see the component doc comment).
 */
async function searchAddress(query: string): Promise<GeocodeResult[]> {
  const [west, south] = CAMPUS_MAX_BOUNDS[0];
  const [east, north] = CAMPUS_MAX_BOUNDS[1];
  const params = new URLSearchParams({
    format: "json",
    q: query,
    viewbox: `${west},${north},${east},${south}`,
    bounded: "0",
    limit: "5",
  });
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    { headers: { Accept: "application/json" } },
  );
  if (!response.ok) throw new Error("Search failed");
  const data = (await response.json()) as Array<{
    display_name: string;
    lat: string;
    lon: string;
  }>;
  return data.map((item) => ({
    label: item.display_name,
    lat: Number(item.lat),
    lng: Number(item.lon),
  }));
}

/**
 * Minimal click-to-place / drag-to-adjust location picker for the admin
 * venue editor. Deliberately not the public VenueMap — no pills, zones,
 * filters, or mini-cards, just a marker on the campus basemap. The
 * existing lat/lng number inputs stay as a fallback/precise-entry option
 * alongside this; the picker is a faster way to set the same two fields.
 *
 * The address search only recenters the map (`flyTo`) — it never calls
 * `onChange` itself. Geocoding results are approximate and unverified;
 * the admin always still has to click the map or drag the pin to
 * actually confirm and set a location, same as before search existed.
 */
export function VenueLocationPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<MapLibreMarker | null>(null);
  const onChangeRef = useRef(onChange);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // A plain click/Enter handler, not a <form onSubmit>: this component is
  // itself always rendered inside the outer venue-editor <form>, and a
  // nested <form> is invalid HTML — browsers un-nest it unpredictably,
  // which risks this "search" submit also triggering the outer save/
  // publish handler.
  async function handleSearch() {
    if (!query.trim() || searching) return;
    setSearching(true);
    setSearchError("");
    try {
      const found = await searchAddress(query.trim());
      setResults(found);
      if (found.length === 0) {
        setSearchError("No results — try a different search.");
      }
    } catch {
      setSearchError("Search failed — try again, or place the pin directly.");
    } finally {
      setSearching(false);
    }
  }

  function goToResult(result: GeocodeResult) {
    mapRef.current?.flyTo({ center: [result.lng, result.lat], zoom: 17 });
    setResults([]);
    setQuery(result.label);
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let disposed = false;

    async function init() {
      const maplibre = await import("maplibre-gl");
      if (disposed || !containerRef.current) return;

      const startCenter: [number, number] =
        lat !== null && lng !== null ? [lng, lat] : DEFAULT_VIEWPORT.center;

      const instance = new maplibre.Map({
        container: containerRef.current,
        style: MAP_STYLE_URL,
        center: startCenter,
        zoom: DEFAULT_VIEWPORT.zoom,
        maxBounds: CAMPUS_MAX_BOUNDS,
        minZoom: 13.5,
        maxZoom: 19,
        attributionControl: false,
        logoPosition: "bottom-left",
        pitchWithRotate: false,
        dragRotate: false,
      });
      mapRef.current = instance;

      const marker = new maplibre.Marker({
        draggable: true,
        color: "#9d2235",
      })
        .setLngLat(startCenter)
        .addTo(instance);
      markerRef.current = marker;

      marker.on("dragend", () => {
        const { lat: newLat, lng: newLng } = marker.getLngLat();
        onChangeRef.current(newLat, newLng);
      });

      instance.on("click", (e) => {
        marker.setLngLat(e.lngLat);
        onChangeRef.current(e.lngLat.lat, e.lngLat.lng);
      });

      instance.on("error", () => {
        if (!disposed) setFailed(true);
      });
    }

    init().catch(() => setFailed(true));

    return () => {
      disposed = true;
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // Only initialize once — subsequent lat/lng changes from typing in the
    // number inputs move the marker via the effect below, not a re-init.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the marker in sync if lat/lng change from outside this component
  // (e.g. the admin types into the plain number inputs instead).
  useEffect(() => {
    if (!markerRef.current || lat === null || lng === null) return;
    const current = markerRef.current.getLngLat();
    if (
      Math.abs(current.lat - lat) > 1e-9 ||
      Math.abs(current.lng - lng) > 1e-9
    ) {
      markerRef.current.setLngLat([lng, lat]);
    }
  }, [lat, lng]);

  if (failed) {
    return (
      <p className="admin-inline-note">
        Map picker unavailable — use the coordinate fields below.
      </p>
    );
  }

  return (
    <div className="admin-location-picker">
      <div className="admin-location-search">
        <Input
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void handleSearch();
            }
          }}
          placeholder="Search an address or business to jump the map there"
          value={query}
        />
        <Button
          disabled={searching}
          onClick={() => void handleSearch()}
          type="button"
          variant="secondary"
        >
          {searching ? "Searching…" : "Search"}
        </Button>
      </div>
      {searchError ? <p className="admin-field-error">{searchError}</p> : null}
      {results.length > 0 ? (
        <ul className="admin-location-results">
          {results.map((result) => (
            <li key={`${result.lat},${result.lng}`}>
              <button onClick={() => goToResult(result)} type="button">
                {result.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="admin-location-picker-map" ref={containerRef} />
      <p className="admin-inline-note">
        Click the map or drag the pin to set the exact location — search only
        recenters the map, it never sets coordinates on its own. Campus bounds:{" "}
        {CAMPUS_BOUNDS.south}–{CAMPUS_BOUNDS.north} lat, {CAMPUS_BOUNDS.west}–
        {CAMPUS_BOUNDS.east} lng.
      </p>
    </div>
  );
}
