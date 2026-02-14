ALTER TABLE "listings" ADD COLUMN "cadastral_ref" varchar(20);--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "cadastral_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "cadastral_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "cadastral_surface" integer;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "cadastral_use" varchar(50);--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "cadastral_construction_year" integer;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "cadastral_mismatch" jsonb;--> statement-breakpoint
CREATE INDEX "idx_listings_cadastral_ref" ON "listings" USING btree ("cadastral_ref");--> statement-breakpoint
CREATE INDEX "idx_listings_cadastral_verified" ON "listings" USING btree ("cadastral_verified");