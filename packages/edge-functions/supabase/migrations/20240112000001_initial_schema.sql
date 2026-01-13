-- PostPhantom Database Schema v1.1
-- Complete migration derived from PostPhantom Database Design Specification v1.1
-- CRITICAL: This schema structurally enforces HITL governance and prevents content storage

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- =============================================================================
-- Domain A — Identity & User Configuration
-- =============================================================================

-- User profiles - Core user identity and LinkedIn profile association
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  linkedin_profile_url TEXT,
  profile_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_linkedin_url CHECK (
    linkedin_profile_url IS NULL OR 
    linkedin_profile_url ~* '^https://www\.linkedin\.com/in/[a-zA-Z0-9\-]+/?$'
  )
);

-- User preferences - AI generation preferences and UI behavior settings
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_provider TEXT DEFAULT 'openai',
  generation_temperature DECIMAL(3,2) DEFAULT 0.7,
  max_drafts_per_request INTEGER DEFAULT 3,
  anti_cheerleader_enabled BOOLEAN DEFAULT true,
  typing_speed_multiplier DECIMAL(3,2) DEFAULT 1.0,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_preferred_provider CHECK (preferred_provider IN ('openai', 'gemini')),
  CONSTRAINT valid_temperature CHECK (generation_temperature >= 0 AND generation_temperature <= 2),
  CONSTRAINT valid_max_drafts CHECK (max_drafts_per_request >= 1 AND max_drafts_per_request <= 10),
  CONSTRAINT valid_typing_speed CHECK (typing_speed_multiplier >= 0.1 AND typing_speed_multiplier <= 5.0)
);

-- Subscription plans - User plan limits and billing enforcement
CREATE TABLE subscription_plans (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL DEFAULT 'free',
  daily_generation_limit INTEGER DEFAULT 50,
  monthly_generation_limit INTEGER DEFAULT 1500,
  features_enabled JSONB DEFAULT '{}',
  plan_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_plan_type CHECK (plan_type IN ('free', 'pro', 'enterprise')),
  CONSTRAINT positive_limits CHECK (
    daily_generation_limit > 0 AND 
    monthly_generation_limit > 0
  )
);

-- Onboarding progress - Track user onboarding completion for UX flow
CREATE TABLE onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  step_data JSONB DEFAULT '{}',
  
  CONSTRAINT valid_step_name CHECK (step_name IN (
    'welcome', 'linkedin_connect', 'voice_setup', 'first_generation', 'dashboard_tour'
  )),
  UNIQUE(user_id, step_name)
);

-- Extension state sync - Synchronize Chrome extension state with web dashboard
CREATE TABLE extension_state_sync (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  extension_version TEXT,
  last_sync_at TIMESTAMPTZ DEFAULT NOW(),
  sync_data JSONB DEFAULT '{}',
  is_extension_active BOOLEAN DEFAULT false,
  
  CONSTRAINT valid_version_format CHECK (
    extension_version IS NULL OR 
    extension_version ~* '^\d+\.\d+\.\d+$'
  )
);

-- =============================================================================
-- Domain B — Assets & Voice Intelligence
-- =============================================================================

-- Voice personas - User-defined voice personas for content generation
CREATE TABLE voice_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_name TEXT NOT NULL,
  persona_description TEXT NOT NULL,
  tone_attributes JSONB NOT NULL,
  example_phrases TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT non_empty_name CHECK (length(trim(persona_name)) > 0),
  CONSTRAINT non_empty_description CHECK (length(trim(persona_description)) > 0),
  UNIQUE(user_id, persona_name)
);

-- Content templates - Reusable content templates with variable substitution
CREATE TABLE content_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  template_structure TEXT NOT NULL,
  category TEXT NOT NULL,
  variable_schema JSONB DEFAULT '{}',
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_category CHECK (category IN (
    'comment', 'post', 'message', 'connection_request'
  )),
  CONSTRAINT non_empty_template CHECK (length(trim(template_structure)) > 0),
  UNIQUE(user_id, template_name)
);

-- Persona embeddings - Vector embeddings for persona similarity matching
CREATE TABLE persona_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID REFERENCES voice_personas(id) ON DELETE CASCADE,
  embedding_hash TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT non_empty_hash CHECK (length(embedding_hash) > 0)
);

