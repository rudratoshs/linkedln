/**
 * Database types for PostPhantom LinkedIn Ghostwriter
 * DERIVED FROM: PostPhantom Database Design Specification v1.1
 * CRITICAL: These types correspond exactly to the PostgreSQL schema
 */

// =============================================================================
// Domain A — Identity & User Configuration
// =============================================================================

export interface UserProfile {
  user_id: string
  full_name: string
  linkedin_profile_url?: string
  profile_metadata: Record<string, any>
  created_at: Date
  updated_at: Date
}

export interface UserPreferences {
  user_id: string
  preferred_provider: 'openai' | 'gemini'
  generation_temperature: number
  max_drafts_per_request: number
  anti_cheerleader_enabled: boolean
  typing_speed_multiplier: number
  preferences: Record<string, any>
  created_at: Date
  updated_at: Date
}

export interface SubscriptionPlan {
  user_id: string
  plan_type: 'free' | 'pro' | 'enterprise'
  daily_generation_limit: number
  monthly_generation_limit: number
  features_enabled: Record<string, any>
  plan_expires_at?: Date
  created_at: Date
  updated_at: Date
}

export interface OnboardingProgress {
  id: string
  user_id: string
  step_name: 'welcome' | 'linkedin_connect' | 'voice_setup' | 'first_generation' | 'dashboard_tour'
  completed_at: Date
  step_data: Record<string, any>
}

export interface ExtensionStateSync {
  user_id: string
  extension_version?: string
  last_sync_at: Date
  sync_data: Record<string, any>
  is_extension_active: boolean
}

// =============================================================================
// Domain B — Assets & Voice Intelligence
// =============================================================================

