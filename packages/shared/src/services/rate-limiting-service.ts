/**
 * Rate Limiting Service for PostPhantom
 * Enforces ethical usage limits and prevents spam
 * Requirements: 6.1, 6.2, 6.3
 */

import { DatabaseService } from '../database/database-service.js'
import { RATE_LIMITS } from '../types/database.js'

export interface RateLimitResult {
  allowed: boolean
  reason?: string
  resetAt?: Date
  remainingRequests?: number
  cooldownSeconds?: number
}

export interface RateLimitError extends Error {
  code: 'DAILY_LIMIT_EXCEEDED' | 'COOLDOWN_ACTIVE' | 'HOURLY_LOCKOUT' | 'RATE_LIMIT_ERROR'
  resetAt?: Date
  remainingRequests?: number
  cooldownSeconds?: number
}

export class RateLimitingService {
  constructor(private databaseService: DatabaseService) {}

  /**
   * Check if a user can make a request
   * Requirement 6.1: Limit users to 50 generations per day
   * Requirement 6.2: Enforce 2-minute cooldown between requests
   * Requirement 6.3: 30-minute lock after 10 requests per hour
   */
  async checkRateLimit(userId: string): Promise<RateLimitResult> {
    try {
      const result = await this.databaseService.checkRateLimit(userId)
      
      if (!result.allowed) {
        const rateLimitResult: RateLimitResult = {
          allowed: false,
          reason: result.reason,
          resetAt: result.resetAt,
          remainingRequests: result.remainingRequests
        }

        // Add cooldown seconds for COOLDOWN_ACTIVE
        if (result.reason === 'COOLDOWN_ACTIVE' && result.resetAt) {
          rateLimitResult.cooldownSeconds = Math.ceil(
            (result.resetAt.getTime() - Date.now()) / 1000
          )
        }

        return rateLimitResult
      }

      return {
        allowed: true,
        remainingRequests: result.remainingRequests
      }
    } catch (error) {
      throw this.createRateLimitError(
        'RATE_LIMIT_ERROR',
        `Failed to check rate limit: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Increment request count and apply rate limiting
   * This should be called after a successful generation request
   */
  async incrementRequestCount(userId: string): Promise<RateLimitResult> {
    try {
      const rateLimit = await this.databaseService.incrementRequestCount(userId)
      
      // Check if the increment caused a lock
      if (rateLimit.is_locked && rateLimit.lock_expires_at) {
        const lockDurationMs = rateLimit.lock_expires_at.getTime() - Date.now()
        
        return {
          allowed: false,
          reason: rateLimit.lock_reason || 'HOURLY_LOCKOUT',
          resetAt: rateLimit.lock_expires_at,
          remainingRequests: 0,
          cooldownSeconds: Math.ceil(lockDurationMs / 1000)
        }
      }

      // Check daily limit
      if (rateLimit.daily_count >= RATE_LIMITS.DAILY_GENERATION_LIMIT) {
        return {
          allowed: false,
          reason: 'DAILY_LIMIT_EXCEEDED',
          resetAt: rateLimit.daily_reset_at,
          remainingRequests: 0
        }
      }

      return {
        allowed: true,
        remainingRequests: RATE_LIMITS.DAILY_GENERATION_LIMIT - rateLimit.daily_count
      }
    } catch (error) {
      throw this.createRateLimitError(
        'RATE_LIMIT_ERROR',
        `Failed to increment request count: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get current rate limit status for a user
   */
  async getRateLimitStatus(userId: string): Promise<{
    dailyCount: number
    dailyLimit: number
    hourlyCount: number
    hourlyLimit: number
    isLocked: boolean
    lockExpiresAt?: Date
    lockReason?: string
    lastRequestAt?: Date
    dailyResetAt: Date
    hourlyResetAt: Date
  }> {
    try {
      const rateLimit = await this.databaseService.getRateLimit(userId)
      
      return {
        dailyCount: rateLimit.daily_count,
        dailyLimit: RATE_LIMITS.DAILY_GENERATION_LIMIT,
        hourlyCount: rateLimit.hourly_count,
        hourlyLimit: RATE_LIMITS.HOURLY_REQUEST_LIMIT,
        isLocked: rateLimit.is_locked,
        lockExpiresAt: rateLimit.lock_expires_at || undefined,
        lockReason: rateLimit.lock_reason || undefined,
        lastRequestAt: rateLimit.last_request_at || undefined,
        dailyResetAt: rateLimit.daily_reset_at,
        hourlyResetAt: rateLimit.hourly_reset_at
      }
    } catch (error) {
      throw this.createRateLimitError(
        'RATE_LIMIT_ERROR',
        `Failed to get rate limit status: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Check if user can make a request and throw error if not
   * Convenience method for middleware usage
   */
  async enforceRateLimit(userId: string): Promise<void> {
    const result = await this.checkRateLimit(userId)
    
    if (!result.allowed) {
      const errorCode = this.mapReasonToErrorCode(result.reason)
      const message = this.formatRateLimitMessage(result)
      
      const error = this.createRateLimitError(errorCode, message)
      error.resetAt = result.resetAt
      error.remainingRequests = result.remainingRequests
      error.cooldownSeconds = result.cooldownSeconds
      
      throw error
    }
  }

  /**
   * Reset rate limits for a user (admin function)
   */
  async resetRateLimit(userId: string): Promise<void> {
    try {
      const now = new Date()
      await this.databaseService.updateRateLimit(userId, {
        daily_count: 0,
        hourly_count: 0,
        is_locked: false,
        lock_expires_at: null,
        lock_reason: null,
        daily_reset_at: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        hourly_reset_at: new Date(now.getTime() + 60 * 60 * 1000)
      })
    } catch (error) {
      throw this.createRateLimitError(
        'RATE_LIMIT_ERROR',
        `Failed to reset rate limit: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  private mapReasonToErrorCode(reason?: string): RateLimitError['code'] {
    switch (reason) {
      case 'DAILY_LIMIT_EXCEEDED':
        return 'DAILY_LIMIT_EXCEEDED'
      case 'COOLDOWN_ACTIVE':
        return 'COOLDOWN_ACTIVE'
      case 'hourly_limit':
      case 'LOCKED':
        return 'HOURLY_LOCKOUT'
      default:
        return 'RATE_LIMIT_ERROR'
    }
  }

  private formatRateLimitMessage(result: RateLimitResult): string {
    switch (result.reason) {
      case 'DAILY_LIMIT_EXCEEDED':
        return `Daily limit of ${RATE_LIMITS.DAILY_GENERATION_LIMIT} generations exceeded. Resets at ${result.resetAt?.toLocaleString()}`
      case 'COOLDOWN_ACTIVE':
        return `Please wait ${result.cooldownSeconds} seconds before making another request (${RATE_LIMITS.COOLDOWN_MINUTES} minute cooldown)`
      case 'hourly_limit':
      case 'LOCKED':
        return `Too many requests. Account locked for ${RATE_LIMITS.HOURLY_LOCKOUT_MINUTES} minutes after ${RATE_LIMITS.HOURLY_REQUEST_LIMIT} requests per hour`
      default:
        return 'Rate limit exceeded'
    }
  }

  private createRateLimitError(code: RateLimitError['code'], message: string): RateLimitError {
    const error = new Error(message) as RateLimitError
    error.name = 'RateLimitError'
    error.code = code
    return error
  }
}

// Helper function to create rate limiting service instance
export function createRateLimitingService(databaseService: DatabaseService): RateLimitingService {
  return new RateLimitingService(databaseService)
}