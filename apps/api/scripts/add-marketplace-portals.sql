-- Add missing ENUM types with exception handling
DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM('portal_published', 'portal_failed', 'portal_lead', 'portal_expired', 'portal_stats', 'system');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE portal_connection_status AS ENUM('active', 'expired', 'revoked', 'error');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE portal AS ENUM('idealista', 'fotocasa', 'habitaclia', 'pisos', 'milanuncios');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE portal_post_status AS ENUM('draft', 'pending', 'publishing', 'published', 'failed', 'updating', 'deleting', 'deleted', 'paused', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE portal_sync_job_status AS ENUM('pending', 'processing', 'completed', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE portal_sync_job_type AS ENUM('publish', 'update', 'delete', 'sync_leads', 'sync_analytics', 'refresh_token');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE provider_tier AS ENUM('free', 'premium', 'enterprise');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE service_category AS ENUM('painting', 'renovation', 'electrical', 'plumbing', 'garden', 'general');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE service_lead_status AS ENUM('pending', 'contacted', 'quoted', 'accepted', 'rejected', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE provider_status AS ENUM('pending', 'active', 'suspended', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Create area_centroids table
CREATE TABLE IF NOT EXISTS area_centroids (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    city varchar(255) NOT NULL,
    neighborhood varchar(255),
    province varchar(100),
    autonomous_community varchar(100),
    postal_code varchar(10),
    latitude numeric(10, 7) NOT NULL,
    longitude numeric(10, 7) NOT NULL,
    population integer,
    source varchar(100) DEFAULT 'manual',
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create service_providers table
CREATE TABLE IF NOT EXISTS service_providers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    slug varchar(255) NOT NULL UNIQUE,
    business_name varchar(255) NOT NULL,
    legal_name varchar(255),
    tax_id varchar(50),
    description text,
    short_description varchar(500),
    logo_url varchar(1000),
    cover_image_url varchar(1000),
    website varchar(500),
    email varchar(255) NOT NULL,
    phone varchar(50),
    whatsapp varchar(50),
    address varchar(500),
    city varchar(255) NOT NULL,
    province varchar(100),
    postal_code varchar(10),
    latitude numeric(10, 7),
    longitude numeric(10, 7),
    coverage_radius_km integer DEFAULT 50,
    tier provider_tier DEFAULT 'free' NOT NULL,
    status provider_status DEFAULT 'pending' NOT NULL,
    is_verified boolean DEFAULT false,
    verified_at timestamp with time zone,
    average_rating numeric(3, 2) DEFAULT 0,
    total_reviews integer DEFAULT 0,
    total_jobs_completed integer DEFAULT 0,
    response_time_minutes integer,
    stripe_customer_id varchar(255),
    stripe_subscription_id varchar(255),
    subscription_ends_at timestamp with time zone,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create provider_services table
CREATE TABLE IF NOT EXISTS provider_services (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id uuid NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
    category service_category NOT NULL,
    title varchar(255) NOT NULL,
    description text,
    price_min numeric(10, 2),
    price_max numeric(10, 2),
    price_unit varchar(50) DEFAULT 'project',
    is_featured boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(provider_id, category)
);

-- Create service_leads table
CREATE TABLE IF NOT EXISTS service_leads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id uuid NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
    listing_id uuid REFERENCES listings(id) ON DELETE SET NULL,
    category service_category NOT NULL,
    status service_lead_status DEFAULT 'pending' NOT NULL,
    client_name varchar(255) NOT NULL,
    client_email varchar(255),
    client_phone varchar(50),
    client_message text,
    property_address varchar(500),
    property_city varchar(255),
    property_postal_code varchar(10),
    property_latitude numeric(10, 7),
    property_longitude numeric(10, 7),
    estimated_budget_min numeric(10, 2),
    estimated_budget_max numeric(10, 2),
    preferred_start_date timestamp with time zone,
    urgency varchar(50) DEFAULT 'normal',
    quoted_amount numeric(10, 2),
    quoted_at timestamp with time zone,
    final_amount numeric(10, 2),
    completed_at timestamp with time zone,
    notes text,
    provider_notes text,
    source varchar(100) DEFAULT 'listing_page',
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create provider_reviews table
CREATE TABLE IF NOT EXISTS provider_reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id uuid NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
    service_lead_id uuid UNIQUE REFERENCES service_leads(id) ON DELETE SET NULL,
    user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title varchar(255),
    comment text,
    quality_rating integer CHECK (quality_rating >= 1 AND quality_rating <= 5),
    communication_rating integer CHECK (communication_rating >= 1 AND communication_rating <= 5),
    punctuality_rating integer CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
    value_rating integer CHECK (value_rating >= 1 AND value_rating <= 5),
    would_recommend boolean DEFAULT true,
    is_verified boolean DEFAULT false,
    verified_at timestamp with time zone,
    response text,
    responded_at timestamp with time zone,
    is_public boolean DEFAULT true,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create provider_portfolio table
CREATE TABLE IF NOT EXISTS provider_portfolio (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id uuid NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
    category service_category,
    title varchar(255),
    description text,
    image_url varchar(1000) NOT NULL,
    thumbnail_url varchar(1000),
    project_date timestamp with time zone,
    location varchar(255),
    position integer DEFAULT 0,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create portal_connections table
CREATE TABLE IF NOT EXISTS portal_connections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    portal portal NOT NULL,
    access_token text NOT NULL,
    refresh_token text,
    token_expires_at timestamp with time zone,
    portal_account_id varchar(255),
    portal_account_email varchar(255),
    portal_account_name varchar(255),
    status portal_connection_status DEFAULT 'active' NOT NULL,
    auto_sync boolean DEFAULT true,
    sync_interval_hours integer DEFAULT 6,
    last_sync_at timestamp with time zone,
    last_error_message text,
    last_error_at timestamp with time zone,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(user_id, portal)
);

-- Create portal_posts table
CREATE TABLE IF NOT EXISTS portal_posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id uuid NOT NULL REFERENCES portal_connections(id) ON DELETE CASCADE,
    listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    portal portal NOT NULL,
    portal_listing_id varchar(255),
    portal_url varchar(1000),
    status portal_post_status DEFAULT 'draft' NOT NULL,
    last_status_change timestamp with time zone DEFAULT now(),
    error_message text,
    error_code varchar(50),
    retry_count integer DEFAULT 0,
    next_retry_at timestamp with time zone,
    last_synced_price numeric(12, 2),
    last_synced_at timestamp with time zone,
    content_hash varchar(64),
    published_at timestamp with time zone,
    expires_at timestamp with time zone,
    unpublished_at timestamp with time zone,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(listing_id, portal)
);

-- Create portal_sync_jobs table
CREATE TABLE IF NOT EXISTS portal_sync_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id uuid NOT NULL REFERENCES portal_connections(id) ON DELETE CASCADE,
    post_id uuid REFERENCES portal_posts(id) ON DELETE CASCADE,
    job_type portal_sync_job_type NOT NULL,
    status portal_sync_job_status DEFAULT 'pending' NOT NULL,
    bullmq_job_id varchar(255),
    priority integer DEFAULT 0,
    scheduled_for timestamp with time zone DEFAULT now(),
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    error_message text,
    error_code varchar(50),
    retry_count integer DEFAULT 0,
    max_retries integer DEFAULT 3,
    result jsonb,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create portal_leads table
CREATE TABLE IF NOT EXISTS portal_leads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id uuid NOT NULL REFERENCES portal_posts(id) ON DELETE CASCADE,
    portal portal NOT NULL,
    portal_lead_id varchar(255),
    contact_name varchar(255),
    contact_email varchar(255),
    contact_phone varchar(50),
    subject varchar(500),
    message text,
    is_read boolean DEFAULT false,
    read_at timestamp with time zone,
    is_replied boolean DEFAULT false,
    replied_at timestamp with time zone,
    raw_data jsonb,
    portal_received_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(portal, portal_lead_id)
);

-- Create portal_analytics table
CREATE TABLE IF NOT EXISTS portal_analytics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id uuid NOT NULL REFERENCES portal_posts(id) ON DELETE CASCADE,
    date timestamp with time zone NOT NULL,
    views integer DEFAULT 0,
    unique_views integer DEFAULT 0,
    clicks integer DEFAULT 0,
    phone_clicks integer DEFAULT 0,
    email_clicks integer DEFAULT 0,
    favorites integer DEFAULT 0,
    shares integer DEFAULT 0,
    leads_generated integer DEFAULT 0,
    search_position integer,
    category_position integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(post_id, date)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title varchar(255) NOT NULL,
    message text,
    portal_post_id uuid REFERENCES portal_posts(id) ON DELETE SET NULL,
    portal_lead_id uuid REFERENCES portal_leads(id) ON DELETE SET NULL,
    listing_id uuid REFERENCES listings(id) ON DELETE SET NULL,
    is_read boolean DEFAULT false,
    read_at timestamp with time zone,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_centroids_city ON area_centroids(city);
CREATE INDEX IF NOT EXISTS idx_centroids_location ON area_centroids(latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_providers_user ON service_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_providers_city ON service_providers(city);
CREATE INDEX IF NOT EXISTS idx_providers_status ON service_providers(status);
CREATE INDEX IF NOT EXISTS idx_providers_tier ON service_providers(tier);
CREATE INDEX IF NOT EXISTS idx_providers_rating ON service_providers(average_rating);
CREATE INDEX IF NOT EXISTS idx_providers_verified ON service_providers(is_verified);
CREATE INDEX IF NOT EXISTS idx_providers_location ON service_providers(latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_provider_services_provider ON provider_services(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_services_category ON provider_services(category);

CREATE INDEX IF NOT EXISTS idx_service_leads_provider ON service_leads(provider_id);
CREATE INDEX IF NOT EXISTS idx_service_leads_listing ON service_leads(listing_id);
CREATE INDEX IF NOT EXISTS idx_service_leads_category ON service_leads(category);
CREATE INDEX IF NOT EXISTS idx_service_leads_status ON service_leads(status);
CREATE INDEX IF NOT EXISTS idx_service_leads_created ON service_leads(created_at);

CREATE INDEX IF NOT EXISTS idx_reviews_provider ON provider_reviews(provider_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON provider_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_verified ON provider_reviews(is_verified);

CREATE INDEX IF NOT EXISTS idx_portfolio_provider ON provider_portfolio(provider_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_category ON provider_portfolio(category);

CREATE INDEX IF NOT EXISTS idx_portal_connections_user ON portal_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_portal_connections_portal ON portal_connections(portal);
CREATE INDEX IF NOT EXISTS idx_portal_connections_status ON portal_connections(status);

CREATE INDEX IF NOT EXISTS idx_portal_posts_connection ON portal_posts(connection_id);
CREATE INDEX IF NOT EXISTS idx_portal_posts_listing ON portal_posts(listing_id);
CREATE INDEX IF NOT EXISTS idx_portal_posts_portal ON portal_posts(portal);
CREATE INDEX IF NOT EXISTS idx_portal_posts_status ON portal_posts(status);

CREATE INDEX IF NOT EXISTS idx_portal_sync_jobs_connection ON portal_sync_jobs(connection_id);
CREATE INDEX IF NOT EXISTS idx_portal_sync_jobs_post ON portal_sync_jobs(post_id);
CREATE INDEX IF NOT EXISTS idx_portal_sync_jobs_status ON portal_sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_portal_sync_jobs_type ON portal_sync_jobs(job_type);

CREATE INDEX IF NOT EXISTS idx_portal_leads_post ON portal_leads(post_id);
CREATE INDEX IF NOT EXISTS idx_portal_leads_portal ON portal_leads(portal);
CREATE INDEX IF NOT EXISTS idx_portal_leads_is_read ON portal_leads(is_read);

CREATE INDEX IF NOT EXISTS idx_portal_analytics_post ON portal_analytics(post_id);
CREATE INDEX IF NOT EXISTS idx_portal_analytics_date ON portal_analytics(date);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);