-- Template variables - Dynamic variable definitions for template substitution
CREATE TABLE template_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES content_templates(id) ON DELETE CASCADE,
  variable_name TEXT NOT NULL,
  variable_type TEXT NOT NULL,
  default_value TEXT,
  validation_rules JSONB DEFAULT '{}',
  
  CONSTRAINT valid_variable_type CHECK (variable_type IN (
    'text', 'number', 'date', 'boolean', 'select'
  )),
  CONSTRAINT valid_variable_name CHECK (variable_name ~* '^[a-zA-Z][a-zA-Z0-9_]*$'),
  UNIQUE(template_id, variable_name)
);

-- Asset sync state - Track synchronization of assets between extension and dashboard
CREATE TABLE asset_sync_state (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL,
  last_sync_at TIMESTAMPTZ DEFAULT NOW(),
  sync_version INTEGER DEFAULT 1,
  sync_status TEXT DEFAULT 'pending',
  
  CONSTRAINT valid_asset_type CHECK (asset_type IN (
    'personas', 'templates', 'preferences'
  )),
  CONSTRAINT valid_sync_status CHECK (sync_status IN (
    'pending', 'syncing', 'completed', 'failed'
  )),
  PRIMARY KEY(user_id, asset_type)
);

-- =============================================================================
-- Domain C — Personal CRM (GraphRAG Memory)
-- =============================================================================

-- CRM contacts - LinkedIn contact metadata without personal information
CREATE TABLE crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_hash TEXT NOT NULL,
  contact_type TEXT NOT NULL,
  relationship_strength DECIMAL(3,2) DEFAULT 0.0,
  last_interaction_at TIMESTAMPTZ,
  interaction_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_contact_type CHECK (contact_type IN (
    'connection', 'follower', 'company', 'prospect'
  )),
  CONSTRAINT valid_relationship_strength CHECK (
    relationship_strength >= 0.0 AND relationship_strength <= 1.0
  ),
  CONSTRAINT non_empty_hash CHECK (length(contact_hash) > 0),
  UNIQUE(user_id, contact_hash)
);

-- CRM interactions - Interaction metadata for relationship scoring
CREATE TABLE crm_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL,
  interaction_hash TEXT NOT NULL,
  sentiment_score DECIMAL(3,2),
  engagement_level TEXT,
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  
  CONSTRAINT valid_interaction_type CHECK (interaction_type IN (
    'comment', 'like', 'share', 'message', 'connection', 'view'
  )),
  CONSTRAINT valid_sentiment_score CHECK (
    sentiment_score IS NULL OR 
    (sentiment_score >= -1.0 AND sentiment_score <= 1.0)
  ),
  CONSTRAINT valid_engagement_level CHECK (
    engagement_level IS NULL OR 
    engagement_level IN ('low', 'medium', 'high')
  ),
  CONSTRAINT non_empty_interaction_hash CHECK (length(interaction_hash) > 0)
);

-- CRM topics - Topic clustering for content relevance
CREATE TABLE crm_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_name TEXT NOT NULL,
  topic_hash TEXT NOT NULL,
  relevance_score DECIMAL(3,2) DEFAULT 0.0,
  mention_count INTEGER DEFAULT 0,
  last_mentioned_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_relevance_score CHECK (
    relevance_score >= 0.0 AND relevance_score <= 1.0
  ),
  CONSTRAINT non_empty_topic_name CHECK (length(trim(topic_name)) > 0),
  CONSTRAINT non_empty_topic_hash CHECK (length(topic_hash) > 0),
  UNIQUE(user_id, topic_hash)
);

-- Contact embeddings - Contact relationship embeddings for similarity
CREATE TABLE contact_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE CASCADE,
  embedding_hash TEXT NOT NULL,
  embedding vector(1536),
  embedding_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_embedding_type CHECK (embedding_type IN (
    'profile', 'interaction_summary', 'topic_affinity'
  )),
  CONSTRAINT non_empty_embedding_hash CHECK (length(embedding_hash) > 0)
);

-- Interaction embeddings - Interaction pattern embeddings for behavior analysis
CREATE TABLE interaction_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id UUID REFERENCES crm_interactions(id) ON DELETE CASCADE,
  embedding_hash TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT non_empty_embedding_hash CHECK (length(embedding_hash) > 0)
);

-- Topic embeddings - Topic semantic embeddings for content relevance
CREATE TABLE topic_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES crm_topics(id) ON DELETE CASCADE,
  embedding_hash TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT non_empty_embedding_hash CHECK (length(embedding_hash) > 0)
);

