CREATE TABLE "hot_spots" (
	"position" smallint PRIMARY KEY NOT NULL,
	"venue_id" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hot_spots_venue_unique" UNIQUE("venue_id"),
	CONSTRAINT "hot_spots_position_range" CHECK ("hot_spots"."position" BETWEEN 1 AND 5)
);
--> statement-breakpoint
ALTER TABLE "hot_spots" ADD CONSTRAINT "hot_spots_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
-- Deny-all RLS: Drizzle (table owner) bypasses RLS unless FORCE is set.
ALTER TABLE "hot_spots" ENABLE ROW LEVEL SECURITY;
