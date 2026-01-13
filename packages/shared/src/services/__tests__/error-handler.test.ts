/**
 * Property tests for Error Handler Service
 * Property 8: Moderation Failure Handling
 * Property 23: Long Operation UI Feedback
 * Validates: Requirements 3.4, 10.2
 */

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest'
import fc from 'fast-check'
import { 
  ErrorHandler, 
  UIFeedbackController,
  createErrorHandler, 
  createProviderError,
  type ProviderError,
  type ErrorContext,
  type UIFeedbackOptions
} from '../error-handler.js'

describe('Error Handler Service Property Tests', () => {
  let errorHandler: ErrorHandler

  beforeEach(() => {
    errorHandler = createErrorHandler()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  test('Property 8: Moderation Failure Handling - Error Type Classification', () => {
    // **Feature: linkedin-ghostwriter, Property 8: Moderation Failure Handling**
    
    fc.assert(fc.property(
      fc.oneof(
        fc.constant('RATE_LIMIT_EXCEEDED'),
        fc.constant('MODERATION_FAILED'),
        fc.constant('PROVIDER_UNAVAILABLE'),
        fc.constant('INVALID_INPUT'),
        fc.constant('TIMEOUT'),
        fc.constant('UNKNOWN')
      ),
      fc.string({ minLength: 1, maxLength: 100 }),
      fc.record({
        provider: fc.oneof(fc.constant('openai'), fc.constant('gemini')),
        userId: fc.string(),
        requestId: fc.string()
      }),
      (errorType, errorMessage, context) => {
        const providerError = createProviderError(errorType as ProviderError['type'], errorMessage, {
          provider: context.provider
        })

        // Property: Error creation should be consistent
        expect(providerError.type).toBe(errorType)
        expect(providerError.message).toBe(errorMessage)
        expect(providerError.provider).toBe(context.provider)
        
        // Property: Error handler should accept all error types
        expect(() => errorHandler.handleProviderError(providerError, context)).not.toThrow()
      }
    ), { numRuns: 100 })
  })

  test('Property 8: Moderation Failure Handling - Specific Error Types', async () => {
    // **Feature: linkedin-ghostwriter, Property 8: Moderation Failure Handling**
    
    // Test moderation failure
    const moderationError = createProviderError('MODERATION_FAILED', 'Content flagged for hate speech', {
      provider: 'openai'
    })
    const moderationResult = await errorHandler.handleProviderError(moderationError, { provider: 'openai' })
    
    expect(moderationResult.error).toBe('CONTENT_MODERATED')
    expect(moderationResult.canRetry).toBe(true)
    expect(moderationResult.suggestions).toBeDefined()
    expect(Array.isArray(moderationResult.suggestions)).toBe(true)
    
    // Test rate limit error
    const rateLimitError = createProviderError('RATE_LIMIT_EXCEEDED', 'Daily limit exceeded', {
      retryAfter: 120
    })
    const rateLimitResult = await errorHandler.handleProviderError(rateLimitError, {})
    
    expect(rateLimitResult.error).toMatch(/^(DAILY_LIMIT_EXCEEDED|HOURLY_LOCK_ACTIVE|COOLDOWN_ACTIVE)$/)
    expect(rateLimitResult.message).toBeDefined()
    expect(rateLimitResult.suggestions).toBeDefined()
    
    // Test provider unavailable
    const providerError = createProviderError('PROVIDER_UNAVAILABLE', 'Service unavailable', {
      provider: 'openai',
      statusCode: 503
    })
    const providerResult = await errorHandler.handleProviderError(providerError, { provider: 'openai' })
    
    expect(providerResult.error).toBe('PROVIDER_UNAVAILABLE')
    expect(providerResult.canRetry).toBe(true)
    expect(providerResult.metadata?.willFailover).toBe(true)
  })

  test('Property 8: Moderation Failure Handling - Error Response Structure', async () => {
    // **Feature: linkedin-ghostwriter, Property 8: Moderation Failure Handling**
    
    // Test multiple error types to validate consistent structure
    const errorTypes: ProviderError['type'][] = ['INVALID_INPUT', 'TIMEOUT', 'UNKNOWN']
    const testMessages = ['Test error 1', 'Test error 2', 'Test error 3']
    
    for (const errorType of errorTypes) {
      for (const errorMessage of testMessages) {
        const error = createProviderError(errorType, errorMessage)
        const result = await errorHandler.handleProviderError(error, {})

        // Property: All error responses should have consistent structure
        expect(result.error).toBeDefined()
        expect(typeof result.error).toBe('string')
        expect(result.message).toBeDefined()
        expect(typeof result.message).toBe('string')
        expect(typeof result.canRetry).toBe('boolean')
        expect(result.suggestions).toBeDefined()
        expect(Array.isArray(result.suggestions)).toBe(true)
        
        // Property: Error messages should be user-friendly
        expect(result.message.length).toBeGreaterThan(0)
        expect(result.suggestions!.length).toBeGreaterThan(0)
      }
    }
  })

  test('Property 23: Long Operation UI Feedback - Controller Lifecycle', () => {
    // **Feature: linkedin-ghostwriter, Property 23: Long Operation UI Feedback**
    
    fc.assert(fc.property(
      fc.record({
        showThinking: fc.boolean(),
        estimatedDuration: fc.integer({ min: 1000, max: 30000 }),
        operation: fc.string({ minLength: 1, maxLength: 50 })
      }),
      (options) => {
        const controller = errorHandler.createLongOperationFeedback(options)

        // Property: UI feedback controller should manage lifecycle correctly
        expect(controller).toBeInstanceOf(UIFeedbackController)
        
        // Should be able to start and stop without errors
        expect(() => controller.start()).not.toThrow()
        expect(() => controller.stop()).not.toThrow()
        
        // Should be able to update message
        expect(() => controller.updateMessage('Updated message')).not.toThrow()
        
        // Multiple starts/stops should be safe
        expect(() => {
          controller.start()
          controller.start() // Should not cause issues
          controller.stop()
          controller.stop() // Should not cause issues
        }).not.toThrow()
      }
    ), { numRuns: 100 })
  })

  test('Property 23: Long Operation UI Feedback - Progress Updates', () => {
    // **Feature: linkedin-ghostwriter, Property 23: Long Operation UI Feedback**
    
    vi.useFakeTimers()
    
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    
    const controller = errorHandler.createLongOperationFeedback({
      showThinking: true,
      estimatedDuration: 5000,
      operation: 'Test operation'
    })

    controller.start()
    
    // Fast-forward time to trigger progress updates
    vi.advanceTimersByTime(500)
    
    controller.stop()

    // Property: UI feedback should log progress information
    expect(consoleSpy).toHaveBeenCalled()
    
    // Should have logged initial thinking message
    const calls = consoleSpy.mock.calls
    const hasThinkingMessage = calls.some(call => 
      call[0].includes('🤔') && call[0].includes('Test operation')
    )
    expect(hasThinkingMessage).toBe(true)

    consoleSpy.mockRestore()
    vi.useRealTimers()
  })

  test('Property 8: Moderation Failure Handling - Retry Logic', async () => {
    // **Feature: linkedin-ghostwriter, Property 8: Moderation Failure Handling**
    
    let attemptCount = 0
    const maxRetries = 3
    
    const mockOperation = vi.fn().mockImplementation(() => {
      attemptCount++
      if (attemptCount <= maxRetries) {
        throw new Error(`Attempt ${attemptCount} failed`)
      }
      return `Success on attempt ${attemptCount}`
    })

    const result = await errorHandler.retryWithBackoff(mockOperation, maxRetries, 100)
    
    // Property: Successful retry should return the result
    expect(result).toBe(`Success on attempt ${attemptCount}`)
    expect(attemptCount).toBe(maxRetries + 1)
    expect(mockOperation).toHaveBeenCalledTimes(attemptCount)
  })

  test('Property 8: Moderation Failure Handling - Retry Logic Failure', async () => {
    // **Feature: linkedin-ghostwriter, Property 8: Moderation Failure Handling**
    
    let attemptCount = 0
    const maxRetries = 2
    
    const mockOperation = vi.fn().mockImplementation(() => {
      attemptCount++
      throw new Error(`Attempt ${attemptCount} failed`)
    })

    try {
      await errorHandler.retryWithBackoff(mockOperation, maxRetries, 100)
      expect.fail('Should have thrown an error')
    } catch (error) {
      // Property: If all retries fail, should throw the last error
      expect(attemptCount).toBe(maxRetries + 1)
      expect(error).toBeInstanceOf(Error)
      expect(mockOperation).toHaveBeenCalledTimes(attemptCount)
    }
  })

  test('Property 23: Long Operation UI Feedback - Message Updates', () => {
    // **Feature: linkedin-ghostwriter, Property 23: Long Operation UI Feedback**
    
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    
    const controller = errorHandler.createLongOperationFeedback({
      showThinking: true,
      estimatedDuration: 5000,
      operation: 'Initial message'
    })

    controller.start()
    controller.updateMessage('Updated message')
    controller.stop()

    // Property: Message updates should be reflected in console output
    const calls = consoleSpy.mock.calls
    const hasUpdatedMessage = calls.some(call => 
      call[0].includes('Updated message')
    )
    expect(hasUpdatedMessage).toBe(true)

    consoleSpy.mockRestore()
  })

  test('Property 8: Moderation Failure Handling - Context Preservation', async () => {
    // **Feature: linkedin-ghostwriter, Property 8: Moderation Failure Handling**
    
    const context = {
      userId: 'test-user',
      provider: 'openai',
      requestId: 'test-request',
      operation: 'generation'
    }
    
    const error = createProviderError('PROVIDER_UNAVAILABLE', 'Test error', {
      provider: 'openai'
    })

    const result = await errorHandler.handleProviderError(error, context)

    // Property: Error responses should preserve relevant context
    expect(result.metadata).toBeDefined()
    expect(result.metadata?.failedProvider).toBe(context.provider)
    expect(typeof result.metadata).toBe('object')
    expect(result.metadata).not.toBeNull()
  })

  test('Property 8: Moderation Failure Handling - Error Message Quality', async () => {
    // **Feature: linkedin-ghostwriter, Property 8: Moderation Failure Handling**
    
    // Test multiple error types to validate message quality
    const errorTypes: ProviderError['type'][] = ['INVALID_INPUT', 'TIMEOUT', 'UNKNOWN']
    
    for (const errorType of errorTypes) {
      const error = createProviderError(errorType, 'Test error message')
      const result = await errorHandler.handleProviderError(error, {})

      // Property: All error responses should have user-friendly messages
      expect(result.message).toBeDefined()
      expect(typeof result.message).toBe('string')
      expect(result.message.length).toBeGreaterThan(0)
      
      // Should not expose internal error details directly
      expect(result.message).not.toContain('Error:')
      expect(result.message).not.toContain('Exception:')
      
      // Should provide actionable guidance
      expect(result.suggestions).toBeDefined()
      expect(Array.isArray(result.suggestions)).toBe(true)
      expect(result.suggestions!.length).toBeGreaterThan(0)
      
      // Each suggestion should be a non-empty string
      result.suggestions!.forEach(suggestion => {
        expect(typeof suggestion).toBe('string')
        expect(suggestion.length).toBeGreaterThan(0)
      })
    }
  })
})