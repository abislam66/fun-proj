"use client";

import { useMemo } from "react";

import { EmptyState } from "@/components/ui/primitives";
import { PLACES_OF_THE_WEEK_LIMIT } from "@/config/site";
import { formatStudentRating, rankPlacesByRating } from "@/lib/ratings";
import type { Venue } from "@/lib/venues";

/**
 * Places of the Week — the top published venues by weighted student
 * rating, swapped into the same results sheet as ResultsPanel when
 * viewMode === "places". No voting: the order is a live read of the real
 * ratings/reviews already shipped with the venue payload, ranked by an
 * IMDb-style Bayesian mean (see `rankPlacesByRating`) so a lone 5★ can't
 * top a venue with many strong ratings. Fewer than the cap appear when
 * fewer venues have ratings; nothing is invented. Tapping a name selects
 * that venue on the map, exactly like a results row.
 */
export function PlacesOfTheWeekPanel({
  venues,
  selectedId,
  hoveredId,
  onHover,
  onSelect,
}: {
  venues: Venue[];
  selectedId: string | null;
  hoveredId: string | null;
  onHover?: (venueId: string | null) => void;
  onSelect: (venueId: string | null) => void;
}) {
  const places = useMemo(
    () =>
      rankPlacesByRating(
        venues.map((venue) => ({
          id: venue.id,
          name: venue.name,
          rating: venue.studentRating,
        })),
      ).slice(0, PLACES_OF_THE_WEEK_LIMIT),
    [venues],
  );

  if (places.length === 0) {
    return (
      <EmptyState
        description="No student ratings yet — this board fills in as places get reviewed."
        title="Nothing rated yet"
      />
    );
  }

  return (
    <>
      <p className="places-intro">
        This week&rsquo;s best-rated spots on campus, by verified student
        reviews. Tap a name to find it on the map.
      </p>
      <ol className="places-list">
        {places.map((place, index) => {
          const selected = place.id === selectedId;
          const highlighted = place.id === hoveredId;
          return (
            <li key={place.id}>
              <div
                className={[
                  "places-row",
                  selected && "venue-row-selected",
                  highlighted && !selected && "venue-row-highlighted",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span aria-hidden="true" className="places-rank">
                  #{index + 1}
                </span>
                <button
                  className="places-name"
                  onBlur={() => onHover?.(null)}
                  onClick={() => onSelect(place.id)}
                  onFocus={() => onHover?.(place.id)}
                  onMouseEnter={() => onHover?.(place.id)}
                  onMouseLeave={() => onHover?.(null)}
                  type="button"
                >
                  {place.name}
                </button>
                <span className="places-rating">
                  {formatStudentRating(
                    { average: place.average, count: place.count },
                    "list",
                  )}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}
