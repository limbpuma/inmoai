-- Migration: Social Media & AI Infrastructure
-- Description: Adds support for social media autoposting, content generation, and AI workflows

-- ============================================
-- NEW ENUM VALUES
-- ============================================

-- Add new agent types
ALTER TYPE agent_type ADD VALUE IF NOT EXISTS 'coordinator';
ALTER TYPE agent_type ADD VALUE IF NOT EXISTS 'social_media';
ALTER TYPE agent_type ADD VALUE IF NOT EXISTS 'content';

-- Add new transaction types
ALTER TYPE agent_transaction_type ADD VALUE IF NOT EXISTS 'social_post';
ALTER TYPE agent_transaction_type ADD VALUE IF NOT EXISTS 'content_generated';
ALTER TYPE agent_transaction_type ADD VALUE IF NOT EXISTS 'agent_delegation';
ALTER TYPE agent_transaction_type ADD VALUE IF NOT EXISTS 'workflow_executed';

-- ============================================
-- NEW ENUMS
-- ============================================

-- Social platform enum
DO $$ BEGIN
    CREATE TYPE social_platform AS ENUM ('facebook', 'instagram', 'linkedin', 'tiktok', 'twitter');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Social connection status enum
DO $$ BEGIN
    CREATE TYPE social_connection_status AS ENUM ('active', 'expired', 'revoked', 'error');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Social post status enum
DO $$ BEGIN
    CREATE TYPE social_post_status AS ENUM ('draft', 'scheduled', 'publishing', 'published', 'failed', 'deleted');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Content type enum
DO $$ BEGIN
    CREATE TYPE content_type AS ENUM (
        'description', 'short_description', 'hashtags', 'social_post',
        'ad_copy', 'email_subject', 'email_body', 'video_script',
        'seo_title', 'seo_description'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Workflow trigger enum
DO $$ BEGIN
    CREATE TYPE workflow_trigger AS ENUM (
        'listing_created', 'price_changed', 'lead_received',
        'scheduled', 'manual', 'social_posted', 'verification_done'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Workflow status enum
DO $$ BEGIN
    CREATE TYPE workflow_status AS ENUM ('active', 'paused', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- NEW TABLES
-- ============================================

-- Social Connections - OAuth connections to social platforms
CREATE TABLE IF NOT EXISTS social_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Platform info
    platform social_platform NOT NULL,
    platform_user_id VARCHAR(100),
    platform_username VARCHAR(255),

    -- OAuth tokens
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,

    -- For Facebook/Instagram business pages
    page_id VARCHAR(100),
    page_name VARCHAR(255),
    page_access_token TEXT,

    -- Status
    status social_connection_status NOT NULL DEFAULT 'active',
    last_used_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,

    -- Metadata
    scopes JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for social_connections
CREATE INDEX IF NOT EXISTS social_connections_user_idx ON social_connections(user_id);
CREATE INDEX IF NOT EXISTS social_connections_platform_idx ON social_connections(platform);
CREATE UNIQUE INDEX IF NOT EXISTS social_connections_user_platform_page_idx
    ON social_connections(user_id, platform, page_id);

-- Social Posts - Posts published to social platforms
CREATE TABLE IF NOT EXISTS social_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- References
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    connection_id UUID NOT NULL REFERENCES social_connections(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Platform info
    platform social_platform NOT NULL,
    platform_post_id VARCHAR(255),
    post_url VARCHAR(1000),

    -- Content
    content TEXT,
    hashtags JSONB DEFAULT '[]',
    media_urls JSONB DEFAULT '[]',
    media_type VARCHAR(20),

    -- Status & scheduling
    status social_post_status NOT NULL DEFAULT 'draft',
    scheduled_at TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,

    -- Analytics
    analytics JSONB DEFAULT '{}',
    analytics_updated_at TIMESTAMP WITH TIME ZONE,

    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for social_posts
CREATE INDEX IF NOT EXISTS social_posts_listing_idx ON social_posts(listing_id);
CREATE INDEX IF NOT EXISTS social_posts_user_idx ON social_posts(user_id);
CREATE INDEX IF NOT EXISTS social_posts_status_idx ON social_posts(status);
CREATE INDEX IF NOT EXISTS social_posts_scheduled_idx ON social_posts(scheduled_at);

-- AI Generated Content - Stores generated content for reuse
CREATE TABLE IF NOT EXISTS ai_generated_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- References
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Content details
    content_type content_type NOT NULL,
    platform social_platform,
    language VARCHAR(5) DEFAULT 'es',
    tone VARCHAR(20),

    -- Generated content
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',

    -- Usage tracking
    used_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,

    -- Rating/feedback
    rating INTEGER,
    feedback TEXT,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for ai_generated_content
CREATE INDEX IF NOT EXISTS ai_content_listing_idx ON ai_generated_content(listing_id);
CREATE INDEX IF NOT EXISTS ai_content_user_type_idx ON ai_generated_content(user_id, content_type);

-- AI Workflows - Automated agent workflows
CREATE TABLE IF NOT EXISTS ai_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Workflow definition
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Trigger configuration
    trigger workflow_trigger NOT NULL,
    trigger_conditions JSONB DEFAULT '{}',

    -- Actions to execute
    actions JSONB NOT NULL,

    -- Status
    status workflow_status NOT NULL DEFAULT 'active',
    is_enabled BOOLEAN DEFAULT TRUE,

    -- Execution stats
    execution_count INTEGER DEFAULT 0,
    last_executed_at TIMESTAMP WITH TIME ZONE,
    last_execution_status VARCHAR(20),

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for ai_workflows
CREATE INDEX IF NOT EXISTS ai_workflows_user_idx ON ai_workflows(user_id);
CREATE INDEX IF NOT EXISTS ai_workflows_trigger_idx ON ai_workflows(trigger);

-- Workflow Executions - Log of workflow runs
CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES ai_workflows(id) ON DELETE CASCADE,

    -- Trigger info
    triggered_by VARCHAR(50) NOT NULL,
    trigger_data JSONB DEFAULT '{}',

    -- Execution details
    status VARCHAR(20) NOT NULL DEFAULT 'running',
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Results
    actions_executed JSONB DEFAULT '[]',

    -- Billing
    total_cost DECIMAL(10, 4),

    error_message TEXT
);

-- Indexes for workflow_executions
CREATE INDEX IF NOT EXISTS workflow_executions_workflow_idx ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS workflow_executions_status_idx ON workflow_executions(status);

-- ============================================
-- UPDATE TRIGGERS
-- ============================================

-- Trigger for social_connections updated_at
CREATE OR REPLACE FUNCTION update_social_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS social_connections_updated_at ON social_connections;
CREATE TRIGGER social_connections_updated_at
    BEFORE UPDATE ON social_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_social_connections_updated_at();

-- Trigger for social_posts updated_at
CREATE OR REPLACE FUNCTION update_social_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS social_posts_updated_at ON social_posts;
CREATE TRIGGER social_posts_updated_at
    BEFORE UPDATE ON social_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_social_posts_updated_at();

-- Trigger for ai_workflows updated_at
CREATE OR REPLACE FUNCTION update_ai_workflows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ai_workflows_updated_at ON ai_workflows;
CREATE TRIGGER ai_workflows_updated_at
    BEFORE UPDATE ON ai_workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_workflows_updated_at();
