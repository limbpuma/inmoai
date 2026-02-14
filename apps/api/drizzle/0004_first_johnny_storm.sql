ALTER TABLE "users" ADD COLUMN "ai_credits_used_this_month" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ai_credits_reset_date" timestamp with time zone;