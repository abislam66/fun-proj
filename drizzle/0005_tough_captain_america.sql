CREATE TYPE "public"."venue_photo_source" AS ENUM('legacy', 'admin');--> statement-breakpoint
CREATE TABLE "venue_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"url" text NOT NULL,
	"alt" text NOT NULL,
	"source" "venue_photo_source" DEFAULT 'admin' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "venue_photos" ADD CONSTRAINT "venue_photos_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "venue_photos_venue_id_idx" ON "venue_photos" USING btree ("venue_id");--> statement-breakpoint
ALTER TABLE "venues" DROP COLUMN "image_url";--> statement-breakpoint
-- Preserve the photos previously hardcoded in src/config/venue-photos.ts
-- (now deleted) as "legacy" rows so the gallery keeps showing them.
INSERT INTO "venue_photos" ("venue_id", "url", "alt", "source", "sort_order")
SELECT "id", '/photos/_placeholders/placeholder-1.png', 'Placeholder image 1', 'legacy'::"venue_photo_source", 0 FROM "venues" WHERE "slug" = '7-eleven'
UNION ALL
SELECT "id", '/photos/_placeholders/placeholder-2.png', 'Placeholder image 2', 'legacy'::"venue_photo_source", 1 FROM "venues" WHERE "slug" = '7-eleven'
UNION ALL
SELECT "id", '/photos/_placeholders/placeholder-3.png', 'Placeholder image 3', 'legacy'::"venue_photo_source", 2 FROM "venues" WHERE "slug" = '7-eleven';