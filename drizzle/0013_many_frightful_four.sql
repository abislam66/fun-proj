-- Hot Spots voting became an unbounded per-click counter: each ▲/▼ tap
-- adjusts the member's running total for a venue by ±1 with no cap and no
-- toggle-off, so a row's `value` is no longer limited to {-1, 1}. Drop the
-- old range check. Backward-compatible: every existing row (all ±1) still
-- satisfies the wider (unconstrained) domain, and the prior code path only
-- ever wrote ±1, which is still valid.
ALTER TABLE "venue_votes" DROP CONSTRAINT "venue_votes_value_range";