-- Contact topic relations - Graph relationships between contacts and topics
CREATE TABLE contact_topic_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES crm_topics(id) ON DELETE CASCADE,
  relationship_strength DECIMAL(3,2) DEFAULT 0.0,
  relationship_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_relationship_strength CHECK (
    relationship_strength >= 0.0 AND relationship_strength <= 1.0
  ),
  CONSTRAINT valid_relationship_type CHECK (relationship_type IN (
    'mentions', 'expertise', 'interest', 'collaboration'
  )),
  UNIQUE(contact_id, topic_id, relationship_type)
);

-- =============================================================================
-- Domain D — AI Execution & Routing
-- =============================================================================

-- AI model registry - Available AI models and their capabilities
CREATE TABLE ai_model_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_slug TEXT NOT NULL,
  model_name TEXT NOT NULL,
  context_window INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  capabilities JSONB NOT NULL,
  cost_per_token DECIMAL(10,8),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_provider_model UNIQUE (provider_slug, model_name),
  CONSTRAINT valid_provider CHECK (provider_slug IN ('openai', 'gemini')),
  CONSTRAINT positive_context_window CHECK (context_window > 0),
  CONSTRAINT valid_cost CHECK (cost_per_token IS NULL OR cost_per_token >= 0)
);

-- Provider health - Circuit breaker health monitoring for providers
CREATE TABLE provider_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_slug TEXT NOT NULL,
  model_name TEXT NOT NULL,
  is_healthy BOOLEAN DEFAULT true,
  failure_count INTEGER DEFAULT 0,
  last_failure_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  cooldown_until TIMESTAMPTZ,
  health_check_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_provider_health CHECK (provider_slug IN ('openai', 'gemini')),
  CONSTRAINT non_negative_failures CHECK (failure_count >= 0),
  UNIQUE(provider_slug, model_name)
);

-- Routing decisions - AI provider routing decision audit trail
CREATE TABLE routing_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  request_hash TEXT NOT NULL,
  selected_provider TEXT NOT NULL,
  selected_model TEXT NOT NULL,
  routing_reason TEXT NOT NULL,
  estimated_tokens INTEGER,
  user_preference TEXT,
  provider_health_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_selected_provider CHECK (selected_provider IN ('openai', 'gemini')),
  CONSTRAINT valid_routing_reason CHECK (routing_reason IN (
    'user_preference', 'token_limit', 'video_input', 'provider_health', 'default'
  )),
  CONSTRAINT non_empty_request_hash CHECK (length(request_hash) > 0)
);

-- Request logs - Comprehensive AI request logging with vision/modality tracking
CREATE TABLE request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  model_name TEXT NOT NULL,
  estimated_tokens INTEGER,
  actual_tokens INTEGER,
  safety_ratings JSONB,
  request_type TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  response_time_ms INTEGER,
  used_vision BOOLEAN DEFAULT false,
  input_modalities JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_provider_logs CHECK (provider IN ('openai', 'gemini')),
  CONSTRAINT valid_request_type CHECK (request_type IN ('generation', 'embedding', 'moderation')),
  CONSTRAINT positive_tokens CHECK (estimated_tokens IS NULL OR estimated_tokens > 0),
  CONSTRAINT positive_actual_tokens CHECK (actual_tokens IS NULL OR actual_tokens > 0),
  CONSTRAINT positive_response_time CHECK (response_time_ms IS NULL OR response_time_ms >= 0)
);

-- Generation sessions - CRITICAL HITL enforcement table
CREATE TABLE generation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id UUID REFERENCES request_logs(id) ON DELETE CASCADE,
  draft_count INTEGER NOT NULL,
  review_required BOOLEAN DEFAULT true,
  review_completed_at TIMESTAMPTZ,
  approved_draft_index INTEGER,
  inserted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT positive_draft_count CHECK (draft_count > 0),
  CONSTRAINT valid_approved_draft CHECK (
    approved_draft_index IS NULL OR 
    (approved_draft_index >= 0 AND approved_draft_index < draft_count)
  ),
  CONSTRAINT hitl_enforcement CHECK (
    (review_required = true AND review_completed_at IS NULL AND approved_draft_index IS NULL AND inserted_at IS NULL) OR
    (review_required = false) OR
    (review_completed_at IS NOT NULL AND approved_draft_index IS NOT NULL)
  ),
  CONSTRAINT insertion_after_review CHECK (
    inserted_at IS NULL OR 
    (review_completed_at IS NOT NULL AND inserted_at >= review_completed_at)
  ),
  UNIQUE(request_id)
);

