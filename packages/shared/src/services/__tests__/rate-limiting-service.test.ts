/**
 * Property tests for Rate Limiting Service
 * Property 15: Comprehensive Rate Limiting
 * Validates: Requirements 6.1, 6.2, 6.3
 */

import { describe, test, expect, beforeEach, vi } from 'vitest'
import fc from 'fast-check'
import { RateLimitingService, RateLimitError } from '../rate-limiting-service.js'
import { DatabaseService } from '../../database/database-service.js'
import { RATE_LIMITS, RateLimit } from '../../types/database.js'

// Mock DatabaseService
const mockDatabaseService = {
  checkRateLimit: vi.fn(),
  incrementRequestCount: vi.fn(),
  getRateLimit: vi.fn(),
  updateRateLimit: vi.fn()
} as unknown as DatabaseService

describe('Rate Limiting Service Property Tests', () => {
  let rateLimitingService: RateLimitingService

  beforeEach(() => {
    vi.clearAllMocks()
    rateLimitingService = new RateLimitingService(mockDatabaseService)
  })

  test('Property 15: Comprehensive Rate Limiting - Daily Limit Enforcement', async () => {
    // **Feature: linkedin-ghostwriter, Property 15: Comprehensive Rate Limiting**
    
    await fc.assert(fc.asyncProperty(
      fc.record({
        userId: fc.uuid(),
        dailyCount: fc.integer({ min: 0, max: RATE_LIMITS.DAILY_GENERATION_LIMIT + 10 }),
        hourlyCount: fc.integer({ min: 0, max: RATE_LIMITS.HOURLY_REQUEST_LIMIT }),
        isLocked: fc.boolean(),
        lastRequestAt: fc.option(fc.date())
      }),
      async (testData) => {
        const now = new Date()
        const mockRateLimit: RateLimit = {
          user_id: testData.userId,
          daily_count: testData.dailyCount,
          hourly_count: testData.hourlyCount,
          last_request_at: testData.lastRequestAt || null,
          daily_reset_at: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          hourly_reset_at: new Date(now.getTime() + 60 * 60 * 1000),
          is_locked: testData.isLocked,
          lock_expires_at: testData.isLocked ? new Date(now.getTime() + 30 * 60 * 1000) : null,
          lock_reason: testData.isLocked ? 'hourly_limit' : null
        }

        // Mock database response based on daily limit
        const shouldBeBlocked = testData.dailyCount >= RATE_LIMITS.DAILY_GENERATION_LIMIT
        
        vi.mocked(mockDatabaseService.checkRateLimit).mockResolvedValue({
          allowed: !shouldBeBlocked,
          reason: shouldBeBlocked ? 'DAILY_LIMIT_EXCEEDED' : undefined,
          resetAt: shouldBeBlocked ? mockRateLimit.daily_reset_at : undefined,
          remainingRequests: shouldBeBlocked ? 0 : RATE_LIMITS.DAILY_GENERATION_LIMIT - testData.dailyCount
        })

        const result = await rateLimitingService.checkRateLimit(testData.userId)

        // Property: Daily limit should be enforced at exactly 50 generations
        if (testData.dailyCount >= RATE_LIMITS.DAILY_GENERATION_LIMIT) {
          expect(result.allowed).toBe(false)
          expect(result.reason).toBe('DAILY_LIMIT_EXCEEDED')
          expect(result.remainingRequests).toBe(0)
        } else {
          expect(result.allowed).toBe(true)
          expect(result.remainingRequests).toBe(RATE_LIMITS.DAILY_GENERATION_LIMIT - testData.dailyCount)
        }
      }
    ), { numRuns: 100 })
  })

  test('Property 15: Comprehensive Rate Limiting - Cooldown Period Enforcement', async () => {
    // **Feature: linkedin-ghostwriter, Property 15: Comprehensive Rate Limiting**
    
    await fc.assert(fc.asyncProperty(
      fc.record({
        userId: fc.uuid(),
        minutesSinceLastRequest: fc.integer({ min: 0, max: 10 })
      }),
      async (testData) => {
        const now = new Date()
        const lastRequestAt = new Date(now.getTime() - testData.minutesSinceLastRequest * 60 * 1000)
        
        // Mock database response based on cooldown
        const inCooldown = testData.minutesSinceLastRequest < RATE_LIMITS.COOLDOWN_MINUTES
        const cooldownEnd = new Date(lastRequestAt.getTime() + RATE_LIMITS.COOLDOWN_MINUTES * 60 * 1000)
        
        vi.mocked(mockDatabaseService.checkRateLimit).mockResolvedValue({
          allowed: !inCooldown,
          reason: inCooldown ? 'COOLDOWN_ACTIVE' : undefined,
          resetAt: inCooldown ? cooldownEnd : undefined,
          remainingRequests: 45 // Assume some remaining requests
        })

        const result = await rateLimitingService.checkRateLimit(testData.userId)

        // Property: Cooldown should be enforced for exactly 2 minutes
        if (testData.minutesSinceLastRequest < RATE_LIMITS.COOLDOWN_MINUTES) {
          expect(result.allowed).toBe(false)
          expect(result.reason).toBe('COOLDOWN_ACTIVE')
          expect(result.cooldownSeconds).toBeGreaterThan(0)
          expect(result.cooldownSeconds).toBeLessThanOrEqual(RATE_LIMITS.COOLDOWN_MINUTES * 60)
        } else {
          expect(result.allowed).toBe(true)
          expect(result.cooldownSeconds).toBeUndefined()
        }
      }
    ), { numRuns: 100 })
  })

  test('Property 15: Comprehensive Rate Limiting - Hourly Lockout Enforcement', async () => {
    // **Feature: linkedin-ghostwriter, Property 15: Comprehensive Rate Limiting**
    
    await fc.assert(fc.asyncProperty(
      fc.record({
        userId: fc.uuid(),
        hourlyCount: fc.integer({ min: 0, max: RATE_LIMITS.HOURLY_REQUEST_LIMIT + 5 })
      }),
      async (testData) => {
        const now = new Date()
        const shouldBeLocked = testData.hourlyCount >= RATE_LIMITS.HOURLY_REQUEST_LIMIT
        const lockExpiresAt = shouldBeLocked ? 
          new Date(now.getTime() + RATE_LIMITS.HOURLY_LOCKOUT_MINUTES * 60 * 1000) : 
          null

        const mockRateLimit: RateLimit = {
          user_id: testData.userId,
          daily_count: 25, // Within daily limit
          hourly_count: testData.hourlyCount,
          last_request_at: now,
          daily_reset_at: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          hourly_reset_at: new Date(now.getTime() + 60 * 60 * 1000),
          is_locked: shouldBeLocked,
          lock_expires_at: lockExpiresAt,
          lock_reason: shouldBeLocked ? 'hourly_limit' : null
        }

        vi.mocked(mockDatabaseService.incrementRequestCount).mockResolvedValue(mockRateLimit)

        const result = await rateLimitingService.incrementRequestCount(testData.userId)

        // Property: Hourly lockout should trigger at exactly 10 requests per hour
        if (testData.hourlyCount >= RATE_LIMITS.HOURLY_REQUEST_LIMIT) {
          expect(result.allowed).toBe(false)
          expect(result.reason).toBe('hourly_limit')
          expect(result.cooldownSeconds).toBeGreaterThan(0)
          expect(result.cooldownSeconds).toBeLessThanOrEqual(RATE_LIMITS.HOURLY_LOCKOUT_MINUTES * 60)
        } else {
          expect(result.allowed).toBe(true)
        }
      }
    ), { numRuns: 100 })
  })

  test('Property 15: Comprehensive Rate Limiting - Error Handling Consistency', async () => {
    // **Feature: linkedin-ghostwriter, Property 15: Comprehensive Rate Limiting**
    
    await fc.assert(fc.asyncProperty(
      fc.record({
        userId: fc.uuid(),
        errorType: fc.constantFrom('DAILY_LIMIT_EXCEEDED', 'COOLDOWN_ACTIVE', 'HOURLY_LOCKOUT'),
        hasResetTime: fc.boolean()
      }),
      async (testData) => {
        const now = new Date()
        const resetAt = testData.hasResetTime ? new Date(now.getTime() + 60 * 60 * 1000) : undefined

        vi.mocked(mockDatabaseService.checkRateLimit).mockResolvedValue({
          allowed: false,
          reason: testData.errorType,
          resetAt,
          remainingRequests: 0
        })

        // Property: Rate limit errors should be thrown consistently with proper error codes
        await expect(rateLimitingService.enforceRateLimit(testData.userId))
          .rejects.toThrow()

        try {
          await rateLimitingService.enforceRateLimit(testData.userId)
        } catch (error) {
          expect(error).toBeInstanceOf(Error)
          const rateLimitError = error as RateLimitError
          expect(rateLimitError.name).toBe('RateLimitError')
          expect(rateLimitError.code).toBeDefined()
          
          // Verify error code mapping
          if (testData.errorType === 'DAILY_LIMIT_EXCEEDED') {
            expect(rateLimitError.code).toBe('DAILY_LIMIT_EXCEEDED')
          } else if (testData.errorType === 'COOLDOWN_ACTIVE') {
            expect(rateLimitError.code).toBe('COOLDOWN_ACTIVE')
          }
          
          if (testData.hasResetTime) {
            expect(rateLimitError.resetAt).toBeDefined()
          }
        }
      }
    ), { numRuns: 100 })
  })

  test('Property 15: Comprehensive Rate Limiting - Status Reporting Accuracy', async () => {
    // **Feature: linkedin-ghostwriter, Property 15: Comprehensive Rate Limiting**
    
    await fc.assert(fc.asyncProperty(
      fc.record({
        userId: fc.uuid(),
        dailyCount: fc.integer({ min: 0, max: RATE_LIMITS.DAILY_GENERATION_LIMIT }),
        hourlyCount: fc.integer({ min: 0, max: RATE_LIMITS.HOURLY_REQUEST_LIMIT }),
        isLocked: fc.boolean()
      }),
      async (testData) => {
        const now = new Date()
        const mockRateLimit: RateLimit = {
          user_id: testData.userId,
          daily_count: testData.dailyCount,
          hourly_count: testData.hourlyCount,
          last_request_at: now,
          daily_reset_at: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          hourly_reset_at: new Date(now.getTime() + 60 * 60 * 1000),
          is_locked: testData.isLocked,
          lock_expires_at: testData.isLocked ? new Date(now.getTime() + 30 * 60 * 1000) : null,
          lock_reason: testData.isLocked ? 'hourly_limit' : null
        }

        vi.mocked(mockDatabaseService.getRateLimit).mockResolvedValue(mockRateLimit)

        const status = await rateLimitingService.getRateLimitStatus(testData.userId)

        // Property: Status should accurately reflect current rate limit state
        expect(status.dailyCount).toBe(testData.dailyCount)
        expect(status.dailyLimit).toBe(RATE_LIMITS.DAILY_GENERATION_LIMIT)
        expect(status.hourlyCount).toBe(testData.hourlyCount)
        expect(status.hourlyLimit).toBe(RATE_LIMITS.HOURLY_REQUEST_LIMIT)
        expect(status.isLocked).toBe(testData.isLocked)
        
        // Verify limits are within expected ranges
        expect(status.dailyCount).toBeGreaterThanOrEqual(0)
        expect(status.dailyCount).toBeLessThanOrEqual(RATE_LIMITS.DAILY_GENERATION_LIMIT)
        expect(status.hourlyCount).toBeGreaterThanOrEqual(0)
        expect(status.hourlyCount).toBeLessThanOrEqual(RATE_LIMITS.HOURLY_REQUEST_LIMIT)
        
        if (testData.isLocked) {
          expect(status.lockExpiresAt).toBeDefined()
          expect(status.lockReason).toBeDefined()
        } else {
          expect(status.lockExpiresAt).toBeUndefined()
          expect(status.lockReason).toBeUndefined()
        }
      }
    ), { numRuns: 100 })
  })

  test('Property 15: Comprehensive Rate Limiting - Reset Functionality', async () => {
    // **Feature: linkedin-ghostwriter, Property 15: Comprehensive Rate Limiting**
    
    await fc.assert(fc.asyncProperty(
      fc.uuid(),
      async (userId) => {
        vi.mocked(mockDatabaseService.updateRateLimit).mockResolvedValue({
          user_id: userId,
          daily_count: 0,
          hourly_count: 0,
          last_request_at: null,
          daily_reset_at: new Date(),
          hourly_reset_at: new Date(),
          is_locked: false,
          lock_expires_at: null,
          lock_reason: null
        })

        // Property: Reset should clear all rate limiting state
        await expect(rateLimitingService.resetRateLimit(userId)).resolves.not.toThrow()

        expect(mockDatabaseService.updateRateLimit).toHaveBeenCalledWith(userId, {
          daily_count: 0,
          hourly_count: 0,
          is_locked: false,
          lock_expires_at: null,
          lock_reason: null,
          daily_reset_at: expect.any(Date),
          hourly_reset_at: expect.any(Date)
        })
      }
    ), { numRuns: 100 })
  })
})