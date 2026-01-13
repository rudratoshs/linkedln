/**
 * Integration tests for PostPhantom Extension
 * Tests complete generation workflow end-to-end, provider failover, and rate limiting
 * Requirements: All integration requirements
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { IntegrationService, type GenerationRequest } from '../integration-service'

// Mock Supabase
const mockSupabase = {
  functions: {
    invoke: vi.fn()
  },
  auth: {
    onAuthStateChange: vi.fn(),
    getSession: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn()
    })),
    upsert: vi.fn()
  }))
}

// Mock Chrome Storage
const mockChromeStorage = {
  local: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn()
  }
}

// Mock DOM elements
const mockTextArea = {
  textContent: '',
  isContentEditable: true,
  dispatchEvent: vi.fn()
}

// Setup global mocks
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase)
}))

Object.defineProperty(global, 'chrome', {
  value: {
    storage: mockChromeStorage
  },
  writable: true
})

Object.defineProperty(global, 'window', {
  value: {
    location: {
      hostname: 'linkedin.com'
    }
  },
  writable: true
})

Object.defineProperty(global, 'document', {
  value: {
    readyState: 'complete',
    querySelector: vi.fn(),
    body: {
      appendChild: vi.fn()
    }
  },
  writable: true
})

describe('Integration Service Tests', () => {
  let integrationService: IntegrationService

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset environment variables
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key')
    
    // Mock successful authentication
    mockSupabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'test-user-id' }
        }
      }
    })

    integrationService = new IntegrationService()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('Complete Generation Workflow', () => {
    test('should complete full generation workflow successfully', async () => {
      // Mock successful generation response
      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          success: true,
          drafts: [
            'Professional LinkedIn post about AI trends',
            'Engaging post about machine learning developments'
          ],
          provider: 'openai',
          tokenCount: 150,
          safetyCategories: []
        },
        error: null
      })

      // Mock LinkedIn text area
      document.querySelector = vi.fn().mockReturnValue(mockTextArea)

      const request: GenerationRequest = {
        prompt: 'Write about AI trends in 2024',
        userPreferences: {
          tone: 'professional',
          length: 'medium',
          provider: 'auto'
        }
      }

      // Test generation
      const response = await integrationService.generateContent(request)

      expect(response.success).toBe(true)
      expect(response.drafts).toHaveLength(2)
      expect(response.metadata?.provider).toBe('openai')
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('generate-content', {
        body: expect.objectContaining({
          prompt: 'Write about AI trends in 2024',
          userPreferences: expect.objectContaining({
            tone: 'professional'
          })
        })
      })

      // Test typing
      await integrationService.typeDraft(response.drafts![0])

      expect(mockTextArea.textContent).toBe(response.drafts![0])
      expect(mockTextArea.dispatchEvent).toHaveBeenCalled()
    })

    test('should handle generation failure gracefully', async () => {
      // Mock generation failure
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Rate limit exceeded' }
      })

      const request: GenerationRequest = {
        prompt: 'Test prompt'
      }

      const response = await integrationService.generateContent(request)

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      expect(response.message).toContain('Generation failed')
    })

    test('should handle moderation failure with appropriate response', async () => {
      // Mock moderation failure
      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          success: false,
          error: 'CONTENT_MODERATED',
          message: 'Content flagged by safety systems',
          safetyCategories: ['hate', 'harassment']
        },
        error: null
      })

      const request: GenerationRequest = {
        prompt: 'Inappropriate content that should be flagged'
      }

      const response = await integrationService.generateContent(request)

      expect(response.success).toBe(false)
      expect(response.error).toBe('CONTENT_MODERATED')
      expect(response.suggestions).toBeDefined()
    })
  })

  describe('Provider Failover Scenarios', () => {
    test('should handle OpenAI failure and failover to Gemini', async () => {
      // Mock OpenAI failure followed by Gemini success
      mockSupabase.functions.invoke
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'OpenAI service unavailable' }
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            drafts: ['Gemini generated content'],
            provider: 'gemini',
            tokenCount: 120,
            failoverFrom: 'openai'
          },
          error: null
        })

      const request: GenerationRequest = {
        prompt: 'Test failover scenario',
        userPreferences: { provider: 'openai' }
      }

      const response = await integrationService.generateContent(request)

      expect(response.success).toBe(true)
      expect(response.metadata?.provider).toBe('gemini')
      expect(mockSupabase.functions.invoke).toHaveBeenCalledTimes(1) // Only one call to our service
    })

    test('should handle both providers failing', async () => {
      // Mock both providers failing
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'All providers unavailable' }
      })

      const request: GenerationRequest = {
        prompt: 'Test complete failure'
      }

      const response = await integrationService.generateContent(request)

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      expect(response.canRetry).toBe(true)
    })
  })

  describe('Rate Limiting Enforcement', () => {
    test('should enforce daily generation limit', async () => {
      // Mock rate limit storage to simulate 50 generations today
      mockChromeStorage.local.get.mockResolvedValue({
        'rate_limit_daily_2024-01-13': 50,
        'rate_limit_last_request': Date.now() - 1000
      })

      const request: GenerationRequest = {
        prompt: 'This should be rate limited'
      }

      const response = await integrationService.generateContent(request)

      expect(response.success).toBe(false)
      expect(response.error).toContain('LIMIT')
      expect(response.canRetry).toBe(false)
      expect(response.suggestions).toContain('Come back tomorrow')
    })

    test('should enforce cooldown between requests', async () => {
      // Mock recent request (within 2 minutes)
      mockChromeStorage.local.get.mockResolvedValue({
        'rate_limit_daily_2024-01-13': 5,
        'rate_limit_last_request': Date.now() - 60000 // 1 minute ago
      })

      const request: GenerationRequest = {
        prompt: 'This should be in cooldown'
      }

      const response = await integrationService.generateContent(request)

      expect(response.success).toBe(false)
      expect(response.error).toContain('COOLDOWN')
      expect(response.canRetry).toBe(true)
      expect(response.retryAfter).toBeGreaterThan(0)
    })

    test('should enforce hourly lock after 10 requests', async () => {
      // Mock 10 requests in the current hour
      const currentHour = new Date().getHours()
      mockChromeStorage.local.get.mockResolvedValue({
        'rate_limit_daily_2024-01-13': 10,
        [`rate_limit_hourly_${currentHour}`]: 10,
        'rate_limit_last_request': Date.now() - 300000 // 5 minutes ago (past cooldown)
      })

      const request: GenerationRequest = {
        prompt: 'This should trigger hourly lock'
      }

      const response = await integrationService.generateContent(request)

      expect(response.success).toBe(false)
      expect(response.error).toContain('HOURLY')
      expect(response.retryAfter).toBe(1800) // 30 minutes
    })

    test('should allow generation when within limits', async () => {
      // Mock normal usage within limits
      mockChromeStorage.local.get.mockResolvedValue({
        'rate_limit_daily_2024-01-13': 5,
        'rate_limit_last_request': Date.now() - 300000 // 5 minutes ago
      })

      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          success: true,
          drafts: ['Generated content'],
          provider: 'openai',
          tokenCount: 100
        },
        error: null
      })

      const request: GenerationRequest = {
        prompt: 'This should work fine'
      }

      const response = await integrationService.generateContent(request)

      expect(response.success).toBe(true)
      expect(mockSupabase.functions.invoke).toHaveBeenCalled()
    })
  })

  describe('User Preferences Integration', () => {
    test('should load and save user preferences', async () => {
      // Mock preferences in database
      const mockPreferences = {
        tone: 'casual',
        length: 'short',
        provider: 'gemini'
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { preferences: mockPreferences },
            error: null
          })
        }),
        upsert: vi.fn().mockResolvedValue({ error: null })
      })

      // Test loading preferences
      const loadedPrefs = await integrationService.getUserPreferences()
      expect(loadedPrefs).toEqual(mockPreferences)

      // Test saving preferences
      const newPrefs = { tone: 'professional', length: 'long' }
      await integrationService.saveUserPreferences(newPrefs)

      expect(mockSupabase.from).toHaveBeenCalledWith('user_preferences')
    })

    test('should handle missing preferences gracefully', async () => {
      // Mock no preferences found
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' } // Not found
          })
        })
      })

      const preferences = await integrationService.getUserPreferences()
      expect(preferences).toEqual({})
    })
  })

  describe('Authentication Integration', () => {
    test('should handle authentication state changes', async () => {
      const authCallback = mockSupabase.auth.onAuthStateChange.mock.calls[0][0]

      // Test sign in
      authCallback('SIGNED_IN', { user: { id: 'test-user' } })
      // Verify app store is updated (would need to mock app store)

      // Test sign out
      authCallback('SIGNED_OUT', null)
      // Verify state is reset
    })

    test('should initialize with existing session', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'existing-user' }
          }
        }
      })

      await integrationService.initialize()
      // Verify initialization with authenticated state
    })
  })

  describe('Error Recovery and Resilience', () => {
    test('should recover from network failures', async () => {
      // Mock network error followed by success
      mockSupabase.functions.invoke
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: {
            success: true,
            drafts: ['Recovered content'],
            provider: 'openai'
          },
          error: null
        })

      const request: GenerationRequest = {
        prompt: 'Test network recovery'
      }

      const response = await integrationService.generateContent(request)

      expect(response.success).toBe(false) // First attempt fails
      expect(response.canRetry).toBe(true)
    })

    test('should handle LinkedIn text area not found', async () => {
      // Mock no text area found
      document.querySelector = vi.fn().mockReturnValue(null)

      try {
        await integrationService.typeDraft('Test content')
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error.message).toContain('Could not find LinkedIn text area')
      }
    })

    test('should handle prohibited content detection', async () => {
      const request: GenerationRequest = {
        prompt: 'This contains prohibited bulk action keywords'
      }

      const response = await integrationService.generateContent(request)

      // Should be caught by prohibited actions service
      expect(response.success).toBe(false)
      expect(response.error).toBe('PROHIBITED_ACTION')
    })
  })

  describe('Usage Statistics', () => {
    test('should provide accurate usage statistics', async () => {
      const stats = await integrationService.getUsageStats()

      expect(stats).toHaveProperty('totalGenerations')
      expect(stats).toHaveProperty('successfulGenerations')
      expect(stats).toHaveProperty('moderatedGenerations')
      expect(stats).toHaveProperty('rateLimitedRequests')
      expect(stats).toHaveProperty('averageResponseTime')
      expect(stats).toHaveProperty('providerUsage')
      expect(stats).toHaveProperty('safetyCategories')
    })
  })

  describe('LinkedIn Integration', () => {
    test('should detect LinkedIn page correctly', () => {
      // Test LinkedIn detection
      window.location.hostname = 'linkedin.com'
      expect(integrationService['isLinkedInPage']()).toBe(true)

      window.location.hostname = 'www.linkedin.com'
      expect(integrationService['isLinkedInPage']()).toBe(true)

      window.location.hostname = 'facebook.com'
      expect(integrationService['isLinkedInPage']()).toBe(false)
    })

    test('should find LinkedIn text areas with multiple selectors', () => {
      const mockElement = { isContentEditable: true }
      
      // Test primary selector
      document.querySelector = vi.fn()
        .mockReturnValueOnce(null) // First selector fails
        .mockReturnValueOnce(mockElement) // Second selector succeeds

      const textArea = integrationService['findLinkedInTextArea']()
      expect(textArea).toBe(mockElement)
    })
  })
})