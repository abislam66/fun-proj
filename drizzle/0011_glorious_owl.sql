CREATE TABLE "venue_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"value" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "venue_votes_venue_user_unique" UNIQUE("venue_id","user_id"),
	CONSTRAINT "venue_votes_value_range" CHECK ("venue_votes"."value" IN (-1, 1))
);
--> statement-breakpoint
ALTER TABLE "venue_votes" ADD CONSTRAINT "venue_votes_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_votes" ADD CONSTRAINT "venue_votes_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "venue_votes_venue_id_idx" ON "venue_votes" USING btree ("venue_id");--> statement-breakpoint
CREATE INDEX "venue_votes_user_id_idx" ON "venue_votes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "venue_votes_created_at_idx" ON "venue_votes" USING btree ("created_at");--> statement-breakpoint
-- Deny-all RLS: Drizzle (table owner) bypasses RLS unless FORCE is set.
ALTER TABLE "venue_votes" ENABLE ROW LEVEL SECURITY;