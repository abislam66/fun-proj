"use client";

import { useEffect, useState } from "react";

import { getHotSpotsRanking, submitVenueVote } from "@/actions/votes";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { EmptyState } from "@/components/ui/primitives";
import type { HotSpotRanking } from "@/lib/db/queries";

type VoteState = Record<string, 1 | -1 | undefined>;

/**
 * Hot Spots This Week — the community-voted board, swapped into the same
 * results sheet as ResultsPanel when viewMode === "hotspots". Every
 * published venue competes: the list is all venues ranked by their live
 * net vote score this week, and members upvote/downvote to re-rank it. A
 * venue with no votes this week shows "NEW" instead of 0. Fetched on
 * demand when the tab opens — most visits never open it (see
 * Context/decisions.md for the caching rationale). Tapping a name selects
 * that venue on the map, same as a ResultsPanel row.
 */
export function HotSpotsPanel({
  selectedId,
  hoveredId,
  isSignedIn,
  onHover,
  onSelect,
}: {
  selectedId: string | null;
  hoveredId: string | null;
  isSignedIn: boolean;
  onHover?: (venueId: string | null) => void;
  onSelect: (venueId: string | null) => void;
}) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [ranking, setRanking] = useState<HotSpotRanking[]>([]);
  const [myVotes, setMyVotes] = useState<VoteState>({});
  const [signInPromptFor, setSignInPromptFor] = useState<string | null>(null);

  async function load() {
    setStatus("loading");
    const result = await getHotSpotsRanking();
    if (!result.ok) {
      setStatus("error");
      return;
    }
    setRanking(result.data.ranking);
    setMyVotes(result.data.myVotes);
    setStatus("ready");
  }

  // Fetched once per panel mount — reopening the tab remounts this
  // component and refetches, which is the only refresh path (no polling).
  useEffect(() => {
    void load();
  }, []);

  async function vote(venueId: string, value: 1 | -1) {
    if (!isSignedIn) {
      setSignInPromptFor(venueId);
      return;
    }
    // Optimistic: mirror the server's toggle-off-on-repeat-tap and adjust
    // the visible score locally so the UI doesn't wait on the round trip.
    const previous = myVotes[venueId];
    const next = previous === value ? undefined : value;
    const delta = (next ?? 0) - (previous ?? 0);

    setMyVotes((current) => ({ ...current, [venueId]: next }));
    setRanking((current) =>
      resort(
        current.map((row) =>
          row.venueId === venueId
            ? {
                ...row,
                score: row.score + delta,
                voteCount:
                  row.voteCount +
                  (previous === undefined && next !== undefined
                    ? 1
                    : previous !== undefined && next === undefined
                      ? -1
                      : 0),
              }
            : row,
        ),
      ),
    );

    const result = await submitVenueVote({ venueId, value });
    if (!result.ok) {
      // Roll back to the server truth by refetching — simpler and safer
      // than unwinding the optimistic score math on an unknown failure.
      void load();
    }
  }

  if (status === "loading") {
    return (
      <p aria-live="polite" className="hot-spots-loading">
        Loading Hot Spots…
      </p>
    );
  }

  if (status === "error") {
    return (
      <EmptyState
        action={
          <button
            className="text-link"
            onClick={() => void load()}
            type="button"
          >
            Try again
          </button>
        }
        description="Something went wrong loading this week's board."
        title="Couldn't load Hot Spots"
      />
    );
  }

  if (ranking.length === 0) {
    return (
      <EmptyState
        description="No venues to vote on yet — check back soon."
        title="Nothing here yet"
      />
    );
  }

  return (
    <>
      <p className="hot-spots-intro">
        Every spot on campus, ranked by this week&rsquo;s votes. Tap a name to
        find it on the map.
      </p>
      <ol className="hot-spots-list">
        {ranking.map((row, index) => (
          <HotSpotRow
            highlighted={row.venueId === hoveredId}
            key={row.venueId}
            myVote={myVotes[row.venueId]}
            onDismissSignInPrompt={() => setSignInPromptFor(null)}
            onHover={onHover}
            onSelect={onSelect}
            onVote={vote}
            rank={index + 1}
            row={row}
            selected={row.venueId === selectedId}
            showSignInPrompt={signInPromptFor === row.venueId}
          />
        ))}
      </ol>
    </>
  );
}

/** Re-sort to match the server: score desc, then name A→Z on ties. */
function resort(rows: HotSpotRanking[]): HotSpotRanking[] {
  return [...rows].sort(
    (a, b) => b.score - a.score || a.name.localeCompare(b.name),
  );
}

function HotSpotRow({
  row,
  rank,
  myVote,
  selected,
  highlighted,
  showSignInPrompt,
  onDismissSignInPrompt,
  onHover,
  onSelect,
  onVote,
}: {
  row: HotSpotRanking;
  rank: number;
  myVote: 1 | -1 | undefined;
  selected: boolean;
  highlighted: boolean;
  showSignInPrompt: boolean;
  onDismissSignInPrompt: () => void;
  onHover?: (venueId: string | null) => void;
  onSelect: (venueId: string | null) => void;
  onVote: (venueId: string, value: 1 | -1) => void;
}) {
  return (
    <li>
      <div
        className={[
          "hot-spot-row",
          selected && "venue-row-selected",
          highlighted && !selected && "venue-row-highlighted",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <span aria-hidden="true" className="hot-spot-rank">
          #{rank}
        </span>
        <button
          className="hot-spot-name"
          onBlur={() => onHover?.(null)}
          onClick={() => onSelect(row.venueId)}
          onFocus={() => onHover?.(row.venueId)}
          onMouseEnter={() => onHover?.(row.venueId)}
          onMouseLeave={() => onHover?.(null)}
          type="button"
        >
          {row.name}
        </button>
        <div className="hot-spot-votes">
          <button
            aria-label={`Upvote ${row.name}`}
            aria-pressed={myVote === 1}
            className={
              myVote === 1
                ? "hot-spot-vote hot-spot-vote-active"
                : "hot-spot-vote"
            }
            onClick={() => onVote(row.venueId, 1)}
            type="button"
          >
            ▲
          </button>
          {row.voteCount === 0 ? (
            <span
              className="hot-spot-score hot-spot-score-new"
              title="No votes yet this week"
            >
              NEW
            </span>
          ) : (
            <span className="hot-spot-score">{row.score}</span>
          )}
          <button
            aria-label={`Downvote ${row.name}`}
            aria-pressed={myVote === -1}
            className={
              myVote === -1
                ? "hot-spot-vote hot-spot-vote-active"
                : "hot-spot-vote"
            }
            onClick={() => onVote(row.venueId, -1)}
            type="button"
          >
            ▼
          </button>
        </div>
      </div>
      {showSignInPrompt ? (
        <div className="hot-spot-signin-prompt">
          <p>Sign in to vote.</p>
          <GoogleSignInButton next="/?view=hotspots" />
          <button
            className="text-link"
            onClick={onDismissSignInPrompt}
            type="button"
          >
            Not now
          </button>
        </div>
      ) : null}
    </li>
  );
}
