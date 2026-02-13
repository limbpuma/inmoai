CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'qualified', 'converted', 'lost');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('active', 'inactive', 'expired', 'sold', 'rented', 'pending');--> statement-breakpoint
CREATE TYPE "public"."operation_type" AS ENUM('sale', 'rent');--> statement-breakpoint
CREATE TYPE "public"."property_type" AS ENUM('apartment', 'house', 'studio', 'penthouse', 'duplex', 'loft', 'villa', 'chalet', 'townhouse', 'land', 'commercial', 'office', 'garage', 'storage');--> statement-breakpoint
CREATE TYPE "public"."room_type" AS ENUM('living_room', 'bedroom', 'bathroom', 'kitchen', 'dining_room', 'terrace', 'balcony', 'garden', 'garage', 'storage', 'hallway', 'office', 'other');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'premium', 'agency', 'admin');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(255) NOT NULL,
	"provider" varchar(255) NOT NULL,
	"provider_account_id" varchar(255) NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" varchar(255),
	"scope" varchar(255),
	"id_token" text,
	"session_state" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"key_prefix" varchar(12) NOT NULL,
	"key_hash" varchar(255) NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb,
	"rate_limit" integer DEFAULT 1000,
	"expires_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid,
	"user_id" uuid,
	"name" varchar(255),
	"email" varchar(255),
	"phone" varchar(50),
	"message" text,
	"status" "lead_status" DEFAULT 'new',
	"source" varchar(100),
	"utm_source" varchar(100),
	"utm_medium" varchar(100),
	"utm_campaign" varchar(100),
	"distributed_to" uuid,
	"distributed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"original_url" varchar(1000) NOT NULL,
	"cdn_url" varchar(1000),
	"thumbnail_url" varchar(1000),
	"position" integer DEFAULT 0,
	"room_type" "room_type",
	"is_ai_generated" boolean,
	"is_edited" boolean,
	"authenticity_score" integer,
	"quality_score" integer,
	"detected_issues" jsonb,
	"hash" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" varchar(255),
	"source_id" uuid,
	"external_url" varchar(1000),
	"canonical_id" uuid,
	"title" varchar(500) NOT NULL,
	"description" text,
	"property_type" "property_type" NOT NULL,
	"operation_type" "operation_type" NOT NULL,
	"address" varchar(500),
	"city" varchar(100),
	"neighborhood" varchar(100),
	"postal_code" varchar(20),
	"province" varchar(100),
	"country" varchar(100) DEFAULT 'España',
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"price" numeric(12, 2),
	"price_per_sqm" numeric(10, 2),
	"size_sqm" integer,
	"usable_size_sqm" integer,
	"rooms" integer,
	"bedrooms" integer,
	"bathrooms" integer,
	"floor" integer,
	"total_floors" integer,
	"has_elevator" boolean,
	"has_parking" boolean,
	"has_terrace" boolean,
	"has_balcony" boolean,
	"has_garden" boolean,
	"has_pool" boolean,
	"has_air_conditioning" boolean,
	"has_heating" boolean,
	"heating_type" varchar(100),
	"orientation" varchar(50),
	"year_built" integer,
	"energy_rating" varchar(1),
	"ai_title" varchar(500),
	"ai_description" text,
	"ai_highlights" jsonb,
	"ai_issues" jsonb,
	"authenticity_score" integer,
	"is_ai_generated" boolean,
	"is_edited" boolean,
	"quality_score" integer,
	"valuation_estimate" numeric(12, 2),
	"valuation_confidence" numeric(3, 2),
	"improvements" jsonb,
	"embedding_id" varchar(100),
	"status" "listing_status" DEFAULT 'active',
	"first_seen_at" timestamp with time zone DEFAULT now(),
	"last_seen_at" timestamp with time zone DEFAULT now(),
	"last_enriched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scraping_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"status" varchar(50) DEFAULT 'pending',
	"listings_found" integer DEFAULT 0,
	"listings_new" integer DEFAULT 0,
	"listings_updated" integer DEFAULT 0,
	"errors" jsonb,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"filters" jsonb,
	"frequency" varchar(20) DEFAULT 'daily',
	"is_active" boolean DEFAULT true,
	"last_notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_token" varchar(255) NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"base_url" varchar(500),
	"website" varchar(500),
	"logo_url" varchar(500),
	"scraping_enabled" boolean DEFAULT true,
	"scraping_interval_hours" integer DEFAULT 24,
	"last_scraped_at" timestamp with time zone,
	"config" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sources_name_unique" UNIQUE("name"),
	CONSTRAINT "sources_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"image" varchar(500),
	"email_verified" timestamp with time zone,
	"hashed_password" varchar(255),
	"role" "user_role" DEFAULT 'user',
	"stripe_customer_id" varchar(255),
	"stripe_subscription_id" varchar(255),
	"stripe_price_id" varchar(255),
	"stripe_current_period_end" timestamp with time zone,
	"preferences" jsonb,
	"agency_name" varchar(255),
	"agency_phone" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_distributed_to_users_id_fk" FOREIGN KEY ("distributed_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_images" ADD CONSTRAINT "listing_images_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scraping_jobs" ADD CONSTRAINT "scraping_jobs_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_alerts" ADD CONSTRAINT "search_alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_accounts_provider" ON "accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE INDEX "idx_accounts_user" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_api_keys_prefix" ON "api_keys" USING btree ("key_prefix");--> statement-breakpoint
CREATE INDEX "idx_api_keys_user" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_leads_listing" ON "leads" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "idx_leads_status" ON "leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_leads_distributed" ON "leads" USING btree ("distributed_to");--> statement-breakpoint
CREATE INDEX "idx_images_listing" ON "listing_images" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "idx_images_hash" ON "listing_images" USING btree ("hash");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_listings_source_external" ON "listings" USING btree ("source_id","external_id");--> statement-breakpoint
CREATE INDEX "idx_listings_city" ON "listings" USING btree ("city");--> statement-breakpoint
CREATE INDEX "idx_listings_price" ON "listings" USING btree ("price");--> statement-breakpoint
CREATE INDEX "idx_listings_size" ON "listings" USING btree ("size_sqm");--> statement-breakpoint
CREATE INDEX "idx_listings_status" ON "listings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_listings_authenticity" ON "listings" USING btree ("authenticity_score");--> statement-breakpoint
CREATE INDEX "idx_listings_property_type" ON "listings" USING btree ("property_type");--> statement-breakpoint
CREATE INDEX "idx_listings_operation_type" ON "listings" USING btree ("operation_type");--> statement-breakpoint
CREATE INDEX "idx_price_history_listing" ON "price_history" USING btree ("listing_id","recorded_at");--> statement-breakpoint
CREATE INDEX "idx_scraping_jobs_source" ON "scraping_jobs" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "idx_scraping_jobs_status" ON "scraping_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_alerts_user" ON "search_alerts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_alerts_active" ON "search_alerts" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_sessions_user" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_favorites_user_listing" ON "user_favorites" USING btree ("user_id","listing_id");--> statement-breakpoint
CREATE INDEX "idx_favorites_user" ON "user_favorites" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_verification_tokens" ON "verification_tokens" USING btree ("identifier","token");