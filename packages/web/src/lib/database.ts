/**
 * Database service for PostPhantom Web Dashboard
 * Provides typed access to Supabase database with proper error handling
 */

import { authService } from './auth'
import type { SupabaseClient } from '@supabase/supabase-js'

// Database types based on the schema
export interface VoicePersona {
  id: string
  user_id: string
  persona_name: string
  persona_description: string
  tone_attributes: Record<string, any>
  example_phrases: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface RequestLog {
  id: string
  user_id: string
  provider: string
  model_name: string
  estimated_tokens?: number
  actual_tokens?: number
  safety_ratings?: Record<string, any>
  request_type: 'generation' | 'embedding' | 'moderation'
  success: boolean
  error_message?: string
  response_time_ms?: number
  used_vision: boolean
  input_modalities: Record<string, any>
  created_at: string
}

export interface UserPreferences {
  user_id: string
  preferred_provider: 'openai' | 'gemini'
  generation_temperature: number
  max_drafts_per_request: number
  anti_cheerleader_enabled: boolean
  typing_speed_multiplier: number
  preferences: Record<string, any>
  created_at: string
  updated_at: string
}

export interface UsageAnalytics {
  id: string
  user_id: string
  metric_name: string
  metric_value: number
  metric_unit: string
  aggregation_period: 'daily' | 'weekly' | 'monthly'
  period_start: string
  period_end: string
  metadata: Record<string, any>
  created_at: string
}

export interface RateLimit {
  user_id: string
  daily_count: number
  hourly_count: number
  last_request_at?: string
  daily_reset_at: string
  hourly_reset_at: string
  is_locked: boolean
  lock_expires_at?: string
  lock_reason?: string
}

export interface SubscriptionPlan {
  user_id: string
  plan_type: 'free' | 'pro' | 'enterprise'
  daily_generation_limit: number
  monthly_generation_limit: number
  features_enabled: Record<string, any>
  plan_expires_at?: string
  created_at: string
  updated_at: string
}

export interface BillingGuard {
  user_id: string
  monthly_spend_limit: number
  current_month_spend: number
  spend_reset_at: string
  overage_protection: boolean
  overage_threshold: number
  last_billing_check: string
}

/**
 * Database service class providing typed access to PostPhantom data
 */
export class DatabaseService {
  private supabase: SupabaseClient

  constructor() {
    this.supabase = authService.getSupabaseClient()
  }

  // Voice Personas CRUD operations
  async getVoicePersonas(): Promise<VoicePersona[]> {
    const { data, error } = await this.supabase
      .from('voice_personas')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      if (error.message.includes('Could not find the table') || error.code === 'PGRST106') {
        throw new Error('Database tables not found. Please run the database migrations first.')
      }
      throw new Error(`Failed to fetch voice personas: ${error.message}`)
    }

    return data || []
  }

  async createVoicePersona(persona: Omit<VoicePersona, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<VoicePersona> {
    const userId = authService.getUserId()
    if (!userId) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await this.supabase
      .from('voice_personas')
      .insert({
        ...persona,
        user_id: userId
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create voice persona: ${error.message}`)
    }

    return data
  }

  async updateVoicePersona(id: string, updates: Partial<VoicePersona>): Promise<VoicePersona> {
    const { data, error } = await this.supabase
      .from('voice_personas')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update voice persona: ${error.message}`)
    }

    return data
  }

  async deleteVoicePersona(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('voice_personas')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete voice persona: ${error.message}`)
    }
  }

  // Request logs for history page
  async getRequestLogs(limit = 50, offset = 0): Promise<RequestLog[]> {
    const { data, error } = await this.supabase
      .from('request_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error(`Failed to fetch request logs: ${error.message}`)
    }

    return data || []
  }

  async getRequestLogsSummary(): Promise<{
    totalRequests: number
    successfulRequests: number
    failedRequests: number
    totalTokens: number
    providerUsage: Record<string, number>
  }> {
    const userId = authService.getUserId()
    if (!userId) {
      throw new Error('User not authenticated')
    }

    // Get total counts
    const { data: totalData, error: totalError } = await this.supabase
      .from('request_logs')
      .select('success, actual_tokens, provider')
      .eq('user_id', userId)

    if (totalError) {
      throw new Error(`Failed to fetch request summary: ${totalError.message}`)
    }

    const logs = totalData || []
    const totalRequests = logs.length
    const successfulRequests = logs.filter(log => log.success).length
    const failedRequests = totalRequests - successfulRequests
    const totalTokens = logs.reduce((sum, log) => sum + (log.actual_tokens || 0), 0)
    
    const providerUsage: Record<string, number> = {}
    logs.forEach(log => {
      providerUsage[log.provider] = (providerUsage[log.provider] || 0) + 1
    })

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      totalTokens,
      providerUsage
    }
  }

  // User preferences
  async getUserPreferences(): Promise<UserPreferences | null> {
    const userId = authService.getUserId()
    if (!userId) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await this.supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        // Create default preferences for new user
        return await this.createDefaultUserPreferences(userId)
      }
      throw new Error(`Failed to fetch user preferences: ${error.message}`)
    }

    return data
  }

  private async createDefaultUserPreferences(userId: string): Promise<UserPreferences> {
    const defaultPreferences = {
      user_id: userId,
      preferred_provider: 'openai' as const,
      generation_temperature: 0.7,
      max_drafts_per_request: 3,
      anti_cheerleader_enabled: true,
      typing_speed_multiplier: 1.0,
      preferences: {}
    }

    const { data, error } = await this.supabase
      .from('user_preferences')
      .insert(defaultPreferences)
      .select()
      .single()

    if (error) {
      // If insert fails, try to get existing row (race condition)
      const { data: existingData, error: selectError } = await this.supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (selectError) {
        throw new Error(`Failed to create or fetch user preferences: ${error.message}`)
      }

      return existingData
    }

    return data
  }

  async updateUserPreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    const userId = authService.getUserId()
    if (!userId) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await this.supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        ...preferences
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update user preferences: ${error.message}`)
    }

