import { describe, test, expect, beforeEach, vi } from 'vitest'
import fc from 'fast-check'
import { GeminiAdapter } from '../gemini-adapter.js'
import { GenerationRequest, ImageInput } from '../../types/core.js'

// Mock fetch globally
global.fetch = vi.fn()

describe('Gemini Adapter Property Tests', () => {
  let adapter: GeminiAdapter
  
  beforeEach(() => {
    adapter = new GeminiAdapter('test-api-key')
    vi.clearAllMocks()
  })

  test('Property 21: Gemini Message Format Conversion', async () => {
    /**
     * **Feature: linkedin-ghostwriter, Property 21: Gemini Message Format Conversion**
     * For any Gemini request, the Provider Abstraction Layer should correctly map SystemMessage to systemInstruction
     * **Validates: Requirements 9.3**
     */
    await fc.assert(fc.asyncProperty(
      fc.record({
        messages: fc.array(fc.record({
          role: fc.constantFrom('system', 'user', 'assistant'),
          content: fc.string({ minLength: 1, maxLength: 500 })
        }), { minLength: 1, maxLength: 5 }),
        maxTokens: fc.option(fc.integer({ min: 1, max: 4000 })),
        temperature: fc.option(fc.float({ min: 0, max: 2 })),
        systemInstruction: fc.option(fc.string({ minLength: 1, maxLength: 200 }))
      }),
      async (request) => {
        // Clear mocks before each iteration
        vi.clearAllMocks()
        
        // Mock successful Gemini response
        const mockGeminiResponse = {
          candidates: [{
            content: {
              parts: [{ text: 'Test response' }],
              role: 'model'
            },
            finishReason: 'STOP',
            safetyRatings: []
          }],
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 5,
            totalTokenCount: 15
          }
        }

        ;(global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockGeminiResponse)
        })

        const response = await adapter.generate(request)
        
        // Property: Should correctly map SystemMessage to systemInstruction
        const fetchCall = (global.fetch as any).mock.calls[0]
        const requestBody = JSON.parse(fetchCall[1].body)
        
        // Check if system messages are converted to systemInstruction
        const hasSystemMessage = request.messages.some(msg => msg.role === 'system')
        if (hasSystemMessage || request.systemInstruction) {
          expect(requestBody.systemInstruction).toBeDefined()
          expect(requestBody.systemInstruction.parts).toBeInstanceOf(Array)
          expect(requestBody.systemInstruction.parts[0].text).toBeDefined()
        }
        
        // Property: Non-system messages should be in contents array
        const nonSystemMessages = request.messages.filter(msg => msg.role !== 'system')
        if (nonSystemMessages.length > 0) {
          expect(requestBody.contents).toBeInstanceOf(Array)
          expect(requestBody.contents.length).toBe(nonSystemMessages.length)
        } else {
          // If only system messages, contents array should be empty or minimal
          expect(requestBody.contents).toBeInstanceOf(Array)
        }
        
        // Property: Assistant messages should be mapped to 'model' role
        const assistantMessages = nonSystemMessages.filter(msg => msg.role === 'assistant')
        const modelContents = requestBody.contents.filter((content: any) => content.role === 'model')
        expect(modelContents.length).toBe(assistantMessages.length)
        
        // Property: User messages should remain 'user' role
        const userMessages = nonSystemMessages.filter(msg => msg.role === 'user')
        const userContents = requestBody.contents.filter((content: any) => content.role === 'user')
        expect(userContents.length).toBe(userMessages.length)
        
        // Property: Response should indicate Gemini provider
        expect(response.provider).toBe('gemini')
        expect(response.content).toBeDefined()
      }
    ), { numRuns: 100 })
  })

  test('Property 22: Image Size Validation', async () => {
    /**
     * **Feature: linkedin-ghostwriter, Property 22: Image Size Validation**
     * For any image processing request, the system should enforce 10MB size limits
     * **Validates: Requirements 9.4**
     */
    await fc.assert(fc.asyncProperty(
      fc.record({
        messages: fc.array(fc.record({
          role: fc.constantFrom('user', 'assistant'),
          content: fc.string({ minLength: 1, maxLength: 200 })
        }), { minLength: 1, maxLength: 3 }),
        images: fc.option(fc.array(fc.record({
          data: fc.string({ minLength: 100, maxLength: 1000 }), // Base64 data
          mimeType: fc.constantFrom('image/jpeg', 'image/png'),
          size: fc.option(fc.integer({ min: 1, max: 15 * 1024 * 1024 })) // Up to 15MB to test limits
        }), { minLength: 1, maxLength: 3 }))
      }),
      async (request) => {
        // Clear mocks before each iteration
        vi.clearAllMocks()
        
        const MAX_SIZE = 10 * 1024 * 1024 // 10MB
        
        // Property: Should enforce 10MB size limits
        if (request.images) {
          const hasOversizedImage = request.images.some(img => 
            (img.size && img.size > MAX_SIZE) || 
            (!img.size && (img.data.length * 3) / 4 > MAX_SIZE)
          )
          
          if (hasOversizedImage) {
            // Should throw error for oversized images
            await expect(adapter.generate(request)).rejects.toThrow(/exceeds 10MB limit/)
          } else {
            // Should accept images within size limits
            const mockGeminiResponse = {
              candidates: [{
                content: {
                  parts: [{ text: 'Test response with image' }],
                  role: 'model'
                },
                finishReason: 'STOP',
                safetyRatings: []
              }],
              usageMetadata: {
                promptTokenCount: 20,
                candidatesTokenCount: 10,
                totalTokenCount: 30
              }
            }

            ;(global.fetch as any).mockResolvedValueOnce({
              ok: true,
              json: () => Promise.resolve(mockGeminiResponse)
            })

            const response = await adapter.generate(request)
            expect(response.provider).toBe('gemini')
            
            // Property: Images should be included in request as inlineData for user messages
            const fetchCall = (global.fetch as any).mock.calls[0]
            const requestBody = JSON.parse(fetchCall[1].body)
            
            const userContents = requestBody.contents.filter((content: any) => content.role === 'user')
            if (userContents.length > 0 && request.images.length > 0) {
              // Check if any user content has inline data
              const hasInlineData = userContents.some((content: any) => 
                content.parts.some((part: any) => part.inlineData)
              )
              expect(hasInlineData).toBe(true)
            }
          }
        } else {
          // No images - should work normally
          const mockGeminiResponse = {
            candidates: [{
              content: {
                parts: [{ text: 'Test response without image' }],
                role: 'model'
              },
              finishReason: 'STOP',
              safetyRatings: []
            }],
            usageMetadata: {
              promptTokenCount: 10,
              candidatesTokenCount: 5,
              totalTokenCount: 15
            }
          }

          ;(global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockGeminiResponse)
          })

          const response = await adapter.generate(request)
          expect(response.provider).toBe('gemini')
        }
      }
    ), { numRuns: 100 })
  })

  test('should have correct capabilities', () => {
    const capabilities = adapter.getCapabilities()
    
    // Test Gemini-specific capabilities
    expect(capabilities.textGeneration).toBe(true)
    expect(capabilities.visionAnalysis).toBe(true)
    expect(capabilities.embeddings).toBe(false) // Explicitly disabled
    expect(capabilities.maxContextTokens).toBe(1000000)
    expect(capabilities.supportedImageFormats).toEqual(['jpeg', 'png'])
  })

  test('should apply BLOCK_ONLY_HIGH safety settings', async () => {
    const request: GenerationRequest = {
      messages: [{ role: 'user', content: 'test content' }]
    }

    const mockGeminiResponse = {
      candidates: [{
        content: {
          parts: [{ text: 'Test response' }],
          role: 'model'
        },
        finishReason: 'STOP',
        safetyRatings: []
      }],
      usageMetadata: {
        promptTokenCount: 10,
        candidatesTokenCount: 5,
        totalTokenCount: 15
      }
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockGeminiResponse)
    })

    await adapter.generate(request)
    
    const fetchCall = (global.fetch as any).mock.calls[0]
    const requestBody = JSON.parse(fetchCall[1].body)
    
    // Should apply BLOCK_ONLY_HIGH safety settings
    expect(requestBody.safetySettings).toBeInstanceOf(Array)
    expect(requestBody.safetySettings.length).toBeGreaterThan(0)
    expect(requestBody.safetySettings.every((setting: any) => setting.threshold === 'BLOCK_ONLY_HIGH')).toBe(true)
  })

  test('should handle safety-blocked responses', async () => {
    const request: GenerationRequest = {
      messages: [{ role: 'user', content: 'test content' }]
    }

    const mockBlockedResponse = {
      candidates: [{
        content: { parts: [], role: 'model' },
        finishReason: 'SAFETY',
        safetyRatings: [{
          category: 'HARM_CATEGORY_HARASSMENT',
          probability: 'HIGH',
          blocked: true
        }]
      }]
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockBlockedResponse)
    })

    await expect(adapter.generate(request)).rejects.toThrow('Content blocked by Gemini safety filters')
  })
})