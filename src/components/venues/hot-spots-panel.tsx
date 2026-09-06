"use client";

import { useEffect, useState } from "react";

import { getHotSpotsRanking, submitVenueVote } from "@/actions/votes";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { EmptyState } from "@/components/ui/primitives";
import type { HotSpotRanking } from "@/lib/db/queries";

type VoteState = Record<string, 1 | -1 | undefined>;

/**
 * Weekly community-voted ranking, swapped into the same results sheet as
 * ResultsPanel when viewMode === "hotspots". Fetched on demand (not baked
 * into the homepage's SSR fetch) since most visits never open this tab —
 * see Context/decisions.md for the caching rationale.
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

  // Only ever fetched once per panel mount — reopening the tab remounts
  // this component and refetches, which is the only refresh path (no
  // polling, no revalidateTag — see the caching decision above).
  useEffect(() => {
    void load();
  }, []);

  async function vote(venueId: string, value: 1 | -1) {
    if (!isSignedIn) {
      setSignInPromptFor(venueId);
      return;
    }
    // Optimistic: mirror the server's own toggle-off-on-repeat-tap logic
    // locally so the UI doesn't wait on the round trip.
    const previous = myVotes[venueId];
    const optimistic = previous === value ? undefined : value;
    setMyVotes((current) => ({ ...current, [venueId]: optimistic }));
    const result = await submitVenueVote({ venueId, value });
    if (!result.ok) {
      setMyVotes((current) => ({ ...current, [venueId]: previous }));
      return;
    }
    setMyVotes((current) => ({
      ...current,
      [venueId]: result.data.value ?? undefined,
    }));
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
        description="Be the first to upvote a favorite spot."
        title="No votes yet this week"
      />
    );
  }

  return (
    <ul className="hot-spots-list">
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
    </ul>
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
          <span className="hot-spot-score">{row.score}</span>
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