-- =============================================================================
-- Domain E — Safety, Moderation & Governance
-- =============================================================================

-- Moderation decisions - AI moderation decision tracking
CREATE TABLE moderation_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content_hash TEXT NOT NULL,
  provider TEXT NOT NULL,
  decision TEXT NOT NULL,
  confidence_score DECIMAL(3,2),
  flagged_categories TEXT[],
  decision_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_moderation_provider CHECK (provider IN ('openai', 'gemini')),
  CONSTRAINT valid_decision CHECK (decision IN ('approved', 'rejected', 'flagged')),
  CONSTRAINT valid_confidence CHECK (
    confidence_score IS NULL OR 
    (confidence_score >= 0.0 AND confidence_score <= 1.0)
  ),
  CONSTRAINT non_empty_content_hash CHECK (length(content_hash) > 0)
);

-- Safety flags - User safety flag tracking and escalation
CREATE TABLE safety_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  flag_type TEXT NOT NULL,
  flag_reason TEXT NOT NULL,
  severity_level TEXT NOT NULL,
  auto_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_flag_type CHECK (flag_type IN (
    'content_violation', 'rate_limit_abuse', 'suspicious_activity', 'api_misuse'
  )),
  CONSTRAINT valid_severity CHECK (severity_level IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT resolution_consistency CHECK (
    (resolved_at IS NULL AND resolution_notes IS NULL) OR
    (resolved_at IS NOT NULL)
  )
);

-- HITL enforcement - Human-in-the-loop governance tracking
CREATE TABLE hitl_enforcement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_hash TEXT NOT NULL,
  enforcement_type TEXT NOT NULL,
  enforcement_reason TEXT NOT NULL,
  user_action TEXT,
  bypassed BOOLEAN DEFAULT false,
  bypass_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_enforcement_type CHECK (enforcement_type IN (
    'draft_review_required', 'anti_cheerleader_warning', 'rate_limit_warning', 'safety_interstitial'
  )),
  CONSTRAINT non_empty_session_hash CHECK (length(session_hash) > 0),
  CONSTRAINT bypass_consistency CHECK (
    (bypassed = false AND bypass_reason IS NULL) OR
    (bypassed = true AND bypass_reason IS NOT NULL)
  )
);

-- Duplicate detection - Content duplication prevention
CREATE TABLE duplicate_detection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content_hash TEXT NOT NULL,
  similarity_hash TEXT NOT NULL,
  detection_method TEXT NOT NULL,
  similarity_score DECIMAL(3,2),
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  occurrence_count INTEGER DEFAULT 1,
  
  CONSTRAINT valid_detection_method CHECK (detection_method IN (
    'exact_hash', 'fuzzy_hash', 'semantic_similarity'
  )),
  CONSTRAINT valid_similarity_score CHECK (
    similarity_score IS NULL OR 
    (similarity_score >= 0.0 AND similarity_score <= 1.0)
  ),
  CONSTRAINT non_empty_hashes CHECK (
    length(content_hash) > 0 AND length(similarity_hash) > 0
  ),
  UNIQUE(user_id, content_hash)
);

-- =============================================================================
-- Domain F — Usage, Rate Limiting & Billing Guards
-- =============================================================================

-- Rate limits - User request rate tracking and enforcement
CREATE TABLE rate_limits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_count INTEGER DEFAULT 0,
  hourly_count INTEGER DEFAULT 0,
  last_request_at TIMESTAMPTZ,
  daily_reset_at TIMESTAMPTZ DEFAULT (CURRENT_DATE + INTERVAL '1 day'),
  hourly_reset_at TIMESTAMPTZ DEFAULT (date_trunc('hour', NOW()) + INTERVAL '1 hour'),
  is_locked BOOLEAN DEFAULT false,
  lock_expires_at TIMESTAMPTZ,
  lock_reason TEXT,
  
  CONSTRAINT non_negative_daily_count CHECK (daily_count >= 0),
  CONSTRAINT non_negative_hourly_count CHECK (hourly_count >= 0),
  CONSTRAINT valid_lock_state CHECK (
    (is_locked = false AND lock_expires_at IS NULL AND lock_reason IS NULL) OR
    (is_locked = true AND lock_expires_at IS NOT NULL AND lock_reason IS NOT NULL)
  ),
  CONSTRAINT valid_lock_reason CHECK (
    lock_reason IS NULL OR 
    lock_reason IN ('hourly_limit', 'daily_limit', 'safety_violation', 'manual_lock')
  )
);

