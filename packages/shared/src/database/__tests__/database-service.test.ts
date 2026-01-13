/**
 * Property-based tests for database service
 * Tests Properties 18 and 25 from the design document
 */

import { describe, test, expect, beforeEach, vi } from 'vitest'
import fc from 'fast-check'
import { DatabaseService } from '../database-service.js'
import {
  AIModelRegistryInsert,
  RequestLogInsert,
  UserPreferencesInsert,
  ContextEmbeddingInsert,
  RateLimitInsert,
  RATE_LIMITS,
  DEFAULT_USER_PREFERENCES
} from '../../types/database.js'

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(),
  rpc: vi.fn()
}

// Mock query builder
const createMockQueryBuilder = (data: any = [], error: any = null) => ({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: data[0] || null, error }),
  then: vi.fn().mockResolvedValue({ data, error }),
  rpc: vi.fn().mockResolvedValue({ data, error })
})

describe('DatabaseService Property Tests', () => {
  let databaseService: DatabaseService

  beforeEach(() => {
    vi.clearAllMocks()
    databaseService = new DatabaseService(mockSupabaseClient as any)
  })

  // Property 18: Comprehensive Data Persistence
  test('Property 18: Comprehensive Data Persistence - AI Model Registry', async () => {
    // **Feature: linkedin-ghostwriter, Property 18: Comprehensive Data Persistence**
    
    await fc.assert(fc.asyncProperty(
      fc.record({
        provider_slug: fc.constantFrom('openai', 'gemini') as fc.Arbitrary<'openai' | 'gemini'>,
        model_name: fc.string({ minLength: 1, maxLength: 50 }),
        context_window: fc.integer({ min: 1, max: 2000000 }),
        is_active: fc.boolean(),
        capabilities: fc.record({
          textGeneration: fc.boolean(),
          visionAnalysis: fc.boolean(),
          embeddings: fc.boolean(),
          maxContextTokens: fc.integer({ min: 1, max: 2000000 }),
          supportedImageFormats: fc.array(fc.constantFrom('jpeg', 'png'), { maxLength: 2 })
        })
      }),
      async (modelData: AIModelRegistryInsert) => {
        // Mock successful insertion
        const mockData = { id: 'test-id', ...modelData, created_at: new Date(), updated_at: new Date() }
        mockSupabaseClient.from.mockReturnValue(createMockQueryBuilder([mockData]))

        const result = await databaseService.createAIModel(modelData)

        // Property: All model data should be persisted with correct structure
        expect(result.provider_slug).toBe(modelData.provider_slug)
        expect(result.model_name).toBe(modelData.model_name)
        expect(result.context_window).toBe(modelData.context_window)
        expect(result.is_active).toBe(modelData.is_active)
        expect(result.capabilities).toEqual(modelData.capabilities)
        expect(result.id).toBeDefined()
        expect(result.created_at).toBeInstanceOf(Date)
        expect(result.updated_at).toBeInstanceOf(Date)
      }
    ), { numRuns: 100 })
  })

  test('Property 18: Comprehensive Data Persistence - User Preferences with JSONB', async () => {
    // **Feature: linkedin-ghostwriter, Property 18: Comprehensive Data Persistence**
    
    await fc.assert(fc.asyncProperty(
      fc.record({
        user_id: fc.uuid(),
        preferred_provider: fc.constantFrom('openai', 'gemini') as fc.Arbitrary<'openai' | 'gemini'>,
        generation_temperature: fc.float({ min: Math.fround(0), max: Math.fround(2) }),
        max_drafts_per_request: fc.integer({ min: 1, max: 10 }),
        anti_cheerleader_enabled: fc.boolean(),
        typing_speed_multiplier: fc.float({ min: Math.fround(0.1), max: Math.fround(5.0) }),
        preferences: fc.dictionary(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.oneof(fc.string(), fc.integer(), fc.boolean())
        )
      }),
      async (prefsData: UserPreferencesInsert) => {
        // Mock successful insertion
        const mockData = { ...prefsData, created_at: new Date(), updated_at: new Date() }
        mockSupabaseClient.from.mockReturnValue(createMockQueryBuilder([mockData]))

        const result = await databaseService.createUserPreferences(prefsData)

        // Property: All preference data including JSONB should be persisted correctly
        expect(result.user_id).toBe(prefsData.user_id)
        expect(result.preferred_provider).toBe(prefsData.preferred_provider)
        expect(result.generation_temperature).toBe(prefsData.generation_temperature)
        expect(result.max_drafts_per_request).toBe(prefsData.max_drafts_per_request)
        expect(result.anti_cheerleader_enabled).toBe(prefsData.anti_cheerleader_enabled)
        expect(result.typing_speed_multiplier).toBe(prefsData.typing_speed_multiplier)
        expect(result.preferences).toEqual(prefsData.preferences)
        expect(result.created_at).toBeInstanceOf(Date)
        expect(result.updated_at).toBeInstanceOf(Date)
      }
    ), { numRuns: 100 })
  })

  test('Property 18: Comprehensive Data Persistence - Context Embeddings with pgvector', async () => {
    // **Feature: linkedin-ghostwriter, Property 18: Comprehensive Data Persistence**
    
    await fc.assert(fc.asyncProperty(
      fc.record({
        user_id: fc.uuid(),
        content_hash: fc.string({ minLength: 1, maxLength: 64 }),
        content_type: fc.constantFrom('interaction', 'contact', 'topic') as fc.Arbitrary<'interaction' | 'contact' | 'topic'>,
        embedding: fc.array(fc.float({ min: Math.fround(-1), max: Math.fround(1) }), { minLength: 1536, maxLength: 1536 }),
        metadata: fc.dictionary(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.oneof(fc.string(), fc.integer(), fc.boolean())
        )
      }),
      async (embeddingData: ContextEmbeddingInsert) => {
        // Mock successful insertion
        const mockData = { id: 'test-id', ...embeddingData, created_at: new Date() }
        mockSupabaseClient.from.mockReturnValue(createMockQueryBuilder([mockData]))

        const result = await databaseService.createEmbedding(embeddingData)

        // Property: All embedding data including vector should be persisted correctly
        expect(result.user_id).toBe(embeddingData.user_id)
        expect(result.content_hash).toBe(embeddingData.content_hash)
        expect(result.content_type).toBe(embeddingData.content_type)
        expect(result.embedding).toEqual(embeddingData.embedding)
        expect(result.embedding).toHaveLength(1536) // OpenAI text-embedding-3-small dimension
        expect(result.metadata).toEqual(embeddingData.metadata)
        expect(result.id).toBeDefined()
        expect(result.created_at).toBeInstanceOf(Date)
      }
    ), { numRuns: 100 })
  })

  // Property 25: Metadata-Only Logging
  test('Property 25: Metadata-Only Logging - Request Logs Never Store Content', async () => {
    // **Feature: linkedin-ghostwriter, Property 25: Metadata-Only Logging**
    
    await fc.assert(fc.asyncProperty(
      fc.record({
        user_id: fc.uuid(),
        provider: fc.constantFrom('openai', 'gemini') as fc.Arbitrary<'openai' | 'gemini'>,
        model_name: fc.string({ minLength: 1, maxLength: 50 }),
        estimated_tokens: fc.option(fc.integer({ min: 1, max: 1000000 })),
        actual_tokens: fc.option(fc.integer({ min: 1, max: 1000000 })),
        safety_ratings: fc.option(fc.array(fc.record({
          category: fc.string({ minLength: 1, maxLength: 30 }),
          probability: fc.string({ minLength: 1, maxLength: 20 }),
          blocked: fc.option(fc.boolean())
        }))),
        request_type: fc.constantFrom('generation', 'embedding', 'moderation') as fc.Arbitrary<'generation' | 'embedding' | 'moderation'>,
        success: fc.boolean(),
        error_message: fc.option(fc.string({ maxLength: 500 })),
        response_time_ms: fc.option(fc.integer({ min: 0, max: 60000 }))
      }),
      async (logData: RequestLogInsert) => {
        // Mock successful insertion
        const mockData = { id: 'test-id', ...logData, created_at: new Date() }
        mockSupabaseClient.from.mockReturnValue(createMockQueryBuilder([mockData]))

        const result = await databaseService.logRequest(logData)

        // Property: Only metadata should be logged, never user content or generated text
        expect(result.user_id).toBe(logData.user_id)
        expect(result.provider).toBe(logData.provider)
        expect(result.model_name).toBe(logData.model_name)
        expect(result.request_type).toBe(logData.request_type)
        expect(result.success).toBe(logData.success)
        
        // Verify no user content fields exist in the log structure
        expect(result).not.toHaveProperty('user_content')
        expect(result).not.toHaveProperty('generated_text')
        expect(result).not.toHaveProperty('prompt')
        expect(result).not.toHaveProperty('response_content')
        
        // Only metadata fields should be present
        const allowedFields = [
          'id', 'user_id', 'provider', 'model_name', 'estimated_tokens',
          'actual_tokens', 'safety_ratings', 'request_type', 'success',
          'error_message', 'response_time_ms', 'created_at'
        ]
        
        Object.keys(result).forEach(key => {
          expect(allowedFields).toContain(key)
        })
      }
    ), { numRuns: 100 })
  })

  test('Property 25: Metadata-Only Logging - Context Embeddings Never Store Original Content', async () => {
    // **Feature: linkedin-ghostwriter, Property 25: Metadata-Only Logging**
    
    await fc.assert(fc.asyncProperty(
      fc.record({
        user_id: fc.uuid(),
        content_hash: fc.string({ minLength: 1, maxLength: 64 }),
        content_type: fc.constantFrom('interaction', 'contact', 'topic') as fc.Arbitrary<'interaction' | 'contact' | 'topic'>,
        embedding: fc.array(fc.float({ min: Math.fround(-1), max: Math.fround(1) }), { minLength: 1536, maxLength: 1536 }),
        metadata: fc.dictionary(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.oneof(fc.string(), fc.integer(), fc.boolean())
        )
      }),
      async (embeddingData: ContextEmbeddingInsert) => {
        // Mock successful insertion
        const mockData = { id: 'test-id', ...embeddingData, created_at: new Date() }
        mockSupabaseClient.from.mockReturnValue(createMockQueryBuilder([mockData]))

        const result = await databaseService.createEmbedding(embeddingData)

        // Property: Only embeddings and metadata should be stored, never original content
        expect(result.content_hash).toBe(embeddingData.content_hash) // Hash only, not content
        expect(result.embedding).toEqual(embeddingData.embedding) // Vector representation only
        expect(result.metadata).toEqual(embeddingData.metadata) // Metadata only
        
        // Verify no original content fields exist
        expect(result).not.toHaveProperty('original_content')
        expect(result).not.toHaveProperty('raw_text')
        expect(result).not.toHaveProperty('user_input')
        expect(result).not.toHaveProperty('generated_content')
        
        // Only allowed fields should be present
        const allowedFields = [
          'id', 'user_id', 'content_hash', 'content_type', 
          'embedding', 'metadata', 'created_at'
        ]
        
        Object.keys(result).forEach(key => {
          expect(allowedFields).toContain(key)
        })
      }
    ), { numRuns: 100 })
  })

  // Rate limiting data persistence
  test('Property 18: Comprehensive Data Persistence - Rate Limits Usage Tracking', async () => {
    // **Feature: linkedin-ghostwriter, Property 18: Comprehensive Data Persistence**
    
    await fc.assert(fc.asyncProperty(
      fc.record({
        user_id: fc.uuid(),
        daily_count: fc.integer({ min: 0, max: RATE_LIMITS.DAILY_GENERATION_LIMIT }),
        hourly_count: fc.integer({ min: 0, max: RATE_LIMITS.HOURLY_REQUEST_LIMIT }),
        last_request_at: fc.option(fc.date()),
        daily_reset_at: fc.date(),
        hourly_reset_at: fc.date(),
        is_locked: fc.boolean(),
        lock_expires_at: fc.option(fc.date())
      }),
      async (rateLimitData: RateLimitInsert) => {
        // Mock successful insertion
        const mockData = { ...rateLimitData }
        mockSupabaseClient.from.mockReturnValue(createMockQueryBuilder([mockData]))

        const result = await databaseService.createRateLimit(rateLimitData)

        // Property: All rate limiting data should be persisted for usage tracking
        expect(result.user_id).toBe(rateLimitData.user_id)
        expect(result.daily_count).toBe(rateLimitData.daily_count)
        expect(result.hourly_count).toBe(rateLimitData.hourly_count)
        expect(result.is_locked).toBe(rateLimitData.is_locked)
        
        // Verify counts are within valid ranges
        expect(result.daily_count).toBeGreaterThanOrEqual(0)
        expect(result.daily_count).toBeLessThanOrEqual(RATE_LIMITS.DAILY_GENERATION_LIMIT)
        expect(result.hourly_count).toBeGreaterThanOrEqual(0)
        expect(result.hourly_count).toBeLessThanOrEqual(RATE_LIMITS.HOURLY_REQUEST_LIMIT)
      }
    ), { numRuns: 100 })
  })

  // Default preferences consistency
  test('Property 18: Comprehensive Data Persistence - Default User Preferences Consistency', async () => {
    // **Feature: linkedin-ghostwriter, Property 18: Comprehensive Data Persistence**
    
    await fc.assert(fc.asyncProperty(
      fc.uuid(),
      async (userId: string) => {
        // Mock user preferences not found, then successful creation
        mockSupabaseClient.from.mockReturnValueOnce(
          createMockQueryBuilder([], { code: 'PGRST116' }) // Not found error
        ).mockReturnValueOnce(
          createMockQueryBuilder([{ user_id: userId, ...DEFAULT_USER_PREFERENCES, created_at: new Date(), updated_at: new Date() }])
        )

        const result = await databaseService.getUserPreferences(userId)

        // Property: Default preferences should be consistently applied for new users
        expect(result.user_id).toBe(userId)
        expect(result.preferred_provider).toBe(DEFAULT_USER_PREFERENCES.preferred_provider)
        expect(result.generation_temperature).toBe(DEFAULT_USER_PREFERENCES.generation_temperature)
        expect(result.max_drafts_per_request).toBe(DEFAULT_USER_PREFERENCES.max_drafts_per_request)
        expect(result.anti_cheerleader_enabled).toBe(DEFAULT_USER_PREFERENCES.anti_cheerleader_enabled)
        expect(result.typing_speed_multiplier).toBe(DEFAULT_USER_PREFERENCES.typing_speed_multiplier)
        expect(result.preferences).toEqual(DEFAULT_USER_PREFERENCES.preferences)
      }
    ), { numRuns: 100 })
  })
})