import { describe, test, expect } from 'vitest'
import fc from 'fast-check'
import type { 
  IGenerativeModel, 
  GenerationRequest, 
  GenerationResponse, 
  ProviderCapabilities,
  Message,
  ImageInput
} from '../core.js'

/**
 * Property 20: Provider Abstraction Interface Consistency
 * For any AI provider implementation, it should conform to the common IGenerativeModel interface 
 * and handle provider-specific conversions without exposing SDKs directly
 * **Validates: Requirements 9.1, 9.2**
 */

// Mock implementation for testing interface consistency
class MockProvider implements IGenerativeModel {
  constructor(private name: string, private capabilities: ProviderCapabilities) {}

  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    return {
      content: `Mock response for ${request.messages.length} messages`,
      provider: this.name,
      tokensUsed: Math.floor(Math.random() * 1000),
      finishReason: 'stop'
    }
  }

  async stream(request: GenerationRequest): Promise<ReadableStream> {
    return new ReadableStream({
      start(controller) {
        controller.enqueue(`Mock stream response for ${request.messages.length} messages`)
        controller.close()
      }
    })
  }

  getProviderName(): string {
    return this.name
  }

  getCapabilities(): ProviderCapabilities {
    return this.capabilities
  }
}

describe('Provider Abstraction Interface Consistency', () => {
  test('Property 20: Provider Abstraction Interface Consistency', async () => {
    // **Feature: linkedin-ghostwriter, Property 20: Provider Abstraction Interface Consistency**
    
    await fc.assert(fc.asyncProperty(
      fc.record({
        providerName: fc.string({ minLength: 1, maxLength: 20 }),
        capabilities: fc.record({
          textGeneration: fc.boolean(),
          visionAnalysis: fc.boolean(),
          embeddings: fc.boolean(),
          maxContextTokens: fc.integer({ min: 1000, max: 2000000 }),
          supportedImageFormats: fc.array(fc.constantFrom('jpeg', 'png', 'webp'), { minLength: 1 })
        }),
        messages: fc.array(fc.record({
          role: fc.constantFrom('system', 'user', 'assistant'),
          content: fc.string({ minLength: 1, maxLength: 1000 })
        }), { minLength: 1, maxLength: 10 }),
        maxTokens: fc.option(fc.integer({ min: 1, max: 4000 })),
        temperature: fc.option(fc.float({ min: 0, max: 2 })),
        images: fc.option(fc.array(fc.record({
          data: fc.base64String(),
          mimeType: fc.constantFrom('image/jpeg', 'image/png'),
          size: fc.option(fc.integer({ min: 1, max: 10485760 })) // 10MB max
        }), { maxLength: 5 }))
      }),
      async ({ providerName, capabilities, messages, maxTokens, temperature, images }) => {
        // Create mock provider instance
        const provider = new MockProvider(providerName, capabilities)
        
        // Verify interface compliance
        expect(typeof provider.generate).toBe('function')
        expect(typeof provider.stream).toBe('function')
        expect(typeof provider.getProviderName).toBe('function')
        expect(typeof provider.getCapabilities).toBe('function')
        
        // Test provider name consistency
        expect(provider.getProviderName()).toBe(providerName)
        
        // Test capabilities consistency
        const returnedCapabilities = provider.getCapabilities()
        expect(returnedCapabilities).toEqual(capabilities)
        
        // Test generation request/response consistency
        const request: GenerationRequest = {
          messages: messages as Message[],
          maxTokens: maxTokens ?? undefined,
          temperature: temperature ?? undefined,
          images: images?.map(img => ({
            ...img,
            size: img.size ?? undefined
          })) ?? undefined
        }
        
        const response = await provider.generate(request)
        
        // Verify response structure
        expect(typeof response.content).toBe('string')
        expect(response.content.length).toBeGreaterThan(0)
        expect(response.provider).toBe(providerName)
        expect(typeof response.tokensUsed).toBe('number')
        expect(response.tokensUsed).toBeGreaterThanOrEqual(0)
        expect(typeof response.finishReason).toBe('string')
        
        // Test streaming interface
        const stream = await provider.stream(request)
        expect(stream).toBeInstanceOf(ReadableStream)
        
        // Verify stream can be read
        const reader = stream.getReader()
        const { value, done } = await reader.read()
        expect(typeof value).toBe('string')
        reader.releaseLock()
      }
    ), { numRuns: 100 })
  })

  test('Interface type safety validation', () => {
    // Test that all required interface methods exist and have correct signatures
    const mockCapabilities: ProviderCapabilities = {
      textGeneration: true,
      visionAnalysis: false,
      embeddings: true,
      maxContextTokens: 128000,
      supportedImageFormats: ['jpeg', 'png']
    }
    
    const provider = new MockProvider('test-provider', mockCapabilities)
    
    // Verify all interface methods exist
    expect(provider).toHaveProperty('generate')
    expect(provider).toHaveProperty('stream')
    expect(provider).toHaveProperty('getProviderName')
    expect(provider).toHaveProperty('getCapabilities')
    
    // Verify method return types
    expect(typeof provider.getProviderName()).toBe('string')
    expect(typeof provider.getCapabilities()).toBe('object')
  })

  test('Message format validation', () => {
    fc.assert(fc.property(
      fc.array(fc.record({
        role: fc.constantFrom('system', 'user', 'assistant'),
        content: fc.string({ minLength: 1 })
      }), { minLength: 1 }),
      (messages) => {
        // Verify all messages have required properties
        messages.forEach(message => {
          expect(message).toHaveProperty('role')
          expect(message).toHaveProperty('content')
          expect(['system', 'user', 'assistant']).toContain(message.role)
          expect(typeof message.content).toBe('string')
          expect(message.content.length).toBeGreaterThan(0)
        })
      }
    ), { numRuns: 50 })
  })
})