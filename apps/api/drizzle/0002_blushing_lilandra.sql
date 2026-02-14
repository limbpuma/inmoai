CREATE TYPE "public"."notification_type" AS ENUM('portal_published', 'portal_failed', 'portal_lead', 'portal_expired', 'portal_stats', 'system');--> statement-breakpoint
CREATE TYPE "public"."portal_connection_status" AS ENUM('active', 'expired', 'revoked', 'error');--> statement-breakpoint
CREATE TYPE "public"."portal" AS ENUM('idealista', 'fotocasa', 'habitaclia', 'pisos', 'milanuncios');--> statement-breakpoint
CREATE TYPE "public"."portal_post_status" AS ENUM('draft', 'pending', 'publishing', 'published', 'failed', 'updating', 'deleting', 'deleted', 'paused', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."portal_sync_job_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."portal_sync_job_type" AS ENUM('publish', 'update', 'delete', 'sync_leads', 'sync_analytics', 'refresh_token');--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text,
	"portal_post_id" uuid,
	"portal_lead_id" uuid,
	"listing_id" uuid,
	"is_read" boolean DEFAULT false,
	"read_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"views" integer DEFAULT 0,
	"unique_views" integer DEFAULT 0,
	"clicks" integer DEFAULT 0,
	"phone_clicks" integer DEFAULT 0,
	"email_clicks" integer DEFAULT 0,
	"favorites" integer DEFAULT 0,
	"shares" integer DEFAULT 0,
	"leads_generated" integer DEFAULT 0,
	"search_position" integer,
	"category_position" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"portal" "portal" NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"portal_account_id" varchar(255),
	"portal_account_email" varchar(255),
	"portal_account_name" varchar(255),
	"status" "portal_connection_status" DEFAULT 'active' NOT NULL,
	"auto_sync" boolean DEFAULT true,
	"sync_interval_hours" integer DEFAULT 6,
	"last_sync_at" timestamp with time zone,
	"last_error_message" text,
	"last_error_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"portal" "portal" NOT NULL,
	"portal_lead_id" varchar(255),
	"contact_name" varchar(255),
	"contact_email" varchar(255),
	"contact_phone" varchar(50),
	"subject" varchar(500),
	"message" text,
	"is_read" boolean DEFAULT false,
	"read_at" timestamp with time zone,
	"is_replied" boolean DEFAULT false,
	"replied_at" timestamp with time zone,
	"raw_data" jsonb,
	"portal_received_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"portal" "portal" NOT NULL,
	"portal_listing_id" varchar(255),
	"portal_url" varchar(1000),
	"status" "portal_post_status" DEFAULT 'draft' NOT NULL,
	"last_status_change" timestamp with time zone DEFAULT now(),
	"error_message" text,
	"error_code" varchar(50),
	"retry_count" integer DEFAULT 0,
	"next_retry_at" timestamp with time zone,
	"last_synced_price" numeric(12, 2),
	"last_synced_at" timestamp with time zone,
	"content_hash" varchar(64),
	"published_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"unpublished_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal_sync_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" uuid,
	"post_id" uuid,
	"job_type" "portal_sync_job_type" NOT NULL,
	"status" "portal_sync_job_status" DEFAULT 'pending' NOT NULL,
	"priority" integer DEFAULT 0,
	"bullmq_job_id" varchar(255),
	"queue_name" varchar(100),
	"payload" jsonb,
	"result" jsonb,
	"error_message" text,
	"scheduled_for" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"attempts" integer DEFAULT 0,
	"max_attempts" integer DEFAULT 3,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_portal_post_id_portal_posts_id_fk" FOREIGN KEY ("portal_post_id") REFERENCES "public"."portal_posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_portal_lead_id_portal_leads_id_fk" FOREIGN KEY ("portal_lead_id") REFERENCES "public"."portal_leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_analytics" ADD CONSTRAINT "portal_analytics_post_id_portal_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."portal_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_connections" ADD CONSTRAINT "portal_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_leads" ADD CONSTRAINT "portal_leads_post_id_portal_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."portal_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_posts" ADD CONSTRAINT "portal_posts_connection_id_portal_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."portal_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_posts" ADD CONSTRAINT "portal_posts_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_sync_jobs" ADD CONSTRAINT "portal_sync_jobs_connection_id_portal_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."portal_connections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_sync_jobs" ADD CONSTRAINT "portal_sync_jobs_post_id_portal_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."portal_posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_notifications_user" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_type" ON "notifications" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_notifications_is_read" ON "notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "idx_notifications_created" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_portal_analytics_post" ON "portal_analytics" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "idx_portal_analytics_date" ON "portal_analytics" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_portal_analytics_unique" ON "portal_analytics" USING btree ("post_id","date");--> statement-breakpoint
CREATE INDEX "idx_portal_connections_user" ON "portal_connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_portal_connections_portal" ON "portal_connections" USING btree ("portal");--> statement-breakpoint
CREATE INDEX "idx_portal_connections_status" ON "portal_connections" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_portal_connections_unique" ON "portal_connections" USING btree ("user_id","portal");--> statement-breakpoint
CREATE INDEX "idx_portal_leads_post" ON "portal_leads" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "idx_portal_leads_portal" ON "portal_leads" USING btree ("portal");--> statement-breakpoint
CREATE INDEX "idx_portal_leads_is_read" ON "portal_leads" USING btree ("is_read");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_portal_leads_unique" ON "portal_leads" USING btree ("portal","portal_lead_id");--> statement-breakpoint
CREATE INDEX "idx_portal_posts_connection" ON "portal_posts" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "idx_portal_posts_listing" ON "portal_posts" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "idx_portal_posts_portal" ON "portal_posts" USING btree ("portal");--> statement-breakpoint
CREATE INDEX "idx_portal_posts_status" ON "portal_posts" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_portal_posts_unique" ON "portal_posts" USING btree ("listing_id","portal");--> statement-breakpoint
CREATE INDEX "idx_portal_sync_jobs_connection" ON "portal_sync_jobs" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "idx_portal_sync_jobs_post" ON "portal_sync_jobs" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "idx_portal_sync_jobs_status" ON "portal_sync_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_portal_sync_jobs_type" ON "portal_sync_jobs" USING btree ("job_type");--> statement-breakpoint
CREATE INDEX "idx_portal_sync_jobs_scheduled" ON "portal_sync_jobs" USING btree ("scheduled_for");