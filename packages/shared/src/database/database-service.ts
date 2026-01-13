/**
 * Database service layer for PostPhantom
 * DERIVED FROM: PostPhantom Database Design Specification v1.1
 * CRITICAL: Provides type-safe database operations with HITL enforcement
 */

import { SupabaseClient } from '@supabase/supabase-js'
import {
  // Domain A - Identity & User Configuration
  UserProfile, UserProfileInsert, UserProfileUpdate,
  UserPreferences, UserPreferencesInsert, UserPreferencesUpdate,
  SubscriptionPlan, SubscriptionPlanInsert, SubscriptionPlanUpdate,
  OnboardingProgress, OnboardingProgressInsert,
  ExtensionStateSync, ExtensionStateSyncInsert, ExtensionStateSyncUpdate,
  
  // Domain B - Assets & Voice Intelligence
  VoicePersona, VoicePersonaInsert, VoicePersonaUpdate,
  ContentTemplate, ContentTemplateInsert, ContentTemplateUpdate,
  PersonaEmbedding, PersonaEmbeddingInsert,
  TemplateVariable, TemplateVariableInsert,
  AssetSyncState, AssetSyncStateInsert, AssetSyncStateUpdate,
  
  // Domain C - Personal CRM
  CrmContact, CrmContactInsert, CrmContactUpdate,
  CrmInteraction, CrmInteractionInsert,
  CrmTopic, CrmTopicInsert,
  ContactEmbedding, ContactEmbeddingInsert,
  InteractionEmbedding, InteractionEmbeddingInsert,
  TopicEmbedding, TopicEmbeddingInsert,
  ContactTopicRelation, ContactTopicRelationInsert, ContactTopicRelationUpdate,
  
  // Domain D - AI Execution & Routing
  AIModelRegistry, AIModelRegistryInsert, AIModelRegistryUpdate,
  ProviderHealth, ProviderHealthInsert, ProviderHealthUpdate,
  RoutingDecision, RoutingDecisionInsert,
  RequestLog, RequestLogInsert,
  GenerationSession, GenerationSessionInsert, GenerationSessionUpdate,
  
  // Domain E - Safety & Governance
  ModerationDecision, ModerationDecisionInsert,
  SafetyFlag, SafetyFlagInsert,
  HitlEnforcement, HitlEnforcementInsert,
  DuplicateDetection, DuplicateDetectionInsert,
  
  // Domain F - Usage & Rate Limiting
  RateLimit, RateLimitInsert, RateLimitUpdate,
  UsageAnalytics, UsageAnalyticsInsert,
  BillingGuard, BillingGuardInsert, BillingGuardUpdate,
  
  // Domain G - Copilot & Session State
  CopilotSession, CopilotSessionInsert, CopilotSessionUpdate,
  SessionMessage, SessionMessageInsert,
  SidebarState, SidebarStateInsert, SidebarStateUpdate,
  ContextWindowTracking, ContextWindowTrackingInsert,
  
  // General Purpose
  ContextEmbedding, ContextEmbeddingInsert, ContextEmbeddingUpdate,
  
  // Constants and helpers
  DB_TABLES,
  ModelRegistryQuery,
  RequestLogQuery,
  GenerationSessionQuery,
  EmbeddingQuery,
  CrmContactQuery,
  DEFAULT_USER_PREFERENCES,
  DEFAULT_SUBSCRIPTION_PLAN,
  RATE_LIMITS,
  HITLWorkflowState,
  validateHITLWorkflow
} from '../types/database.js'

export class DatabaseService {
  constructor(private supabase: SupabaseClient) {}

  // =============================================================================
  // Domain A — Identity & User Configuration
  // =============================================================================