-- Usage analytics - DERIVED-ONLY usage pattern analysis
CREATE TABLE usage_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_value DECIMAL(10,2) NOT NULL,
  metric_unit TEXT NOT NULL,
  aggregation_period TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_metric_name CHECK (metric_name IN (
    'generations_count', 'tokens_consumed', 'api_calls', 'session_duration'
  )),
  CONSTRAINT valid_metric_unit CHECK (metric_unit IN (
    'count', 'tokens', 'milliseconds', 'bytes'
  )),
  CONSTRAINT valid_aggregation_period CHECK (aggregation_period IN (
    'daily', 'weekly', 'monthly'
  )),
  CONSTRAINT valid_period CHECK (period_start < period_end),
  CONSTRAINT minimum_daily_aggregation CHECK (
    aggregation_period IN ('daily', 'weekly', 'monthly')
  ),
  UNIQUE(user_id, metric_name, aggregation_period, period_start)
);

-- Billing guards - Billing limit enforcement and overage protection
CREATE TABLE billing_guards (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_spend_limit DECIMAL(10,2) DEFAULT 0.00,
  current_month_spend DECIMAL(10,2) DEFAULT 0.00,
  spend_reset_at TIMESTAMPTZ DEFAULT date_trunc('month', NOW()) + INTERVAL '1 month',
  overage_protection BOOLEAN DEFAULT true,
  overage_threshold DECIMAL(3,2) DEFAULT 0.8,
  last_billing_check TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT non_negative_spend_limit CHECK (monthly_spend_limit >= 0),
  CONSTRAINT non_negative_current_spend CHECK (current_month_spend >= 0),
  CONSTRAINT valid_overage_threshold CHECK (
    overage_threshold >= 0.0 AND overage_threshold <= 1.0
  )
);

-- =============================================================================
-- Domain G — Copilot & Session State
-- =============================================================================

-- Copilot sessions - Copilot chat session management
CREATE TABLE copilot_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_hash TEXT NOT NULL,
  session_type TEXT NOT NULL,
  context_window_size INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  session_metadata JSONB DEFAULT '{}',
  
  CONSTRAINT valid_session_type CHECK (session_type IN (
    'content_generation', 'persona_chat', 'template_creation', 'crm_query'
  )),
  CONSTRAINT non_negative_context_size CHECK (context_window_size >= 0),
  CONSTRAINT non_negative_message_count CHECK (total_messages >= 0),
  CONSTRAINT non_empty_session_hash CHECK (length(session_hash) > 0),
  CONSTRAINT valid_session_timeline CHECK (
    started_at <= last_activity_at AND
    (ended_at IS NULL OR last_activity_at <= ended_at)
  )
);

-- Session messages - Message metadata with explicit retention rules
CREATE TABLE session_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES copilot_sessions(id) ON DELETE CASCADE,
  message_hash TEXT NOT NULL,
  message_type TEXT NOT NULL,
  message_role TEXT NOT NULL,
  token_count INTEGER,
  embedding_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  
  CONSTRAINT valid_message_type CHECK (message_type IN (
    'user_input', 'ai_response', 'system_prompt', 'context_injection'
  )),
  CONSTRAINT valid_message_role CHECK (message_role IN (
    'user', 'assistant', 'system'
  )),
  CONSTRAINT non_negative_tokens CHECK (token_count IS NULL OR token_count >= 0),
  CONSTRAINT non_empty_message_hash CHECK (length(message_hash) > 0)
);

-- Sidebar state - Chrome extension sidebar state synchronization
CREATE TABLE sidebar_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_visible BOOLEAN DEFAULT false,
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  width INTEGER DEFAULT 320,
  height INTEGER DEFAULT 600,
  active_tab TEXT DEFAULT 'copilot',
  ui_preferences JSONB DEFAULT '{}',
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_dimensions CHECK (
    width >= 280 AND width <= 800 AND
    height >= 400 AND height <= 1200
  ),
  CONSTRAINT valid_active_tab CHECK (active_tab IN (
    'copilot', 'personas', 'templates', 'crm', 'analytics'
  ))
);

