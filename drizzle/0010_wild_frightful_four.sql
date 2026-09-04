-- Existing profiles need a unique username before the NOT NULL + unique
-- constraint can land. New sign-ups get a nicer handle from pickUsername();
-- this backfill is deliberately conservative (slug of display_name, then a
-- unique `u` + id fragment on collision / reserved / too-short).
ALTER TABLE "profiles" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "graduation_year" smallint;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "identity_changed_at" timestamp with time zone;--> statement-breakpoint
UPDATE "profiles"
SET "username" = regexp_replace(lower("display_name"), '[^a-z0-9]', '', 'g');--> statement-breakpoint
UPDATE "profiles"
SET "username" = 'owl' || "username"
WHERE "username" !~ '^[a-z]';--> statement-breakpoint
UPDATE "profiles"
SET "username" = left("username", 20);--> statement-breakpoint
UPDATE "profiles"
SET "username" = 'u' || left(replace("id"::text, '-', ''), 8)
WHERE char_length("username") < 3
   OR "username" IN (
     'about','account','admin','api','auth','eat','help','login','me',
     'moderator','owl','owls','profile','root','settings','signin','signup',
     'support','team','tueats'
   );--> statement-breakpoint
WITH dups AS (
  SELECT "id",
    row_number() OVER (PARTITION BY "username" ORDER BY "created_at", "id") AS rn
  FROM "profiles"
)
UPDATE "profiles" AS p
SET "username" = 'u' || left(replace(p."id"::text, '-', ''), 8)
FROM dups
WHERE p."id" = dups."id" AND dups.rn > 1;--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "username" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "ratings_user_id_idx" ON "ratings" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_username_unique" UNIQUE("username");--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_username_format" CHECK ("profiles"."username" ~ '^[a-z][a-z0-9_]{2,19}$');--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_graduation_year_range" CHECK ("profiles"."graduation_year" IS NULL OR ("profiles"."graduation_year" BETWEEN 1990 AND 2040));
