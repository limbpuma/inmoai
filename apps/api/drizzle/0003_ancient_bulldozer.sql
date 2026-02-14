CREATE TYPE "public"."agent_session_status" AS ENUM('active', 'completed', 'abandoned', 'error', 'timeout');--> statement-breakpoint
CREATE TYPE "public"."agent_transaction_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'refunded', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."agent_transaction_type" AS ENUM('search_result', 'verification', 'valuation', 'service_booking', 'lead_generated', 'property_sold', 'property_rented', 'portal_published', 'api_call');--> statement-breakpoint
CREATE TYPE "public"."agent_type" AS ENUM('search', 'verify', 'negotiate', 'service_match', 'valuation', 'alert', 'publish', 'transaction');--> statement-breakpoint
CREATE TABLE "agent_api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"key_prefix" varchar(16) NOT NULL,
	"key_hash" varchar(255) NOT NULL,
	"allowed_agents" jsonb DEFAULT '[]'::jsonb,
	"scopes" jsonb DEFAULT '[]'::jsonb,
	"rate_limit" integer DEFAULT 1000,
	"daily_limit" integer DEFAULT 10000,
	"monthly_credits" integer DEFAULT 100000,
	"used_credits_this_month" integer DEFAULT 0,
	"tier" varchar(50) DEFAULT 'developer',
	"custom_pricing" jsonb,
	"webhook_url" varchar(1000),
	"webhook_secret" varchar(255),
	"webhook_events" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true,
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"api_key_id" uuid,
	"agent_type" "agent_type" NOT NULL,
	"session_token" varchar(64) NOT NULL,
	"status" "agent_session_status" DEFAULT 'active' NOT NULL,
	"initial_context" jsonb,
	"conversation_history" jsonb,
	"outcomes_generated" integer DEFAULT 0,
	"total_tokens_used" integer DEFAULT 0,
	"estimated_cost" numeric(10, 4) DEFAULT '0',
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now(),
	"completed_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "agent_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"user_id" uuid,
	"api_key_id" uuid,
	"transaction_type" "agent_transaction_type" NOT NULL,
	"status" "agent_transaction_status" DEFAULT 'pending' NOT NULL,
	"base_amount" numeric(12, 2) NOT NULL,
	"platform_fee" numeric(12, 2) DEFAULT '0',
	"total_amount" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'EUR',
	"reference_amount" numeric(12, 2),
	"fee_percentage" numeric(5, 4),
	"listing_id" uuid,
	"service_provider_id" uuid,
	"service_lead_id" uuid,
	"stripe_payment_intent_id" varchar(255),
	"stripe_transfer_id" varchar(255),
	"description" text,
	"outcome_data" jsonb,
	"invoice_id" varchar(100),
	"billed_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"api_key_id" uuid,
	"user_id" uuid,
	"agent_type" "agent_type" NOT NULL,
	"operation_type" varchar(100) NOT NULL,
	"input_tokens" integer DEFAULT 0,
	"output_tokens" integer DEFAULT 0,
	"total_tokens" integer DEFAULT 0,
	"duration_ms" integer,
	"model_used" varchar(100),
	"token_cost" numeric(10, 6) DEFAULT '0',
	"compute_cost" numeric(10, 6) DEFAULT '0',
	"total_cost" numeric(10, 6) DEFAULT '0',
	"request_payload" jsonb,
	"response_payload" jsonb,
	"is_error" boolean DEFAULT false,
	"error_code" varchar(50),
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "escrow" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buyer_id" uuid,
	"seller_id" uuid,
	"agent_session_id" uuid,
	"listing_id" uuid,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'EUR',
	"platform_fee" numeric(12, 2) DEFAULT '0',
	"stripe_payment_intent_id" varchar(255),
	"stripe_transfer_id" varchar(255),
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"conditions" jsonb,
	"conditions_met" boolean DEFAULT false,
	"funded_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"disputed_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"notes" text,
	"evidence" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_api_keys" ADD CONSTRAINT "agent_api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_api_key_id_agent_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."agent_api_keys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_transactions" ADD CONSTRAINT "agent_transactions_session_id_agent_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_transactions" ADD CONSTRAINT "agent_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_transactions" ADD CONSTRAINT "agent_transactions_api_key_id_agent_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."agent_api_keys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_transactions" ADD CONSTRAINT "agent_transactions_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_transactions" ADD CONSTRAINT "agent_transactions_service_provider_id_service_providers_id_fk" FOREIGN KEY ("service_provider_id") REFERENCES "public"."service_providers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_transactions" ADD CONSTRAINT "agent_transactions_service_lead_id_service_leads_id_fk" FOREIGN KEY ("service_lead_id") REFERENCES "public"."service_leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_usage" ADD CONSTRAINT "agent_usage_session_id_agent_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_usage" ADD CONSTRAINT "agent_usage_api_key_id_agent_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."agent_api_keys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_usage" ADD CONSTRAINT "agent_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrow" ADD CONSTRAINT "escrow_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrow" ADD CONSTRAINT "escrow_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrow" ADD CONSTRAINT "escrow_agent_session_id_agent_sessions_id_fk" FOREIGN KEY ("agent_session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrow" ADD CONSTRAINT "escrow_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_agent_api_keys_user" ON "agent_api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_agent_api_keys_prefix" ON "agent_api_keys" USING btree ("key_prefix");--> statement-breakpoint
CREATE INDEX "idx_agent_api_keys_active" ON "agent_api_keys" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_agent_api_keys_tier" ON "agent_api_keys" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "idx_agent_sessions_user" ON "agent_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_agent_sessions_api_key" ON "agent_sessions" USING btree ("api_key_id");--> statement-breakpoint
CREATE INDEX "idx_agent_sessions_type" ON "agent_sessions" USING btree ("agent_type");--> statement-breakpoint
CREATE INDEX "idx_agent_sessions_status" ON "agent_sessions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_agent_sessions_token" ON "agent_sessions" USING btree ("session_token");--> statement-breakpoint
CREATE INDEX "idx_agent_sessions_started" ON "agent_sessions" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "idx_agent_transactions_session" ON "agent_transactions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_agent_transactions_user" ON "agent_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_agent_transactions_api_key" ON "agent_transactions" USING btree ("api_key_id");--> statement-breakpoint
CREATE INDEX "idx_agent_transactions_type" ON "agent_transactions" USING btree ("transaction_type");--> statement-breakpoint
CREATE INDEX "idx_agent_transactions_status" ON "agent_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_agent_transactions_listing" ON "agent_transactions" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "idx_agent_transactions_created" ON "agent_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_agent_transactions_stripe" ON "agent_transactions" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE INDEX "idx_agent_usage_session" ON "agent_usage" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_agent_usage_api_key" ON "agent_usage" USING btree ("api_key_id");--> statement-breakpoint
CREATE INDEX "idx_agent_usage_user" ON "agent_usage" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_agent_usage_type" ON "agent_usage" USING btree ("agent_type");--> statement-breakpoint
CREATE INDEX "idx_agent_usage_created" ON "agent_usage" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_agent_usage_error" ON "agent_usage" USING btree ("is_error");--> statement-breakpoint
CREATE INDEX "idx_escrow_buyer" ON "escrow" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX "idx_escrow_seller" ON "escrow" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "idx_escrow_listing" ON "escrow" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "idx_escrow_status" ON "escrow" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_escrow_stripe" ON "escrow" USING btree ("stripe_payment_intent_id");