export interface VoicePersona {
  id: string
  user_id: string
  persona_name: string
  persona_description: string
  tone_attributes: Record<string, any>
  example_phrases: string[]
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface ContentTemplate {
  id: string
  user_id: string
  template_name: string
  template_structure: string
  category: 'comment' | 'post' | 'message' | 'connection_request'
  variable_schema: Record<string, any>
  usage_count: number
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface PersonaEmbedding {
  id: string
  persona_id: string
  embedding_hash: string
  embedding: number[]
  metadata: Record<string, any>
  created_at: Date
}

export interface TemplateVariable {
  id: string
  template_id: string
  variable_name: string
  variable_type: 'text' | 'number' | 'date' | 'boolean' | 'select'
  default_value?: string
  validation_rules: Record<string, any>
}

export interface AssetSyncState {
  user_id: string
  asset_type: 'personas' | 'templates' | 'preferences'
  last_sync_at: Date
  sync_version: number
  sync_status: 'pending' | 'syncing' | 'completed' | 'failed'
}

// =============================================================================
// Domain C — Personal CRM (GraphRAG Memory)
// =============================================================================

export interface CrmContact {
  id: string
  user_id: string
  contact_hash: string
  contact_type: 'connection' | 'follower' | 'company' | 'prospect'
  relationship_strength: number
  last_interaction_at?: Date
  interaction_count: number
  metadata: Record<string, any>
  created_at: Date
  updated_at: Date
}

export interface CrmInteraction {
  id: string
  user_id: string
  contact_id: string
  interaction_type: 'comment' | 'like' | 'share' | 'message' | 'connection' | 'view'
  interaction_hash: string
  sentiment_score?: number
  engagement_level?: 'low' | 'medium' | 'high'
  occurred_at: Date
  metadata: Record<string, any>
}

export interface CrmTopic {
  id: string
  user_id: string
  topic_name: string
  topic_hash: string
  relevance_score: number
  mention_count: number
  last_mentioned_at?: Date
  metadata: Record<string, any>
  created_at: Date
}

export interface ContactEmbedding {
  id: string
  contact_id: string
  embedding_hash: string
  embedding: number[]
  embedding_type: 'profile' | 'interaction_summary' | 'topic_affinity'
  metadata: Record<string, any>
  created_at: Date
}

export interface InteractionEmbedding {
  id: string
  interaction_id: string
  embedding_hash: string
  embedding: number[]
  metadata: Record<string, any>
  created_at: Date
}

export interface TopicEmbedding {
  id: string
  topic_id: string
  embedding_hash: string
  embedding: number[]
  metadata: Record<string, any>
  created_at: Date
}

export interface ContactTopicRelation {
  id: string
  contact_id: string
  topic_id: string
  relationship_strength: number
  relationship_type: 'mentions' | 'expertise' | 'interest' | 'collaboration'
  created_at: Date
  updated_at: Date
}

// =============================================================================
// Domain D — AI Execution & Routing
// =============================================================================

export interface AIModelRegistry {
  id: string
  provider_slug: 'openai' | 'gemini'
  model_name: string
  context_window: number
  is_active: boolean
  capabilities: ModelCapabilities
  cost_per_token?: number
  created_at: Date
  updated_at: Date
}

export interface ModelCapabilities {
  textGeneration: boolean
  visionAnalysis: boolean
  embeddings: boolean
  maxContextTokens: number
  supportedImageFormats: string[]
}

export interface ProviderHealth {
  id: string
  provider_slug: 'openai' | 'gemini'
  model_name: string
  is_healthy: boolean
  failure_count: number
  last_failure_at?: Date
  last_success_at?: Date
  cooldown_until?: Date
  health_check_at: Date
}

export interface RoutingDecision {
  id: string
  user_id: string
  request_hash: string
  selected_provider: 'openai' | 'gemini'
  selected_model: string
  routing_reason: 'user_preference' | 'token_limit' | 'video_input' | 'provider_health' | 'default'
  estimated_tokens?: number
  user_preference?: string
  provider_health_snapshot?: Record<string, any>
  created_at: Date
}

export interface RequestLog {
  id: string
  user_id: string
  provider: 'openai' | 'gemini'
  model_name: string
  estimated_tokens?: number
  actual_tokens?: number
  safety_ratings?: SafetyRating[]
  request_type: 'generation' | 'embedding' | 'moderation'
  success: boolean
  error_message?: string
  response_time_ms?: number
  used_vision: boolean
  input_modalities: Record<string, any>
  created_at: Date
}

export interface SafetyRating {
  category: string
  probability: string
  blocked?: boolean
}

// CRITICAL HITL ENFORCEMENT TABLE
export interface GenerationSession {
  id: string
  user_id: string
  request_id: string
  draft_count: number
  review_required: boolean
  review_completed_at?: Date
  approved_draft_index?: number
  inserted_at?: Date
  created_at: Date
}

// =============================================================================
// Domain E — Safety, Moderation & Governance
// =============================================================================

export interface ModerationDecision {
  id: string
  user_id: string
  content_hash: string
  provider: 'openai' | 'gemini'
  decision: 'approved' | 'rejected' | 'flagged'
  confidence_score?: number
  flagged_categories: string[]
  decision_metadata: Record<string, any>
  created_at: Date
}

export interface SafetyFlag {
  id: string
  user_id: string
  flag_type: 'content_violation' | 'rate_limit_abuse' | 'suspicious_activity' | 'api_misuse'
  flag_reason: string
  severity_level: 'low' | 'medium' | 'high' | 'critical'
  auto_resolved: boolean
  resolved_at?: Date
  resolution_notes?: string
  created_at: Date
}

export interface HitlEnforcement {
  id: string
  user_id: string
  session_hash: string
  enforcement_type: 'draft_review_required' | 'anti_cheerleader_warning' | 'rate_limit_warning' | 'safety_interstitial'
  enforcement_reason: string
  user_action?: string
  bypassed: boolean
  bypass_reason?: string
  created_at: Date
}

export interface DuplicateDetection {
  id: string
  user_id: string
  content_hash: string
  similarity_hash: string
  detection_method: 'exact_hash' | 'fuzzy_hash' | 'semantic_similarity'
  similarity_score?: number
  first_seen_at: Date
  occurrence_count: number
}

// =============================================================================
// Domain F — Usage, Rate Limiting & Billing Guards
// =============================================================================

export interface RateLimit {
  user_id: string
  daily_count: number
  hourly_count: number
  last_request_at?: Date
  daily_reset_at: Date
  hourly_reset_at: Date
  is_locked: boolean
  lock_expires_at?: Date
  lock_reason?: 'hourly_limit' | 'daily_limit' | 'safety_violation' | 'manual_lock'
}

export interface UsageAnalytics {
  id: string
  user_id: string
  metric_name: 'generations_count' | 'tokens_consumed' | 'api_calls' | 'session_duration'
  metric_value: number
  metric_unit: 'count' | 'tokens' | 'milliseconds' | 'bytes'
  aggregation_period: 'daily' | 'weekly' | 'monthly'
  period_start: Date
  period_end: Date
  metadata: Record<string, any>
  created_at: Date
}

export interface BillingGuard {
  user_id: string
  monthly_spend_limit: number
  current_month_spend: number
  spend_reset_at: Date
  overage_protection: boolean
  overage_threshold: number
  last_billing_check: Date
}

// =============================================================================
// Domain G — Copilot & Session State
// =============================================================================

export interface CopilotSession {
  id: string
  user_id: string
  session_hash: string
  session_type: 'content_generation' | 'persona_chat' | 'template_creation' | 'crm_query'
  context_window_size: number
  total_messages: number
  started_at: Date
  last_activity_at: Date
  ended_at?: Date
  session_metadata: Record<string, any>
}

export interface SessionMessage {
  id: string
  session_id: string
  message_hash: string
  message_type: 'user_input' | 'ai_response' | 'system_prompt' | 'context_injection'
  message_role: 'user' | 'assistant' | 'system'
  token_count?: number
  embedding_id?: string
  created_at: Date
  metadata: Record<string, any>
}

export interface SidebarState {
  user_id: string
  is_visible: boolean
  position_x: number
  position_y: number
  width: number
  height: number
  active_tab: 'copilot' | 'personas' | 'templates' | 'crm' | 'analytics'
  ui_preferences: Record<string, any>
  last_updated_at: Date
}

export interface ContextWindowTracking {
  id: string
  session_id: string
  window_snapshot: Record<string, any>
  token_count: number
  compression_ratio?: number
  created_at: Date
}

// General Context Embeddings (for backward compatibility)
export interface ContextEmbedding {
  id: string
  user_id: string
  content_hash: string
  content_type: 'interaction' | 'contact' | 'topic' | 'general'
  embedding: number[]
  metadata: Record<string, any> // Metadata only, never user content or generated text
  created_at: Date
}

// =============================================================================
// DATABASE TABLE NAMES (EXACT MATCH TO SCHEMA)
// =============================================================================

export const DB_TABLES = {
  // Domain A
  USER_PROFILES: 'user_profiles',
  USER_PREFERENCES: 'user_preferences',
  SUBSCRIPTION_PLANS: 'subscription_plans',
  ONBOARDING_PROGRESS: 'onboarding_progress',
  EXTENSION_STATE_SYNC: 'extension_state_sync',
  
  // Domain B
  VOICE_PERSONAS: 'voice_personas',
  CONTENT_TEMPLATES: 'content_templates',
  PERSONA_EMBEDDINGS: 'persona_embeddings',
  TEMPLATE_VARIABLES: 'template_variables',
  ASSET_SYNC_STATE: 'asset_sync_state',
  
  // Domain C
  CRM_CONTACTS: 'crm_contacts',
  CRM_INTERACTIONS: 'crm_interactions',
  CRM_TOPICS: 'crm_topics',
  CONTACT_EMBEDDINGS: 'contact_embeddings',
  INTERACTION_EMBEDDINGS: 'interaction_embeddings',
  TOPIC_EMBEDDINGS: 'topic_embeddings',
  CONTACT_TOPIC_RELATIONS: 'contact_topic_relations',
  
  // Domain D
  AI_MODEL_REGISTRY: 'ai_model_registry',
  PROVIDER_HEALTH: 'provider_health',
  ROUTING_DECISIONS: 'routing_decisions',
  REQUEST_LOGS: 'request_logs',
  GENERATION_SESSIONS: 'generation_sessions',
  
  // Domain E
  MODERATION_DECISIONS: 'moderation_decisions',
  SAFETY_FLAGS: 'safety_flags',
  HITL_ENFORCEMENT: 'hitl_enforcement',
  DUPLICATE_DETECTION: 'duplicate_detection',
  
  // Domain F
  RATE_LIMITS: 'rate_limits',
  USAGE_ANALYTICS: 'usage_analytics',
  BILLING_GUARDS: 'billing_guards',
  
  // Domain G
  COPILOT_SESSIONS: 'copilot_sessions',
  SESSION_MESSAGES: 'session_messages',
  SIDEBAR_STATE: 'sidebar_state',
  CONTEXT_WINDOW_TRACKING: 'context_window_tracking',
  
  // General Purpose
  CONTEXT_EMBEDDINGS: 'context_embeddings'
} as const

// =============================================================================
// INSERT TYPES (WITHOUT AUTO-GENERATED FIELDS)
// =============================================================================

export type UserProfileInsert = Omit<UserProfile, 'created_at' | 'updated_at'>
export type UserPreferencesInsert = Omit<UserPreferences, 'created_at' | 'updated_at'>
export type SubscriptionPlanInsert = Omit<SubscriptionPlan, 'created_at' | 'updated_at'>
export type OnboardingProgressInsert = Omit<OnboardingProgress, 'id'>
export type ExtensionStateSyncInsert = Omit<ExtensionStateSync, 'last_sync_at'>

export type VoicePersonaInsert = Omit<VoicePersona, 'id' | 'created_at' | 'updated_at'>
export type ContentTemplateInsert = Omit<ContentTemplate, 'id' | 'created_at' | 'updated_at'>
export type PersonaEmbeddingInsert = Omit<PersonaEmbedding, 'id' | 'created_at'>
export type TemplateVariableInsert = Omit<TemplateVariable, 'id'>
export type AssetSyncStateInsert = Omit<AssetSyncState, 'last_sync_at'>

export type CrmContactInsert = Omit<CrmContact, 'id' | 'created_at' | 'updated_at'>
export type CrmInteractionInsert = Omit<CrmInteraction, 'id'>
export type CrmTopicInsert = Omit<CrmTopic, 'id' | 'created_at'>
export type ContactEmbeddingInsert = Omit<ContactEmbedding, 'id' | 'created_at'>
export type InteractionEmbeddingInsert = Omit<InteractionEmbedding, 'id' | 'created_at'>
export type TopicEmbeddingInsert = Omit<TopicEmbedding, 'id' | 'created_at'>
export type ContactTopicRelationInsert = Omit<ContactTopicRelation, 'id' | 'created_at' | 'updated_at'>

export type AIModelRegistryInsert = Omit<AIModelRegistry, 'id' | 'created_at' | 'updated_at'>
export type ProviderHealthInsert = Omit<ProviderHealth, 'id' | 'health_check_at'>
export type RoutingDecisionInsert = Omit<RoutingDecision, 'id' | 'created_at'>
export type RequestLogInsert = Omit<RequestLog, 'id' | 'created_at'>
export type GenerationSessionInsert = Omit<GenerationSession, 'id' | 'created_at'>

export type ModerationDecisionInsert = Omit<ModerationDecision, 'id' | 'created_at'>
export type SafetyFlagInsert = Omit<SafetyFlag, 'id' | 'created_at'>
export type HitlEnforcementInsert = Omit<HitlEnforcement, 'id' | 'created_at'>
export type DuplicateDetectionInsert = Omit<DuplicateDetection, 'id' | 'first_seen_at'>

export type RateLimitInsert = Omit<RateLimit, 'user_id'>
export type UsageAnalyticsInsert = Omit<UsageAnalytics, 'id' | 'created_at'>
export type BillingGuardInsert = Omit<BillingGuard, 'user_id'>

export type CopilotSessionInsert = Omit<CopilotSession, 'id' | 'started_at' | 'last_activity_at'>
export type SessionMessageInsert = Omit<SessionMessage, 'id' | 'created_at'>
export type SidebarStateInsert = Omit<SidebarState, 'last_updated_at'>
export type ContextWindowTrackingInsert = Omit<ContextWindowTracking, 'id' | 'created_at'>

// =============================================================================
// UPDATE TYPES (PARTIAL UPDATES ALLOWED)
// =============================================================================

export type UserProfileUpdate = Partial<Omit<UserProfile, 'user_id' | 'created_at' | 'updated_at'>>
export type UserPreferencesUpdate = Partial<Omit<UserPreferences, 'user_id' | 'created_at' | 'updated_at'>>
export type SubscriptionPlanUpdate = Partial<Omit<SubscriptionPlan, 'user_id' | 'created_at' | 'updated_at'>>
export type ExtensionStateSyncUpdate = Partial<Omit<ExtensionStateSync, 'user_id'>>

export type VoicePersonaUpdate = Partial<Omit<VoicePersona, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
export type ContentTemplateUpdate = Partial<Omit<ContentTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
export type AssetSyncStateUpdate = Partial<Omit<AssetSyncState, 'user_id' | 'asset_type'>>

export type CrmContactUpdate = Partial<Omit<CrmContact, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
export type ContactTopicRelationUpdate = Partial<Omit<ContactTopicRelation, 'id' | 'contact_id' | 'topic_id' | 'created_at' | 'updated_at'>>

export type AIModelRegistryUpdate = Partial<Omit<AIModelRegistry, 'id' | 'created_at' | 'updated_at'>>
export type ProviderHealthUpdate = Partial<Omit<ProviderHealth, 'id' | 'provider_slug' | 'model_name'>>
export type GenerationSessionUpdate = Partial<Omit<GenerationSession, 'id' | 'user_id' | 'request_id' | 'created_at'>>

export type RateLimitUpdate = Partial<Omit<RateLimit, 'user_id'>>
export type BillingGuardUpdate = Partial<Omit<BillingGuard, 'user_id'>>

export type CopilotSessionUpdate = Partial<Omit<CopilotSession, 'id' | 'user_id' | 'started_at'>>
export type SidebarStateUpdate = Partial<Omit<SidebarState, 'user_id'>>

export type ContextEmbeddingInsert = Omit<ContextEmbedding, 'id' | 'created_at'>
export type ContextEmbeddingUpdate = Partial<Omit<ContextEmbedding, 'id' | 'created_at'>>

// =============================================================================
// QUERY TYPES FOR COMMON OPERATIONS
// =============================================================================

export interface ModelRegistryQuery {
  provider_slug?: 'openai' | 'gemini'
  is_active?: boolean
  capabilities?: Partial<ModelCapabilities>
}

export interface RequestLogQuery {
  user_id?: string
  provider?: 'openai' | 'gemini'
  request_type?: 'generation' | 'embedding' | 'moderation'
  success?: boolean
  used_vision?: boolean
  date_from?: Date
  date_to?: Date
}

export interface GenerationSessionQuery {
  user_id?: string
  review_required?: boolean
  review_completed?: boolean
  date_from?: Date
  date_to?: Date
}

export interface EmbeddingQuery {
  user_id?: string
  content_type?: string
  embedding_type?: string
  similarity_threshold?: number
  limit?: number
}

export interface CrmContactQuery {
  user_id?: string
  contact_type?: 'connection' | 'follower' | 'company' | 'prospect'
  relationship_strength_min?: number
  last_interaction_after?: Date
}

// =============================================================================
// CONSTANTS AND DEFAULTS
// =============================================================================

export const RATE_LIMITS = {
  DAILY_GENERATION_LIMIT: 50,
  COOLDOWN_MINUTES: 2,
  HOURLY_REQUEST_LIMIT: 10,
  HOURLY_LOCKOUT_MINUTES: 30
} as const

export const DEFAULT_USER_PREFERENCES: Omit<UserPreferences, 'user_id' | 'created_at' | 'updated_at'> = {
  preferred_provider: 'openai',
  generation_temperature: 0.7,
  max_drafts_per_request: 3,
  anti_cheerleader_enabled: true,
  typing_speed_multiplier: 1.0,
  preferences: {}
}

export const DEFAULT_SUBSCRIPTION_PLAN: Omit<SubscriptionPlan, 'user_id' | 'created_at' | 'updated_at'> = {
  plan_type: 'free',
  daily_generation_limit: 50,
  monthly_generation_limit: 1500,
  features_enabled: {}
}

// =============================================================================
// HITL ENFORCEMENT HELPERS
// =============================================================================

export interface HITLWorkflowState {
  canInsert: boolean
  requiresReview: boolean
  reviewCompleted: boolean
  approvedDraftIndex?: number
  reason: string
}

export function validateHITLWorkflow(session: GenerationSession): HITLWorkflowState {
  if (!session.review_required) {
    return {
      canInsert: true,
      requiresReview: false,
      reviewCompleted: true,
      reason: 'Review not required'
    }
  }

  if (!session.review_completed_at || session.approved_draft_index === null || session.approved_draft_index === undefined) {
    return {
      canInsert: false,
      requiresReview: true,
      reviewCompleted: false,
      reason: 'Review required but not completed'
    }
  }

  return {
    canInsert: true,
    requiresReview: true,
    reviewCompleted: true,
    approvedDraftIndex: session.approved_draft_index,
    reason: 'Review completed and draft approved'
  }
}