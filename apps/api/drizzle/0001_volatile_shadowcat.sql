CREATE TYPE "public"."provider_status" AS ENUM('pending', 'active', 'suspended', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."provider_tier" AS ENUM('free', 'premium', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."service_category" AS ENUM('painting', 'renovation', 'electrical', 'plumbing', 'garden', 'general');--> statement-breakpoint
CREATE TYPE "public"."service_lead_status" AS ENUM('new', 'viewed', 'contacted', 'quoted', 'accepted', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "area_centroids" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"city" varchar(100) NOT NULL,
	"neighborhood" varchar(100),
	"province" varchar(100),
	"country" varchar(100) DEFAULT 'España',
	"latitude" numeric(10, 7) NOT NULL,
	"longitude" numeric(10, 7) NOT NULL,
	"area_radius_km" numeric(5, 2) DEFAULT '5',
	"source" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_portfolio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"category" "service_category" NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"image_url" varchar(1000) NOT NULL,
	"thumbnail_url" varchar(1000),
	"position" integer DEFAULT 0,
	"project_date" timestamp with time zone,
	"project_duration" varchar(100),
	"project_cost" numeric(10, 2),
	"is_published" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"service_lead_id" uuid,
	"user_id" uuid,
	"author_name" varchar(255),
	"author_email" varchar(255),
	"rating" integer NOT NULL,
	"title" varchar(255),
	"content" text,
	"quality_rating" integer,
	"communication_rating" integer,
	"timeliness_rating" integer,
	"value_rating" integer,
	"category" "service_category",
	"is_verified" boolean DEFAULT false,
	"is_published" boolean DEFAULT true,
	"provider_response" text,
	"provider_responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"category" "service_category" NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"price_min" numeric(10, 2),
	"price_max" numeric(10, 2),
	"price_unit" varchar(50) DEFAULT 'proyecto',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"listing_id" uuid,
	"improvement_id" varchar(100),
	"category" "service_category" NOT NULL,
	"client_name" varchar(255) NOT NULL,
	"client_email" varchar(255) NOT NULL,
	"client_phone" varchar(50),
	"work_address" varchar(500),
	"work_city" varchar(100),
	"work_latitude" numeric(10, 7),
	"work_longitude" numeric(10, 7),
	"title" varchar(255) NOT NULL,
	"description" text,
	"budget" numeric(10, 2),
	"urgency" varchar(20) DEFAULT 'normal',
	"preferred_date" timestamp with time zone,
	"status" "service_lead_status" DEFAULT 'new' NOT NULL,
	"viewed_at" timestamp with time zone,
	"contacted_at" timestamp with time zone,
	"quoted_amount" numeric(10, 2),
	"quoted_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"source" varchar(100) DEFAULT 'marketplace',
	"utm_source" varchar(100),
	"utm_medium" varchar(100),
	"utm_campaign" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"business_name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"logo_url" varchar(500),
	"cover_image_url" varchar(500),
	"contact_name" varchar(255) NOT NULL,
	"contact_email" varchar(255) NOT NULL,
	"contact_phone" varchar(50) NOT NULL,
	"website" varchar(500),
	"address" varchar(500),
	"city" varchar(100) NOT NULL,
	"province" varchar(100),
	"postal_code" varchar(20),
	"country" varchar(100) DEFAULT 'España',
	"latitude" numeric(10, 7) NOT NULL,
	"longitude" numeric(10, 7) NOT NULL,
	"coverage_radius_km" integer DEFAULT 25 NOT NULL,
	"status" "provider_status" DEFAULT 'pending' NOT NULL,
	"tier" "provider_tier" DEFAULT 'free' NOT NULL,
	"stripe_customer_id" varchar(255),
	"stripe_subscription_id" varchar(255),
	"stripe_current_period_end" timestamp with time zone,
	"total_reviews" integer DEFAULT 0,
	"average_rating" numeric(2, 1) DEFAULT '0',
	"total_leads" integer DEFAULT 0,
	"leads_this_month" integer DEFAULT 0,
	"response_time_minutes" integer,
	"is_verified" boolean DEFAULT false,
	"verified_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_providers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "provider_portfolio" ADD CONSTRAINT "provider_portfolio_provider_id_service_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."service_providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_reviews" ADD CONSTRAINT "provider_reviews_provider_id_service_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."service_providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_reviews" ADD CONSTRAINT "provider_reviews_service_lead_id_service_leads_id_fk" FOREIGN KEY ("service_lead_id") REFERENCES "public"."service_leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_reviews" ADD CONSTRAINT "provider_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_services" ADD CONSTRAINT "provider_services_provider_id_service_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."service_providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_leads" ADD CONSTRAINT "service_leads_provider_id_service_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."service_providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_leads" ADD CONSTRAINT "service_leads_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_providers" ADD CONSTRAINT "service_providers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_area_centroids_unique" ON "area_centroids" USING btree ("city","neighborhood");--> statement-breakpoint
CREATE INDEX "idx_area_centroids_city" ON "area_centroids" USING btree ("city");--> statement-breakpoint
CREATE INDEX "idx_portfolio_provider" ON "provider_portfolio" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "idx_portfolio_category" ON "provider_portfolio" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_portfolio_position" ON "provider_portfolio" USING btree ("provider_id","position");--> statement-breakpoint
CREATE INDEX "idx_reviews_provider" ON "provider_reviews" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "idx_reviews_rating" ON "provider_reviews" USING btree ("rating");--> statement-breakpoint
CREATE INDEX "idx_reviews_lead" ON "provider_reviews" USING btree ("service_lead_id");--> statement-breakpoint
CREATE INDEX "idx_reviews_verified" ON "provider_reviews" USING btree ("is_verified");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_reviews_unique_lead" ON "provider_reviews" USING btree ("service_lead_id");--> statement-breakpoint
CREATE INDEX "idx_provider_services_provider" ON "provider_services" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "idx_provider_services_category" ON "provider_services" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_provider_services_unique" ON "provider_services" USING btree ("provider_id","category");--> statement-breakpoint
CREATE INDEX "idx_service_leads_provider" ON "service_leads" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "idx_service_leads_listing" ON "service_leads" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "idx_service_leads_category" ON "service_leads" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_service_leads_status" ON "service_leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_service_leads_created" ON "service_leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_providers_user" ON "service_providers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_providers_city" ON "service_providers" USING btree ("city");--> statement-breakpoint
CREATE INDEX "idx_providers_status" ON "service_providers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_providers_tier" ON "service_providers" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "idx_providers_rating" ON "service_providers" USING btree ("average_rating");--> statement-breakpoint
CREATE INDEX "idx_providers_verified" ON "service_providers" USING btree ("is_verified");--> statement-breakpoint
CREATE INDEX "idx_providers_location" ON "service_providers" USING btree ("latitude","longitude");