  // User Profiles
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await this.supabase
      .from(DB_TABLES.USER_PROFILES)
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch user profile: ${error.message}`)
    }
    return data || null
  }

  async createUserProfile(profile: UserProfileInsert): Promise<UserProfile> {
    const { data, error } = await this.supabase
      .from(DB_TABLES.USER_PROFILES)
      .insert(profile)
      .select()
      .single()

    if (error) throw new Error(`Failed to create user profile: ${error.message}`)
    return data
  }

  async updateUserProfile(userId: string, updates: UserProfileUpdate): Promise<UserProfile> {
    const { data, error } = await this.supabase
      .from(DB_TABLES.USER_PROFILES)
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw new Error(`Failed to update user profile: ${error.message}`)
    return data
  }

  // User Preferences
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    const { data, error } = await this.supabase
      .from(DB_TABLES.USER_PREFERENCES)
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code === 'PGRST116') {
      return this.createUserPreferences({
        user_id: userId,
        ...DEFAULT_USER_PREFERENCES
      })
    }

    if (error) throw new Error(`Failed to fetch user preferences: ${error.message}`)
    return data
  }

  async createUserPreferences(preferences: UserPreferencesInsert): Promise<UserPreferences> {
    const { data, error } = await this.supabase
      .from(DB_TABLES.USER_PREFERENCES)
      .insert(preferences)
      .select()
      .single()

    if (error) throw new Error(`Failed to create user preferences: ${error.message}`)
    return data
  }

  async updateUserPreferences(userId: string, updates: UserPreferencesUpdate): Promise<UserPreferences> {
    const { data, error } = await this.supabase
      .from(DB_TABLES.USER_PREFERENCES)
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw new Error(`Failed to update user preferences: ${error.message}`)
    return data
  }

  // Subscription Plans
  async getSubscriptionPlan(userId: string): Promise<SubscriptionPlan> {
    const { data, error } = await this.supabase
      .from(DB_TABLES.SUBSCRIPTION_PLANS)
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code === 'PGRST116') {
      return this.createSubscriptionPlan({
        user_id: userId,
        ...DEFAULT_SUBSCRIPTION_PLAN
      })
    }

    if (error) throw new Error(`Failed to fetch subscription plan: ${error.message}`)
    return data
  }

  async createSubscriptionPlan(plan: SubscriptionPlanInsert): Promise<SubscriptionPlan> {
    const { data, error } = await this.supabase
      .from(DB_TABLES.SUBSCRIPTION_PLANS)
      .insert(plan)
      .select()
      .single()

    if (error) throw new Error(`Failed to create subscription plan: ${error.message}`)
    return data
  }

  async updateSubscriptionPlan(userId: string, updates: SubscriptionPlanUpdate): Promise<SubscriptionPlan> {
    const { data, error } = await this.supabase
      .from(DB_TABLES.SUBSCRIPTION_PLANS)
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw new Error(`Failed to update subscription plan: ${error.message}`)
    return data
  }

  // Onboarding Progress
  async getOnboardingProgress(userId: string): Promise<OnboardingProgress[]> {
    const { data, error } = await this.supabase
      .from(DB_TABLES.ONBOARDING_PROGRESS)
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: true })

    if (error) throw new Error(`Failed to fetch onboarding progress: ${error.message}`)
    return data || []
  }

  async createOnboardingProgress(progress: OnboardingProgressInsert): Promise<OnboardingProgress> {
    const { data, error } = await this.supabase
      .from(DB_TABLES.ONBOARDING_PROGRESS)
      .insert(progress)
      .select()
      .single()

    if (error) throw new Error(`Failed to create onboarding progress: ${error.message}`)
    return data
  }

  // Extension State Sync
  async getExtensionStateSync(userId: string): Promise<ExtensionStateSync | null> {
    const { data, error } = await this.supabase
      .from(DB_TABLES.EXTENSION_STATE_SYNC)
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch extension state sync: ${error.message}`)
    }
    return data || null
  }

  async upsertExtensionStateSync(sync: ExtensionStateSyncInsert): Promise<ExtensionStateSync> {
    const { data, error } = await this.supabase
      .from(DB_TABLES.EXTENSION_STATE_SYNC)
      .upsert(sync)
      .select()
      .single()

    if (error) throw new Error(`Failed to upsert extension state sync: ${error.message}`)
    return data
  }

  // =============================================================================
  // Domain B — Assets & Voice Intelligence
  // =============================================================================

  // Voice Personas
  async getVoicePersonas(userId: string): Promise<VoicePersona[]> {
    const { data, error } = await this.supabase
      .from(DB_TABLES.VOICE_PERSONAS)
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw new Error(`Failed to fetch voice personas: ${error.message}`)
    return data || []
  }

  async createVoicePersona(persona: VoicePersonaInsert): Promise<VoicePersona> {
    const { data, error } = await this.supabase
      .from(DB_TABLES.VOICE_PERSONAS)
      .insert(persona)
      .select()
      .single()

    if (error) throw new Error(`Failed to create voice persona: ${error.message}`)
    return data
  }

  async updateVoicePersona(id: string, updates: VoicePersonaUpdate): Promise<VoicePersona> {
    const { data, error } = await this.supabase
      .from(DB_TABLES.VOICE_PERSONAS)
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(`Failed to update voice persona: ${error.message}`)
    return data
  }

  // Content Templates
  async getContentTemplates(userId: string, category?: string): Promise<ContentTemplate[]> {
    let query = this.supabase
      .from(DB_TABLES.CONTENT_TEMPLATES)
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw new Error(`Failed to fetch content templates: ${error.message}`)
    return data || []
  }

  async createContentTemplate(template: ContentTemplateInsert): Promise<ContentTemplate> {
    const { data, error } = await this.supabase
      .from(DB_TABLES.CONTENT_TEMPLATES)
      .insert(template)
      .select()
      .single()

    if (error) throw new Error(`Failed to create content template: ${error.message}`)
    return data
  }

  async updateContentTemplate(id: string, updates: ContentTemplateUpdate): Promise<ContentTemplate> {
    const { data, error } = await this.supabase
      .from(DB_TABLES.CONTENT_TEMPLATES)
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(`Failed to update content template: ${error.message}`)
    return data
  }

  // Persona Embeddings
  async createPersonaEmbedding(embedding: PersonaEmbeddingInsert): Promise<PersonaEmbedding> {
    const { data, error } = await this.supabase
      .from(DB_TABLES.PERSONA_EMBEDDINGS)
      .insert(embedding)
      .select()
      .single()

    if (error) throw new Error(`Failed to create persona embedding: ${error.message}`)
    return data
  }

  async findSimilarPersonas(
    queryEmbedding: number[],
    options: { similarity_threshold?: number; limit?: number } = {}
  ): Promise<PersonaEmbedding[]> {
    const { similarity_threshold = 0.8, limit = 10 } = options

    const { data, error } = await this.supabase
      .rpc('match_persona_embeddings', {
        query_embedding: queryEmbedding,
        similarity_threshold,
        match_count: limit
      })

    if (error) throw new Error(`Failed to find similar personas: ${error.message}`)
    return data || []
  }

  // =============================================================================
  // Domain D — AI Execution & Routing (CRITICAL HITL ENFORCEMENT)
  // =============================================================================

  // AI Model Registry
  async getAIModels(query?: ModelRegistryQuery): Promise<AIModelRegistry[]> {
    let queryBuilder = this.supabase
      .from(DB_TABLES.AI_MODEL_REGISTRY)
      .select('*')

    if (query?.provider_slug) {
      queryBuilder = queryBuilder.eq('provider_slug', query.provider_slug)
    }
    if (query?.is_active !== undefined) {
      queryBuilder = queryBuilder.eq('is_active', query.is_active)
    }

    const { data, error } = await queryBuilder
    if (error) throw new Error(`Failed to fetch AI models: ${error.message}`)
    return data || []
  }

  async createAIModel(model: AIModelRegistryInsert): Promise<AIModelRegistry> {
    const { data, error } = await this.supabase
      .from(DB_TABLES.AI_MODEL_REGISTRY)
      .insert(model)
      .select()
      .single()

    if (error) throw new Error(`Failed to create AI model: ${error.message}`)
    return data
  }

  // Provider Health
  async getProviderHealth(providerSlug?: string): Promise<ProviderHealth[]> {
    let query = this.supabase
      .from(DB_TABLES.PROVIDER_HEALTH)
      .select('*')

    if (providerSlug) {
      query = query.eq('provider_slug', providerSlug)
    }

    const { data, error } = await query.order('health_check_at', { ascending: false })
    if (error) throw new Error(`Failed to fetch provider health: ${error.message}`)
    return data || []
  }

  async updateProviderHealth(providerSlug: string, modelName: string, updates: ProviderHealthUpdate): Promise<ProviderHealth> {
    const { data, error } = await this.supabase
      .from(DB_TABLES.PROVIDER_HEALTH)
      .upsert({
        provider_slug: providerSlug,
        model_name: modelName,
        ...updates,
        health_check_at: new Date()
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to update provider health: ${error.message}`)
    return data
  }

  // Request Logs with Vision Tracking
  async logRequest(log: RequestLogInsert): Promise<RequestLog> {
    const { data, error } = await this.supabase
      .from(DB_TABLES.REQUEST_LOGS)
      .insert(log)
      .select()
      .single()

    if (error) throw new Error(`Failed to log request: ${error.message}`)
    return data
  }

  async getRequestLogs(query?: RequestLogQuery): Promise<RequestLog[]> {
    let queryBuilder = this.supabase
      .from(DB_TABLES.REQUEST_LOGS)
      .select('*')
      .order('created_at', { ascending: false })

    if (query?.user_id) {
      queryBuilder = queryBuilder.eq('user_id', query.user_id)
    }
    if (query?.provider) {
      queryBuilder = queryBuilder.eq('provider', query.provider)
    }
    if (query?.request_type) {
      queryBuilder = queryBuilder.eq('request_type', query.request_type)
    }
    if (query?.success !== undefined) {
      queryBuilder = queryBuilder.eq('success', query.success)
    }
    if (query?.used_vision !== undefined) {
      queryBuilder = queryBuilder.eq('used_vision', query.used_vision)
    }
    if (query?.date_from) {
      queryBuilder = queryBuilder.gte('created_at', query.date_from.toISOString())
    }
    if (query?.date_to) {
      queryBuilder = queryBuilder.lte('created_at', query.date_to.toISOString())
    }

    const { data, error } = await queryBuilder
    if (error) throw new Error(`Failed to fetch request logs: ${error.message}`)
    return data || []
  }

  // CRITICAL: Generation Sessions - HITL Enforcement
  async createGenerationSession(session: GenerationSessionInsert): Promise<GenerationSession> {
    const { data, error } = await this.supabase
      .from(DB_TABLES.GENERATION_SESSIONS)
      .insert(session)
      .select()
      .single()

    if (error) throw new Error(`Failed to create generation session: ${error.message}`)
    return data
  }

  async getGenerationSession(id: string): Promise<GenerationSession | null> {
    const { data, error } = await this.supabase
      .from(DB_TABLES.GENERATION_SESSIONS)
      .select('*')
      .eq('id', id)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch generation session: ${error.message}`)
    }
    return data || null
  }

  async getGenerationSessionByRequestId(requestId: string): Promise<GenerationSession | null> {
    const { data, error } = await this.supabase
      .from(DB_TABLES.GENERATION_SESSIONS)
      .select('*')
      .eq('request_id', requestId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch generation session by request ID: ${error.message}`)
    }
    return data || null
  }

  async updateGenerationSession(id: string, updates: GenerationSessionUpdate): Promise<GenerationSession> {
    const { data, error } = await this.supabase
      .from(DB_TABLES.GENERATION_SESSIONS)
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(`Failed to update generation session: ${error.message}`)
    return data
  }

  async getPendingReviewSessions(userId: string): Promise<GenerationSession[]> {
    const { data, error } = await this.supabase
      .from(DB_TABLES.GENERATION_SESSIONS)
      .select('*')
      .eq('user_id', userId)
      .eq('review_required', true)
      .is('review_completed_at', null)
      .order('created_at', { ascending: false })

    if (error) throw new Error(`Failed to fetch pending review sessions: ${error.message}`)
    return data || []
  }

  // CRITICAL: HITL Workflow Validation
  async validateAndCompleteReview(
    sessionId: string, 
    approvedDraftIndex: number
  ): Promise<{ session: GenerationSession; workflow: HITLWorkflowState }> {
    const session = await this.getGenerationSession(sessionId)
    if (!session) {
      throw new Error('Generation session not found')
    }

    // Validate draft index
    if (approvedDraftIndex < 0 || approvedDraftIndex >= session.draft_count) {
      throw new Error(`Invalid draft index: ${approvedDraftIndex}. Must be between 0 and ${session.draft_count - 1}`)
    }

    // Complete review
    const updatedSession = await this.updateGenerationSession(sessionId, {
      review_completed_at: new Date(),
      approved_draft_index: approvedDraftIndex
    })

    const workflow = validateHITLWorkflow(updatedSession)
    return { session: updatedSession, workflow }
  }

  async markContentInserted(sessionId: string): Promise<GenerationSession> {
    const session = await this.getGenerationSession(sessionId)
    if (!session) {
      throw new Error('Generation session not found')
    }

    const workflow = validateHITLWorkflow(session)
    if (!workflow.canInsert) {
      throw new Error(`Cannot insert content: ${workflow.reason}`)
    }

    return this.updateGenerationSession(sessionId, {
      inserted_at: new Date()
    })
  }

  // =============================================================================
  // Domain F — Usage, Rate Limiting & Billing Guards
  // =============================================================================

  // Rate Limiting
  async getRateLimit(userId: string): Promise<RateLimit> {
    const { data, error } = await this.supabase
      .from(DB_TABLES.RATE_LIMITS)
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code === 'PGRST116') {
      return this.createRateLimit({
        user_id: userId,
        daily_count: 0,
        hourly_count: 0,
        daily_reset_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        hourly_reset_at: new Date(Date.now() + 60 * 60 * 1000),
        is_locked: false
      })
    }

    if (error) throw new Error(`Failed to fetch rate limit: ${error.message}`)
    return data
  }

  async createRateLimit(rateLimit: RateLimitInsert): Promise<RateLimit> {
    const { data, error } = await this.supabase
      .from(DB_TABLES.RATE_LIMITS)
      .insert(rateLimit)
      .select()
      .single()

    if (error) throw new Error(`Failed to create rate limit: ${error.message}`)
    return data
  }

  async updateRateLimit(userId: string, updates: RateLimitUpdate): Promise<RateLimit> {
    const { data, error } = await this.supabase
      .from(DB_TABLES.RATE_LIMITS)
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw new Error(`Failed to update rate limit: ${error.message}`)
    return data
  }

  async incrementRequestCount(userId: string): Promise<RateLimit> {
    const now = new Date()
    const rateLimit = await this.getRateLimit(userId)

    let updates: RateLimitUpdate = {}
    
    if (now > rateLimit.daily_reset_at) {
      updates.daily_count = 1
      updates.daily_reset_at = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    } else {
      updates.daily_count = rateLimit.daily_count + 1
    }

    if (now > rateLimit.hourly_reset_at) {
      updates.hourly_count = 1
      updates.hourly_reset_at = new Date(now.getTime() + 60 * 60 * 1000)
    } else {
      updates.hourly_count = rateLimit.hourly_count + 1
    }

    updates.last_request_at = now

    if (updates.hourly_count >= RATE_LIMITS.HOURLY_REQUEST_LIMIT) {
      updates.is_locked = true
      updates.lock_expires_at = new Date(now.getTime() + RATE_LIMITS.HOURLY_LOCKOUT_MINUTES * 60 * 1000)
      updates.lock_reason = 'hourly_limit'
    }

    return this.updateRateLimit(userId, updates)
  }

  async checkRateLimit(userId: string): Promise<{
    allowed: boolean
    reason?: string
    resetAt?: Date
    remainingRequests?: number
  }> {
    const rateLimit = await this.getRateLimit(userId)
    const now = new Date()

    if (rateLimit.is_locked && rateLimit.lock_expires_at && now < rateLimit.lock_expires_at) {
      return {
        allowed: false,
        reason: rateLimit.lock_reason || 'LOCKED',
        resetAt: rateLimit.lock_expires_at
      }
    }

    if (rateLimit.is_locked && rateLimit.lock_expires_at && now >= rateLimit.lock_expires_at) {
      await this.updateRateLimit(userId, {
        is_locked: false,
        lock_expires_at: null,
        lock_reason: null
      })
    }

    if (rateLimit.daily_count >= RATE_LIMITS.DAILY_GENERATION_LIMIT) {
      return {
        allowed: false,
        reason: 'DAILY_LIMIT_EXCEEDED',
        resetAt: rateLimit.daily_reset_at,
        remainingRequests: 0
      }
    }

    if (rateLimit.last_request_at) {
      const cooldownEnd = new Date(rateLimit.last_request_at.getTime() + RATE_LIMITS.COOLDOWN_MINUTES * 60 * 1000)
      if (now < cooldownEnd) {
        return {
          allowed: false,
          reason: 'COOLDOWN_ACTIVE',
          resetAt: cooldownEnd
        }
      }
    }

    return {
      allowed: true,
      remainingRequests: RATE_LIMITS.DAILY_GENERATION_LIMIT - rateLimit.daily_count
    }
  }

  // =============================================================================
  // HITL ENFORCEMENT WORKFLOW HELPERS
  // =============================================================================

  async createGenerationWorkflow(
    userId: string,
    requestLog: RequestLogInsert,
    draftCount: number,
    requiresReview: boolean = true
  ): Promise<{ requestLog: RequestLog; session: GenerationSession }> {
    // Create request log first
    const loggedRequest = await this.logRequest(requestLog)

    // Create generation session with HITL enforcement
    const session = await this.createGenerationSession({
      user_id: userId,
      request_id: loggedRequest.id,
      draft_count: draftCount,
      review_required: requiresReview
    })

    return { requestLog: loggedRequest, session }
  }

  async getGenerationWorkflowStatus(sessionId: string): Promise<{
    session: GenerationSession
    workflow: HITLWorkflowState
    requestLog?: RequestLog
  }> {
    const session = await this.getGenerationSession(sessionId)
    if (!session) {
      throw new Error('Generation session not found')
    }

    const workflow = validateHITLWorkflow(session)

    // Optionally fetch request log
    const { data: requestLog } = await this.supabase
      .from(DB_TABLES.REQUEST_LOGS)
      .select('*')
      .eq('id', session.request_id)
      .single()

    return { session, workflow, requestLog: requestLog || undefined }
  }

  // =============================================================================
  // General Purpose Context Embeddings (Backward Compatibility)
  // =============================================================================

  async createEmbedding(embedding: ContextEmbeddingInsert): Promise<ContextEmbedding> {
    const { data, error } = await this.supabase
      .from(DB_TABLES.CONTEXT_EMBEDDINGS)
      .insert(embedding)
      .select()
      .single()

    if (error) throw new Error(`Failed to create embedding: ${error.message}`)
    return data
  }

  async findSimilarEmbeddings(
    userId: string,
    queryEmbedding: number[],
    options: EmbeddingQuery = {}
  ): Promise<ContextEmbedding[]> {
    const {
      content_type,
      similarity_threshold = 0.8,
      limit = 10
    } = options

    let queryBuilder = this.supabase
      .from(DB_TABLES.CONTEXT_EMBEDDINGS)
      .select('*')
      .eq('user_id', userId)

    if (content_type) {
      queryBuilder = queryBuilder.eq('content_type', content_type)
    }

    // Use pgvector similarity search
    const { data, error } = await queryBuilder
      .rpc('match_embeddings', {
        query_embedding: queryEmbedding,
        similarity_threshold,
        match_count: limit
      })

    if (error) throw new Error(`Failed to find similar embeddings: ${error.message}`)
    return data || []
  }

  async getEmbeddingsByHash(userId: string, contentHash: string): Promise<ContextEmbedding[]> {
    const { data, error } = await this.supabase
      .from(DB_TABLES.CONTEXT_EMBEDDINGS)
      .select('*')
      .eq('user_id', userId)
      .eq('content_hash', contentHash)

    if (error) throw new Error(`Failed to fetch embeddings by hash: ${error.message}`)
    return data || []
  }
}

// Helper function to create database service instance
export function createDatabaseService(supabase: SupabaseClient): DatabaseService {
  return new DatabaseService(supabase)
}