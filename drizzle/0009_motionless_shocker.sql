CREATE TYPE "public"."rating_status" AS ENUM('active', 'removed');--> statement-breakpoint
CREATE TYPE "public"."venue_photo_status" AS ENUM('pending', 'published', 'rejected');--> statement-breakpoint
ALTER TYPE "public"."venue_photo_source" ADD VALUE 'member';--> statement-breakpoint
CREATE TABLE "ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"stars" smallint NOT NULL,
	"review_text" text,
	"status" "rating_status" DEFAULT 'active' NOT NULL,
	"removed_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ratings_venue_user_unique" UNIQUE("venue_id","user_id"),
	CONSTRAINT "ratings_stars_range" CHECK ("ratings"."stars" BETWEEN 1 AND 5),
	CONSTRAINT "ratings_review_text_length" CHECK ("ratings"."review_text" IS NULL OR char_length("ratings"."review_text") <= 1000)
);
--> statement-breakpoint
ALTER TABLE "venue_photos" ADD COLUMN "status" "venue_photo_status" DEFAULT 'published' NOT NULL;--> statement-breakpoint
ALTER TABLE "venue_photos" ADD COLUMN "uploaded_by" uuid;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ratings_venue_id_idx" ON "ratings" USING btree ("venue_id");--> statement-breakpoint
ALTER TABLE "venue_photos" ADD CONSTRAINT "venue_photos_uploaded_by_profiles_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "venue_photos_status_idx" ON "venue_photos" USING btree ("status");--> statement-breakpoint
-- Deny-all RLS: Drizzle (table owner) bypasses RLS unless FORCE is set.
ALTER TABLE "ratings" ENABLE ROW LEVEL SECURITY;