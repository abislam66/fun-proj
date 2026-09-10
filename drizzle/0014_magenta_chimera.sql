-- Restore the venue_votes ±1 check that migration 0013 dropped for a
-- since-abandoned "unbounded counter" voting experiment. That experiment
-- was never shipped; public voting has been replaced by the read-only
-- "Places of the Week" ranking (student ratings, no votes). venue_votes
-- goes back to its original design — one ±1 row per member per venue —
-- and sits dormant, unused, for a future real build. Safe: the table is
-- empty in every environment, and nothing writes a value outside {-1, 1}.
ALTER TABLE "venue_votes" ADD CONSTRAINT "venue_votes_value_range" CHECK ("venue_votes"."value" IN (-1, 1));
