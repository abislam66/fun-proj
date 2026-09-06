"use client";

import { EmptyState } from "@/components/ui/primitives";
import { HOT_SPOTS_THIS_WEEK } from "@/config/site";
import type { Venue } from "@/lib/venues";

/**
 * Hot Spots This Week — a hand-curated Top 5, swapped into the same results
 * sheet as ResultsPanel when viewMode === "hotspots". The picks are the
 * ordered slug list in `HOT_SPOTS_THIS_WEEK`, resolved against the venues
 * VenueExplorer already loaded; filters don't apply here. Tapping a row
 * selects that venue on the map, same as a ResultsPanel row.
 *
 * The community-voted board (upvote/downvote, venue_votes, migration 0011)
 * is deferred — see Context/decisions.md. The vote server actions and
 * queries stay in the tree for that future build; nothing calls them yet.
 */
export function HotSpotsPanel({
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
  const bySlug = new Map(venues.map((venue) => [venue.slug, venue]));
  const picks = HOT_SPOTS_THIS_WEEK.map((slug) => bySlug.get(slug)).filter(
    (venue): venue is Venue => venue != null,
  );

  if (picks.length === 0) {
    return (
      <EmptyState
        description="This week's board isn't ready yet — check back soon."
        title="No Hot Spots yet"
      />
    );
  }

  return (
    <>
      <p className="hot-spots-intro">
        This week&rsquo;s five most talked-about spots on campus.
      </p>
      <ol className="hot-spots-list">
        {picks.map((venue, index) => (
          <li key={venue.id}>
            <div
              className={[
                "hot-spot-row",
                venue.id === selectedId && "venue-row-selected",
                venue.id === hoveredId &&
                  venue.id !== selectedId &&
                  "venue-row-highlighted",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span aria-hidden="true" className="hot-spot-rank">
                #{index + 1}
              </span>
              <button
                className="hot-spot-name"
                onBlur={() => onHover?.(null)}
                onClick={() => onSelect(venue.id)}
                onFocus={() => onHover?.(venue.id)}
                onMouseEnter={() => onHover?.(venue.id)}
                onMouseLeave={() => onHover?.(null)}
                type="button"
              >
                {venue.name}
              </button>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