    return data
  }

  // Rate limiting info
  async getRateLimit(): Promise<RateLimit | null> {
    const userId = authService.getUserId()
    if (!userId) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await this.supabase
      .from('rate_limits')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        // Create default rate limit row for new user
        return await this.createDefaultRateLimit(userId)
      }
      throw new Error(`Failed to fetch rate limit: ${error.message}`)
    }

    return data
  }

  private async createDefaultRateLimit(userId: string): Promise<RateLimit> {
    const now = new Date()
    const dailyReset = new Date(now)
    dailyReset.setDate(dailyReset.getDate() + 1)
    dailyReset.setHours(0, 0, 0, 0)
    
    const hourlyReset = new Date(now)
    hourlyReset.setHours(hourlyReset.getHours() + 1, 0, 0, 0)

    const defaultRateLimit = {
      user_id: userId,
      daily_count: 0,
      hourly_count: 0,
      daily_reset_at: dailyReset.toISOString(),
      hourly_reset_at: hourlyReset.toISOString(),
      is_locked: false
    }

    const { data, error } = await this.supabase
      .from('rate_limits')
      .insert(defaultRateLimit)
      .select()
      .single()

    if (error) {
      // If insert fails, try to get existing row (race condition)
      const { data: existingData, error: selectError } = await this.supabase
        .from('rate_limits')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (selectError) {
        throw new Error(`Failed to create or fetch rate limit: ${error.message}`)
      }

      return existingData
    }

    return data
  }

  // Usage analytics
  async getUsageAnalytics(period: 'daily' | 'weekly' | 'monthly' = 'daily', limit = 30): Promise<UsageAnalytics[]> {
    const { data, error } = await this.supabase
      .from('usage_analytics')
      .select('*')
      .eq('aggregation_period', period)
      .order('period_start', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to fetch usage analytics: ${error.message}`)
    }

    return data || []
  }

  // Dashboard stats
  async getDashboardStats(): Promise<{
    dailyGenerations: number
    dailyLimit: number
    activePersonas: number
    totalRequests: number
    providerHealth: Record<string, boolean>
  }> {
    const userId = authService.getUserId()
    if (!userId) {
      throw new Error('User not authenticated')
    }

    // Get rate limit info and subscription plan in parallel
    const [rateLimit, subscriptionPlan] = await Promise.all([
      this.getRateLimit(),
      this.getSubscriptionPlan()
    ])

    const dailyGenerations = rateLimit?.daily_count || 0
    const dailyLimit = subscriptionPlan?.daily_generation_limit || 50

    // Get active personas count
    const { count: activePersonas } = await this.supabase
      .from('voice_personas')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true)

    // Get total requests
    const { count: totalRequests } = await this.supabase
      .from('request_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    // Get provider health (simplified - in real implementation would check provider_health table)
    const providerHealth = {
      openai: true,
      gemini: true
    }

    return {
      dailyGenerations,
      dailyLimit,
      activePersonas: activePersonas || 0,
      totalRequests: totalRequests || 0,
      providerHealth
    }
  }

  // Subscription and billing methods
  async getSubscriptionPlan(): Promise<SubscriptionPlan | null> {
    const userId = authService.getUserId()
    if (!userId) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await this.supabase
      .from('subscription_plans')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        // Create default subscription plan for new user
        return await this.createDefaultSubscriptionPlan(userId)
      }
      throw new Error(`Failed to fetch subscription plan: ${error.message}`)
    }

    return data
  }

  private async createDefaultSubscriptionPlan(userId: string): Promise<SubscriptionPlan> {
    const defaultPlan = {
      user_id: userId,
      plan_type: 'free' as const,
      daily_generation_limit: 50,
      monthly_generation_limit: 1500,
      features_enabled: {}
    }

    const { data, error } = await this.supabase
      .from('subscription_plans')
      .insert(defaultPlan)
      .select()
      .single()

    if (error) {
      // If insert fails, try to get existing row (race condition)
      const { data: existingData, error: selectError } = await this.supabase
        .from('subscription_plans')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (selectError) {
        throw new Error(`Failed to create or fetch subscription plan: ${error.message}`)
      }

      return existingData
    }

    return data
  }

  async updateSubscriptionPlan(plan: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    const userId = authService.getUserId()
    if (!userId) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await this.supabase
      .from('subscription_plans')
      .upsert({
        user_id: userId,
        ...plan
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update subscription plan: ${error.message}`)
    }

    return data
  }

  async getBillingGuard(): Promise<BillingGuard | null> {
    const userId = authService.getUserId()
    if (!userId) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await this.supabase
      .from('billing_guards')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Failed to fetch billing guard: ${error.message}`)
    }

    return data
  }

  async updateBillingGuard(guard: Partial<BillingGuard>): Promise<BillingGuard> {
    const userId = authService.getUserId()
    if (!userId) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await this.supabase
      .from('billing_guards')
      .upsert({
        user_id: userId,
        ...guard
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update billing guard: ${error.message}`)
    }

    return data
  }
}

// Export singleton instance
export const databaseService = new DatabaseService()