-- Context window tracking - Track context window usage for token optimization
CREATE TABLE context_window_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES copilot_sessions(id) ON DELETE CASCADE,
  window_snapshot JSONB NOT NULL,
  token_count INTEGER NOT NULL,
  compression_ratio DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT positive_token_count CHECK (token_count > 0),
  CONSTRAINT valid_compression_ratio CHECK (
    compression_ratio IS NULL OR 
    (compression_ratio >= 0.0 AND compression_ratio <= 1.0)
  )
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- User-centric queries
CREATE INDEX idx_user_profiles_linkedin_url ON user_profiles(linkedin_profile_url);
CREATE INDEX idx_request_logs_user_created ON request_logs(user_id, created_at DESC);
CREATE INDEX idx_crm_contacts_user_updated ON crm_contacts(user_id, updated_at DESC);
CREATE INDEX idx_copilot_sessions_user_activity ON copilot_sessions(user_id, last_activity_at DESC);

-- HITL enforcement and generation tracking
CREATE INDEX idx_generation_sessions_user_created ON generation_sessions(user_id, created_at DESC);
CREATE INDEX idx_generation_sessions_request_id ON generation_sessions(request_id);
CREATE INDEX idx_generation_sessions_review_status ON generation_sessions(review_required, review_completed_at);
CREATE INDEX idx_generation_sessions_pending_review ON generation_sessions(user_id, review_required) 
  WHERE review_required = true AND review_completed_at IS NULL;

-- Provider and routing queries
CREATE INDEX idx_ai_model_registry_provider_active ON ai_model_registry(provider_slug, is_active);
CREATE INDEX idx_provider_health_provider_healthy ON provider_health(provider_slug, is_healthy);
CREATE INDEX idx_routing_decisions_provider_created ON routing_decisions(selected_provider, created_at DESC);

-- Safety and moderation queries
CREATE INDEX idx_moderation_decisions_user_created ON moderation_decisions(user_id, created_at DESC);
CREATE INDEX idx_safety_flags_severity_created ON safety_flags(severity_level, created_at DESC);
CREATE INDEX idx_hitl_enforcement_type_created ON hitl_enforcement(enforcement_type, created_at DESC);

-- Rate limiting and billing queries
CREATE INDEX idx_rate_limits_reset_times ON rate_limits(daily_reset_at, hourly_reset_at);
CREATE INDEX idx_usage_analytics_user_period ON usage_analytics(user_id, aggregation_period, period_start);

-- Vision and modality tracking
CREATE INDEX idx_request_logs_vision_usage ON request_logs(used_vision, created_at DESC);
CREATE INDEX idx_request_logs_modalities ON request_logs USING gin(input_modalities);

-- HNSW Vector Indexes for embedding similarity searches
CREATE INDEX idx_persona_embeddings_vector ON persona_embeddings 
USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_contact_embeddings_vector ON contact_embeddings 
USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_interaction_embeddings_vector ON interaction_embeddings 
USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_topic_embeddings_vector ON topic_embeddings 
USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- BRIN Indexes for time-series data
CREATE INDEX idx_request_logs_created_brin ON request_logs USING brin(created_at);
CREATE INDEX idx_crm_interactions_occurred_brin ON crm_interactions USING brin(occurred_at);
CREATE INDEX idx_usage_analytics_period_brin ON usage_analytics USING brin(period_start);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE extension_state_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE persona_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE interaction_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_topic_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE routing_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE hitl_enforcement ENABLE ROW LEVEL SECURITY;
ALTER TABLE duplicate_detection ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_guards ENABLE ROW LEVEL SECURITY;
ALTER TABLE copilot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sidebar_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_window_tracking ENABLE ROW LEVEL SECURITY;

-- User Data Isolation Policies
CREATE POLICY "user_profiles_isolation" ON user_profiles
  FOR ALL TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_preferences_isolation" ON user_preferences
  FOR ALL TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "crm_contacts_isolation" ON crm_contacts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "crm_interactions_isolation" ON crm_interactions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id);

-- Service Role Access Policies
CREATE POLICY "ai_model_registry_read" ON ai_model_registry
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "ai_model_registry_service_write" ON ai_model_registry
  FOR ALL TO service_role
  USING (true);

CREATE POLICY "request_logs_user_read" ON request_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "request_logs_service_write" ON request_logs
  FOR INSERT TO service_role
  WITH CHECK (true);

