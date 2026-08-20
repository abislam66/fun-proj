CREATE TABLE "otp_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ip_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Deny-all RLS, same posture as every other table (see 0000_phase1_init.sql).
ALTER TABLE "otp_requests" ENABLE ROW LEVEL SECURITY;
