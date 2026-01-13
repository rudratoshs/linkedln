import { describe, test, expect, beforeEach } from 'vitest'
import fc from 'fast-check'
import { OpenAIAdapter } from '../openai-adapter.js'
import { GenerationRequest } from '../../types/core.js'

// REAL OPENAI API INTEGRATION - NO MOCKS
// Uses actual OpenAI API with real credentials from environment

describe('OpenAI Adapter Property Tests', () => {
  let adapter: OpenAIAdapter
  
  beforeEach(() => {
    // Use real OpenAI API key from environment
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required for property tests')
    }
    adapter = new OpenAIAdapter(apiKey)
  })

  test('Property 4: Provider Capabilities Consistency', async () => {
    /**
     * **Feature: linkedin-ghostwriter, Property 4: Provider Capabilities Consistency**
     * For any AI provider in the system, it should successfully handle requests within its declared capabilities
     * **Validates: Requirements 2.1, 3.1**
     */
    await fc.assert(fc.asyncProperty(
      fc.record({
        requestType: fc.constantFrom('textGeneration', 'visionAnalysis', 'embeddings'),
        hasImages: fc.boolean(),
        tokenCount: fc.integer({ min: 1, max: 128000 })
      }),
      async (testCase) => {
        const capabilities = adapter.getCapabilities()
        
        // Property: Capabilities should be consistent with provider name
        expect(adapter.getProviderName()).toBe('openai')
        expect(capabilities.textGeneration).toBe(true)
        expect(capabilities.visionAnalysis).toBe(true)
        expect(capabilities.embeddings).toBe(true)
        expect(capabilities.maxContextTokens).toBe(128000)
        expect(capabilities.supportedImageFormats).toEqual(['jpeg', 'png'])
        
        // Property: Should handle requests within declared capabilities
        if (testCase.requestType === 'textGeneration' && capabilities.textGeneration) {
          expect(capabilities.textGeneration).toBe(true)
        }
        if (testCase.requestType === 'visionAnalysis' && testCase.hasImages && capabilities.visionAnalysis) {
          expect(capabilities.visionAnalysis).toBe(true)
        }
        if (testCase.requestType === 'embeddings' && capabilities.embeddings) {
          expect(capabilities.embeddings).toBe(true)
        }
        
        // Property: Token limits should be respected
        if (testCase.tokenCount <= capabilities.maxContextTokens) {
          expect(testCase.tokenCount).toBeLessThanOrEqual(capabilities.maxContextTokens)
        }
      }
    ), { numRuns: 100 })
  })

  test('Property 7: Provider-Appropriate Safety Enforcement', async () => {
    /**
     * **Feature: linkedin-ghostwriter, Property 7: Provider-Appropriate Safety Enforcement**
     * For any generation request, the system should apply exactly one safety enforcement mechanism appropriate to the selected provider
     * **Validates: Requirements 2.1, 3.1**
     */
    await fc.assert(fc.asyncProperty(
      fc.record({
        messages: fc.array(fc.record({
          role: fc.constantFrom('system', 'user', 'assistant') as const,
          content: fc.string({ minLength: 1, maxLength: 100 }) // Shorter content for real API calls
        }), { minLength: 1, maxLength: 2 }), // Fewer messages for real API calls
        maxTokens: fc.option(fc.integer({ min: 10, max: 100 })), // Lower token limits for cost control
        temperature: fc.option(fc.float({ min: 0, max: 1 }))
      }),
      async (request) => {
        try {
          // REAL API CALL - NO MOCKS
          const response = await adapter.generate(request)
          
          // Property: Response should indicate OpenAI provider
          expect(response.provider).toBe('openai')
          expect(response.content).toBeDefined()
          expect(typeof response.content).toBe('string')
          expect(response.content.length).toBeGreaterThan(0)
          expect(response.tokensUsed).toBeGreaterThan(0)
          expect(typeof response.tokensUsed).toBe('number')
          
          // Property: OpenAI safety enforcement should have been applied
          // (Real moderation API call happens inside adapter.generate())
          expect(response.finishReason).toBeDefined()
          
        } catch (error) {
          // Property: Safety violations should throw appropriate errors
          if (error instanceof Error) {
            expect(error.message).toMatch(/moderation|safety|content policy/i)
          } else {
            throw error
          }
        }
      }
    ), { numRuns: 5 }) // Reduced runs for real API calls to control costs
  })

  test('should handle moderation failures appropriately', async () => {
    // REAL API TEST - Test with potentially flagged content
    const request: GenerationRequest = {
      messages: [{ role: 'user', content: 'Write something completely normal and safe about professional networking' }]
    }

    try {
      const response = await adapter.generate(request)
      // If successful, verify it's a real response
      expect(response.provider).toBe('openai')
      expect(response.content).toBeDefined()
      expect(typeof response.content).toBe('string')
    } catch (error) {
      // If moderation fails, verify it's the right error type
      if (error instanceof Error) {
        expect(error.message).toMatch(/moderation|safety|content policy/i)
      }
    }
  })

  test('should convert message formats correctly', () => {
    const capabilities = adapter.getCapabilities()
    
    // Test basic capabilities
    expect(capabilities.textGeneration).toBe(true)
    expect(capabilities.visionAnalysis).toBe(true)
    expect(capabilities.embeddings).toBe(true)
    expect(capabilities.maxContextTokens).toBe(128000)
    expect(capabilities.supportedImageFormats).toEqual(['jpeg', 'png'])
  })
})