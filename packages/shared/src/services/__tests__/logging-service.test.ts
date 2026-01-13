/**
 * Property tests for Logging Service
 * Property 25: Metadata-Only Logging
 * Validates: Requirements 3.5, 6.5, 8.3, 10.5
 */

import { describe, test, expect, beforeEach } from 'vitest'
import fc from 'fast-check'
import { 
  LoggingService, 
  createLoggingService,
  type GenerationLogData,
  type ModerationLogData,
  type RateLimitLogData,
  type ErrorLogData
} from '../logging-service.js'

describe('Logging Service Property Tests', () => {
  let loggingService: LoggingService

  beforeEach(() => {
    loggingService = createLoggingService()
  })

  test('Property 25: Metadata-Only Logging - No User Content Storage', () => {
    // **Feature: linkedin-ghostwriter, Property 25: Metadata-Only Logging**
    
    fc.assert(fc.property(
      fc.string({ minLength: 1, maxLength: 50 }), // userId
      fc.oneof(fc.constant('openai'), fc.constant('gemini')), // provider
      fc.oneof(fc.constant('success'), fc.constant('failure'), fc.constant('moderated'), fc.constant('timeout')), // outcome
      fc.record({
        tokenCount: fc.integer({ min: 1, max: 10000 }),
        responseTime: fc.integer({ min: 100, max: 30000 }),
        safetyCategories: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
        moderationScore: fc.float({ min: 0, max: 1 })
      }),
      (userId, provider, outcome, logData) => {
        // Log a generation request
        loggingService.logGeneration(userId, provider, outcome, logData)

        // Property: Logging should never store user content
        const stats = loggingService.getUserUsageStats(userId)
        
        // Verify that statistics are available (metadata is stored)
        expect(stats.totalGenerations).toBeGreaterThan(0)
        expect(stats.providerUsage[provider]).toBeGreaterThan(0)
        
        // Property: No user content should be accessible through any API
        // The service should only provide aggregated statistics
        expect(typeof stats.totalGenerations).toBe('number')
        expect(typeof stats.successfulGenerations).toBe('number')
        expect(typeof stats.averageResponseTime).toBe('number')
        expect(typeof stats.providerUsage).toBe('object')
        expect(typeof stats.safetyCategories).toBe('object')
        
        // Property: Safety categories should be preserved for analysis
        if (logData.safetyCategories && logData.safetyCategories.length > 0) {
          const totalSafetyFlags = Object.values(stats.safetyCategories).reduce((sum, count) => sum + count, 0)
          expect(totalSafetyFlags).toBeGreaterThan(0)
        }
      }
    ), { numRuns: 100 })
  })

  test('Property 25: Metadata-Only Logging - Moderation Logging', () => {
    // **Feature: linkedin-ghostwriter, Property 25: Metadata-Only Logging**
    
    fc.assert(fc.property(
      fc.string({ minLength: 1, maxLength: 50 }), // userId
      fc.oneof(fc.constant('openai'), fc.constant('gemini')), // provider
      fc.oneof(fc.constant('success'), fc.constant('moderated')), // outcome
      fc.record({
        categories: fc.array(fc.oneof(
          fc.constant('hate'),
          fc.constant('harassment'),
          fc.constant('violence'),
          fc.constant('sexual'),
          fc.constant('spam')
        ), { minLength: 1, maxLength: 3 }),
        severity: fc.oneof(fc.constant('low'), fc.constant('medium'), fc.constant('high'), fc.constant('critical')),
        confidence: fc.float({ min: 0, max: 1 })
      }),
      (userId, provider, outcome, moderationData) => {
        // Log moderation result
        loggingService.logModeration(userId, provider, outcome, moderationData)

        // Property: Moderation logs should preserve safety categories without content
        const stats = loggingService.getUserUsageStats(userId)
        
        // Verify safety categories are tracked
        const totalSafetyFlags = Object.values(stats.safetyCategories).reduce((sum, count) => sum + count, 0)
        expect(totalSafetyFlags).toBeGreaterThan(0)
        
        // Property: Each flagged category should be counted
        moderationData.categories.forEach(category => {
          expect(stats.safetyCategories[category]).toBeGreaterThan(0)
        })
        
        // Property: No content should be stored, only metadata
        expect(stats).not.toHaveProperty('content')
        expect(stats).not.toHaveProperty('flaggedText')
        expect(stats).not.toHaveProperty('originalMessage')
      }
    ), { numRuns: 100 })
  })

  test('Property 25: Metadata-Only Logging - Rate Limit Tracking', () => {
    // **Feature: linkedin-ghostwriter, Property 25: Metadata-Only Logging**
    
    fc.assert(fc.property(
      fc.string({ minLength: 1, maxLength: 50 }), // userId
      fc.oneof(fc.constant('daily'), fc.constant('hourly'), fc.constant('cooldown')), // limitType
      fc.integer({ min: 1, max: 100 }), // currentCount
      fc.integer({ min: 10, max: 100 }), // limitValue
      (userId, limitType, currentCount, limitValue) => {
        const resetTime = new Date(Date.now() + 3600000) // 1 hour from now
        
        // Log rate limit event
        loggingService.logRateLimit(userId, 'rate_limited', {
          limitType,
          currentCount,
          limitValue,
          resetTime
        })

        // Property: Rate limit events should be tracked in user stats
        const stats = loggingService.getUserUsageStats(userId)
        expect(stats.rateLimitedRequests).toBeGreaterThan(0)
        
        // Property: System health should reflect rate limiting
        const healthMetrics = loggingService.getSystemHealthMetrics()
        expect(typeof healthMetrics.totalRequests).toBe('number')
        expect(typeof healthMetrics.successRate).toBe('number')
        
        // Property: No user-specific data should leak into system metrics
        expect(healthMetrics).not.toHaveProperty('userIds')
        expect(healthMetrics).not.toHaveProperty('userRequests')
        expect(healthMetrics).not.toHaveProperty('individualLimits')
      }
    ), { numRuns: 100 })
  })

  test('Property 25: Metadata-Only Logging - Provider Failover Tracking', () => {
    // **Feature: linkedin-ghostwriter, Property 25: Metadata-Only Logging**
    
    fc.assert(fc.property(
      fc.string({ minLength: 1, maxLength: 50 }), // userId
      fc.oneof(fc.constant('openai'), fc.constant('gemini')), // fromProvider
      fc.oneof(fc.constant('openai'), fc.constant('gemini')), // toProvider
      fc.string({ minLength: 1, maxLength: 100 }), // reason
      fc.oneof(fc.constant('success'), fc.constant('failure')), // outcome
      (userId, fromProvider, toProvider, reason, outcome) => {
        // Skip if providers are the same (invalid failover)
        if (fromProvider === toProvider) return

        // Log failover event
        loggingService.logFailover(userId, fromProvider, toProvider, reason, outcome)

        // Property: Failover events should be tracked in system health
        const healthMetrics = loggingService.getSystemHealthMetrics()
        expect(typeof healthMetrics.failoverRate).toBe('number')
        expect(healthMetrics.failoverRate).toBeGreaterThanOrEqual(0)
        
        // Property: Provider health scores should be affected
        expect(typeof healthMetrics.providerHealthScores).toBe('object')
        expect(healthMetrics.providerHealthScores[fromProvider]).toBeDefined()
        expect(healthMetrics.providerHealthScores[toProvider]).toBeDefined()
        
        // Property: No sensitive failover details should be exposed
        expect(healthMetrics).not.toHaveProperty('failoverReasons')
        expect(healthMetrics).not.toHaveProperty('userFailovers')
      }
    ), { numRuns: 100 })
  })

  test('Property 25: Metadata-Only Logging - Error Logging Without Sensitive Data', () => {
    // **Feature: linkedin-ghostwriter, Property 25: Metadata-Only Logging**
    
    fc.assert(fc.property(
      fc.string({ minLength: 1, maxLength: 50 }), // userId
      fc.oneof(fc.constant('openai'), fc.constant('gemini')), // provider
      fc.oneof(fc.constant('generation'), fc.constant('moderation'), fc.constant('embedding')), // operation
      fc.record({
        errorType: fc.oneof(fc.constant('TIMEOUT'), fc.constant('INVALID_INPUT'), fc.constant('PROVIDER_ERROR')),
        errorCode: fc.string({ minLength: 1, maxLength: 20 }),
        retryAttempt: fc.integer({ min: 0, max: 5 }),
        willRetry: fc.boolean()
      }),
      (userId, provider, operation, errorData) => {
        // Log error event
        loggingService.logError(userId, provider, operation, errorData)

        // Property: Error events should be tracked without exposing sensitive data
        const stats = loggingService.getUserUsageStats(userId)
        const healthMetrics = loggingService.getSystemHealthMetrics()
        
        // Verify error affects success rate
        expect(healthMetrics.successRate).toBeLessThan(100)
        
        // Property: No error details that might contain user data should be accessible
        expect(healthMetrics).not.toHaveProperty('errorMessages')
        expect(healthMetrics).not.toHaveProperty('stackTraces')
        expect(healthMetrics).not.toHaveProperty('userErrors')
        expect(stats).not.toHaveProperty('errorDetails')
        
        // Property: Provider health should reflect errors
        expect(healthMetrics.providerHealthScores[provider]).toBeLessThanOrEqual(100)
      }
    ), { numRuns: 100 })
  })

  test('Property 25: Metadata-Only Logging - System Health Metrics Aggregation', () => {
    // **Feature: linkedin-ghostwriter, Property 25: Metadata-Only Logging**
    
    // Generate multiple log entries to test aggregation
    const userIds = ['user1', 'user2', 'user3']
    const providers: ('openai' | 'gemini')[] = ['openai', 'gemini']
    const outcomes: ('success' | 'failure' | 'moderated')[] = ['success', 'failure', 'moderated']

    // Create diverse log entries
    userIds.forEach(userId => {
      providers.forEach(provider => {
        outcomes.forEach(outcome => {
          loggingService.logGeneration(userId, provider, outcome, {
            tokenCount: 1000,
            responseTime: 2000,
            safetyCategories: outcome === 'moderated' ? ['spam'] : undefined
          })
        })
      })
    })

    // Property: System health metrics should aggregate without exposing individual users
    const healthMetrics = loggingService.getSystemHealthMetrics()
    
    expect(healthMetrics.totalRequests).toBeGreaterThan(0)
    expect(healthMetrics.successRate).toBeGreaterThanOrEqual(0)
    expect(healthMetrics.successRate).toBeLessThanOrEqual(100)
    expect(healthMetrics.averageResponseTime).toBeGreaterThan(0)
    expect(healthMetrics.moderationRate).toBeGreaterThanOrEqual(0)
    expect(healthMetrics.failoverRate).toBeGreaterThanOrEqual(0)
    
    // Property: Provider health scores should be calculated
    expect(Object.keys(healthMetrics.providerHealthScores)).toContain('openai')
    expect(Object.keys(healthMetrics.providerHealthScores)).toContain('gemini')
    
    // Property: Safety categories should be aggregated
    expect(Array.isArray(healthMetrics.topSafetyCategories)).toBe(true)
    if (healthMetrics.topSafetyCategories.length > 0) {
      healthMetrics.topSafetyCategories.forEach(category => {
        expect(category).toHaveProperty('category')
        expect(category).toHaveProperty('count')
        expect(typeof category.category).toBe('string')
        expect(typeof category.count).toBe('number')
        expect(category.count).toBeGreaterThan(0)
      })
    }
    
    // Property: No individual user data should be present
    expect(healthMetrics).not.toHaveProperty('users')
    expect(healthMetrics).not.toHaveProperty('userStats')
    expect(healthMetrics).not.toHaveProperty('individualMetrics')
  })

  test('Property 25: Metadata-Only Logging - User Privacy Protection', () => {
    // **Feature: linkedin-ghostwriter, Property 25: Metadata-Only Logging**
    
    fc.assert(fc.property(
      fc.string({ minLength: 1, maxLength: 50 }), // userId
      fc.array(fc.record({
        provider: fc.oneof(fc.constant('openai'), fc.constant('gemini')),
        outcome: fc.oneof(fc.constant('success'), fc.constant('failure'), fc.constant('moderated')),
        tokenCount: fc.integer({ min: 1, max: 5000 }),
        responseTime: fc.integer({ min: 100, max: 10000 })
      }), { minLength: 1, maxLength: 20 }),
      (userId, logEntries) => {
        // Create a fresh logging service for this test to avoid state pollution
        const testLoggingService = createLoggingService()
        
        // Log multiple entries for the user
        logEntries.forEach(entry => {
          testLoggingService.logGeneration(userId, entry.provider, entry.outcome, {
            tokenCount: entry.tokenCount,
            responseTime: entry.responseTime
          })
        })

        // Property: User stats should provide aggregated data only
        const userStats = testLoggingService.getUserUsageStats(userId)
        
        // Verify aggregated statistics are correct
        expect(userStats.totalGenerations).toBe(logEntries.length)
        expect(userStats.successfulGenerations).toBe(
          logEntries.filter(e => e.outcome === 'success').length
        )
        expect(userStats.moderatedGenerations).toBe(
          logEntries.filter(e => e.outcome === 'moderated').length
        )
        
        // Property: No individual log entries should be accessible
        expect(userStats).not.toHaveProperty('logs')
        expect(userStats).not.toHaveProperty('entries')
        expect(userStats).not.toHaveProperty('history')
        expect(userStats).not.toHaveProperty('requests')
        
        // Property: Provider usage should be aggregated correctly
        const expectedOpenAI = logEntries.filter(e => e.provider === 'openai').length
        const expectedGemini = logEntries.filter(e => e.provider === 'gemini').length
        
        if (expectedOpenAI > 0) {
          expect(userStats.providerUsage.openai).toBe(expectedOpenAI)
        }
        if (expectedGemini > 0) {
          expect(userStats.providerUsage.gemini).toBe(expectedGemini)
        }
      }
    ), { numRuns: 50 })
  })

  test('Property 25: Metadata-Only Logging - Temporal Data Handling', () => {
    // **Feature: linkedin-ghostwriter, Property 25: Metadata-Only Logging**
    
    const userId = 'test-user'
    const provider: 'openai' = 'openai'
    
    // Log entries at different times
    loggingService.logGeneration(userId, provider, 'success', {
      tokenCount: 1000,
      responseTime: 1500
    })
    
    // Property: Time-based filtering should work correctly
    const dayStats = loggingService.getUserUsageStats(userId, 'day')
    const hourStats = loggingService.getUserUsageStats(userId, 'hour')
    
    // Both should include the recent entry
    expect(dayStats.totalGenerations).toBeGreaterThan(0)
    expect(hourStats.totalGenerations).toBeGreaterThan(0)
    
    // Property: System health metrics should support different timeframes
    const hourlyHealth = loggingService.getSystemHealthMetrics('hour')
    const dailyHealth = loggingService.getSystemHealthMetrics('day')
    
    expect(typeof hourlyHealth.totalRequests).toBe('number')
    expect(typeof dailyHealth.totalRequests).toBe('number')
    
    // Property: No timestamp details should expose user activity patterns
    expect(dayStats).not.toHaveProperty('timestamps')
    expect(hourStats).not.toHaveProperty('requestTimes')
    expect(hourlyHealth).not.toHaveProperty('userActivity')
    expect(dailyHealth).not.toHaveProperty('activityPatterns')
  })
})