-- CRITICAL HITL enforcement policies
CREATE POLICY "generation_sessions_user_access" ON generation_sessions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "generation_sessions_service_create" ON generation_sessions
  FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "generation_sessions_service_update" ON generation_sessions
  FOR UPDATE TO service_role
  USING (true);

-- Safety and Moderation Access Policies
CREATE POLICY "moderation_decisions_user_read" ON moderation_decisions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "moderation_decisions_service_manage" ON moderation_decisions
  FOR ALL TO service_role
  USING (true);

CREATE POLICY "safety_flags_user_read" ON safety_flags
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "safety_flags_service_create" ON safety_flags
  FOR INSERT TO service_role
  WITH CHECK (true);

-- Rate Limiting Access Policies
CREATE POLICY "rate_limits_user_read" ON rate_limits
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "rate_limits_service_manage" ON rate_limits
  FOR ALL TO service_role
  USING (true);

-- =============================================================================
-- FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers to tables with updated_at columns
CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at 
  BEFORE UPDATE ON user_preferences 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at 
  BEFORE UPDATE ON subscription_plans 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_voice_personas_updated_at 
  BEFORE UPDATE ON voice_personas 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_templates_updated_at 
  BEFORE UPDATE ON content_templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_contacts_updated_at 
  BEFORE UPDATE ON crm_contacts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contact_topic_relations_updated_at 
  BEFORE UPDATE ON contact_topic_relations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_model_registry_updated_at 
  BEFORE UPDATE ON ai_model_registry 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Session message pruning function with explicit retention rules
CREATE OR REPLACE FUNCTION prune_session_messages()
RETURNS void AS $$
BEGIN
  -- Delete messages older than 30 days
  DELETE FROM session_messages 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- For active sessions, keep only the most recent 20 messages per session
  DELETE FROM session_messages 
  WHERE id NOT IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (
        PARTITION BY session_id 
        ORDER BY created_at DESC
      ) as rn
      FROM session_messages sm
      JOIN copilot_sessions cs ON sm.session_id = cs.id
      WHERE cs.ended_at IS NULL -- Active sessions only
    ) ranked
    WHERE rn <= 20
  );
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- INITIAL DATA
-- =============================================================================

-- AI Model Registry initial data
INSERT INTO ai_model_registry (provider_slug, model_name, context_window, capabilities) VALUES
('openai', 'gpt-4o', 128000, '{
  "textGeneration": true,
  "visionAnalysis": true,
  "embeddings": true,
  "maxContextTokens": 128000,
  "supportedImageFormats": ["jpeg", "png"]
}'::jsonb),
('openai', 'gpt-4o-vision', 128000, '{
  "textGeneration": true,
  "visionAnalysis": true,
  "embeddings": false,
  "maxContextTokens": 128000,
  "supportedImageFormats": ["jpeg", "png"]
}'::jsonb),
('openai', 'text-embedding-3-small', 8191, '{
  "textGeneration": false,
  "visionAnalysis": false,
  "embeddings": true,
  "maxContextTokens": 8191,
  "supportedImageFormats": []
}'::jsonb),
('gemini', 'gemini-1.5-pro', 1000000, '{
  "textGeneration": true,
  "visionAnalysis": true,
  "embeddings": false,
  "maxContextTokens": 1000000,
  "supportedImageFormats": ["jpeg", "png"]
}'::jsonb),
('gemini', 'gemini-1.5-pro-vision', 1000000, '{
  "textGeneration": true,
  "visionAnalysis": true,
  "embeddings": false,
  "maxContextTokens": 1000000,
  "supportedImageFormats": ["jpeg", "png"]
}'::jsonb);

-- Materialized view for real-time analytics
CREATE MATERIALIZED VIEW usage_analytics_realtime AS
SELECT 
  user_id,
  'generations_count' as metric_name,
  COUNT(*) as metric_value,
  'count' as metric_unit,
  'hourly' as aggregation_period,
  date_trunc('hour', created_at) as period_start,
  date_trunc('hour', created_at) + INTERVAL '1 hour' as period_end,
  NOW() as created_at
FROM request_logs 
WHERE request_type = 'generation' AND success = true
GROUP BY user_id, date_trunc('hour', created_at);

CREATE UNIQUE INDEX ON usage_analytics_realtime (user_id, period_start);