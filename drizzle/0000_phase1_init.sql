CREATE TYPE "public"."problem_kind" AS ENUM('closed', 'moved', 'wrong_hours', 'other');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'dismissed', 'actioned');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('member', 'admin');--> statement-breakpoint
CREATE TYPE "public"."venue_status" AS ENUM('draft', 'published', 'retired');--> statement-breakpoint
CREATE TYPE "public"."venue_type" AS ENUM('truck', 'restaurant', 'cafe', 'vending');--> statement-breakpoint
CREATE TABLE "problem_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"kind" "problem_kind" NOT NULL,
	"note" text,
	"ip_hash" text NOT NULL,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"role" "user_role" DEFAULT 'member' NOT NULL,
	"struck_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_display_name_unique" UNIQUE("display_name")
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"type" "venue_type" DEFAULT 'truck' NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "venue_status" DEFAULT 'draft' NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"zone_key" text,
	"building" text,
	"floor" text,
	"accepts_cash" boolean,
	"accepts_card" boolean,
	"cuisines" text[] DEFAULT '{}'::text[] NOT NULL,
	"hours" jsonb,
	"last_verified_at" timestamp with time zone,
	"retired_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "venues_slug_unique" UNIQUE("slug"),
	CONSTRAINT "venues_lat_lng_campus_ish" CHECK ("venues"."lat" BETWEEN 39.96 AND 40.02 AND "venues"."lng" BETWEEN -75.18 AND -75.13)
);
--> statement-breakpoint
ALTER TABLE "problem_reports" ADD CONSTRAINT "problem_reports_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "venues_cuisines_gin" ON "venues" USING gin ("cuisines");--> statement-breakpoint
CREATE INDEX "venues_status_idx" ON "venues" USING btree ("status");--> statement-breakpoint
-- Deny-all RLS: enable with no policies so anon/authenticated (PostgREST) get nothing.
-- Table owner (Drizzle via pooler password) bypasses RLS unless FORCE is set.
ALTER TABLE "venues" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "problem_reports" ENABLE ROW LEVEL SECURITY;