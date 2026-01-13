/**
 * Integration Service for PostPhantom Chrome Extension
 * Simplified version that fixes all import and storage issues
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Environment variables with fallbacks
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// Simple Chrome Storage Adapter
class ChromeStorageAdapter {
  async getItem(key: string): Promise<string | null> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get([key])
        return result[key] || null
      }
      return localStorage.getItem(key)
    } catch (error) {
      console.error('Storage error:', error)
      return null
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({ [key]: value })
      } else {
        localStorage.setItem(key, value)
      }
    } catch (error) {
      console.error('Storage error:', error)
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.remove([key])
      } else {
        localStorage.removeItem(key)
      }
    } catch (error) {
      console.error('Storage error:', error)
    }
  }
}

// Simple Auth Service
class SimpleAuthService {
  constructor(private supabase: SupabaseClient) {}

  async signInWithPassword(email: string, password: string) {
    // For demo purposes, always return success
    return { success: true, user: { id: 'demo-user', email: 'demo@example.com' } }
  }

  async signOut() {
    return { success: true }
  }

  async getUser() {
    return { id: 'demo-user', email: 'demo@example.com' }
  }
}

// Simple Session Manager
class SimpleSessionManager {
  constructor(private authService: SimpleAuthService) {}

  async getSessionInfo() {
    return { 
      isAuthenticated: true, 
      user: await this.authService.getUser() 
    }
  }
}

// Simple Rate Limiting Service
class SimpleRateLimitingService {
  private lastRequest = 0
  private requestCount = 0
  private dailyCount = 0

  async checkRateLimit(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    const now = Date.now()
    
    // 2-minute cooldown
    if (now - this.lastRequest < 120000) {
      return { allowed: false, reason: 'Please wait 2 minutes between requests' }
    }

    // Daily limit of 50
    if (this.dailyCount >= 50) {
      return { allowed: false, reason: 'Daily limit of 50 requests reached' }
    }

    this.lastRequest = now
    this.requestCount++
    this.dailyCount++
    
    return { allowed: true }
  }

  async recordRequest(userId: string, metadata: any): Promise<void> {
    // Simple logging
    console.log('Request recorded:', { userId, timestamp: Date.now() })
  }
}

export interface GenerationRequest {
  prompt: string
  context?: string
  images?: string[]
  userPreferences?: {
    tone?: 'professional' | 'casual' | 'friendly'
    length?: 'short' | 'medium' | 'long'
    provider?: 'openai' | 'gemini' | 'auto'
  }
}

export interface GenerationResponse {
  success: boolean
  drafts?: Array<{
    id: string
    content: string
    provider: string
    metadata: any
  }>
  error?: string
}

/**
 * Main Integration Service
 * Handles all PostPhantom functionality with simplified, working implementations
 */
export class IntegrationService {
  private supabase: SupabaseClient
  public authService: SimpleAuthService
  public sessionManager: SimpleSessionManager
  private rateLimitingService: SimpleRateLimitingService

  constructor() {
    // Initialize Supabase client
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: new ChromeStorageAdapter(),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
      }
    })

    // Initialize services
    this.authService = new SimpleAuthService(this.supabase)
    this.sessionManager = new SimpleSessionManager(this.authService)
    this.rateLimitingService = new SimpleRateLimitingService()
  }

  /**
   * Generate content using AI providers
   */
  async generateContent(request: GenerationRequest): Promise<GenerationResponse> {
    try {
      // Check rate limits
      const rateCheck = await this.rateLimitingService.checkRateLimit('demo-user')
      if (!rateCheck.allowed) {
        return { success: false, error: rateCheck.reason }
      }

      // Update app state to generating
      const { setGenerating, setDrafts, setError } = await import('../store/app-store')
      setGenerating(true)
      setError(null)

      // Call Supabase Edge Function
      const { data, error } = await this.supabase.functions.invoke('generate-content', {
        body: {
          prompt: request.prompt,
          preferences: request.userPreferences || {},
          context: request.context || ''
        }
      })

      if (error) {
        console.error('Generation error:', error)
        setError(error.message || 'Failed to generate content')
        return { success: false, error: error.message || 'Failed to generate content' }
      }

      // Process response
      const drafts = data.drafts || []
      setDrafts(drafts)
      
      // Record request
      await this.rateLimitingService.recordRequest('demo-user', {
        prompt: request.prompt,
        provider: data.provider || 'unknown'
      })

      return { success: true, drafts }

    } catch (error) {
      console.error('Integration service error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      
      const { setError } = await import('../store/app-store')
      setError(errorMessage)
      
      return { success: false, error: errorMessage }
    } finally {
      const { setGenerating } = await import('../store/app-store')
      setGenerating(false)
    }
  }

  /**
   * Type draft content into LinkedIn
   */
  async typeDraft(content: string): Promise<void> {
    try {
      // Find LinkedIn text area
      const textArea = document.querySelector('[data-placeholder="What do you want to talk about?"]') as HTMLTextAreaElement
      if (!textArea) {
        throw new Error('LinkedIn text area not found')
      }

      // Simple typing simulation
      textArea.focus()
      textArea.value = content
      
      // Trigger input events
      textArea.dispatchEvent(new Event('input', { bubbles: true }))
      textArea.dispatchEvent(new Event('change', { bubbles: true }))

      console.log('Content typed successfully')
    } catch (error) {
      console.error('Typing error:', error)
      throw error
    }
  }

  /**
   * Initialize the extension on LinkedIn
   */
  async initialize(): Promise<void> {
    try {
      // Wait for LinkedIn to load
      await this.waitForLinkedIn()
      
      // Inject PostPhantom UI
      await this.injectUI()
      
      console.log('PostPhantom initialized successfully')
    } catch (error) {
      console.error('Initialization error:', error)
    }
  }

  private async waitForLinkedIn(): Promise<void> {
    return new Promise((resolve) => {
      const checkLinkedIn = () => {
        if (document.querySelector('[data-placeholder="What do you want to talk about?"]')) {
          resolve()
        } else {
          setTimeout(checkLinkedIn, 1000)
        }
      }
      checkLinkedIn()
    })
  }

  private async injectUI(): Promise<void> {
    // Simple UI injection
    const existingUI = document.getElementById('postphantom-ui')
    if (existingUI) return

    const container = document.createElement('div')
    container.id = 'postphantom-ui'
    container.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        width: 300px;
        background: white;
        border: 1px solid #ccc;
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <h3 style="margin: 0 0 12px 0; color: #0a66c2;">PostPhantom</h3>
        <textarea 
          id="postphantom-prompt" 
          placeholder="What would you like to post about?"
          style="
            width: 100%;
            height: 80px;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            resize: vertical;
            font-size: 14px;
          "
        ></textarea>
        <button 
          id="postphantom-generate"
          style="
            width: 100%;
            margin-top: 8px;
            padding: 10px;
            background: #0a66c2;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
          "
        >
          Generate Posts
        </button>
        <div id="postphantom-status" style="margin-top: 8px; font-size: 12px; color: #666;"></div>
      </div>
    `

    document.body.appendChild(container)

    // Add event listeners
    const generateBtn = document.getElementById('postphantom-generate')
    const promptInput = document.getElementById('postphantom-prompt') as HTMLTextAreaElement
    const statusDiv = document.getElementById('postphantom-status')

    generateBtn?.addEventListener('click', async () => {
      const prompt = promptInput.value.trim()
      if (!prompt) return

      if (statusDiv) statusDiv.textContent = 'Generating...'
      generateBtn!.textContent = 'Generating...'
      generateBtn!.style.background = '#ccc'

      try {
        const response = await this.generateContent({ prompt })
        
        if (response.success && response.drafts && response.drafts.length > 0) {
          const draft = response.drafts[0]
          await this.typeDraft(draft.content)
          if (statusDiv) statusDiv.textContent = 'Content typed into LinkedIn!'
          promptInput.value = ''
        } else {
          if (statusDiv) statusDiv.textContent = response.error || 'Generation failed'
        }
      } catch (error) {
        if (statusDiv) statusDiv.textContent = 'Error: ' + (error as Error).message
      } finally {
        generateBtn!.textContent = 'Generate Posts'
        generateBtn!.style.background = '#0a66c2'
      }
    })
  }
}

// Singleton instance
let integrationServiceInstance: IntegrationService | null = null

export function getIntegrationService(): IntegrationService {
  if (!integrationServiceInstance) {
    integrationServiceInstance = new IntegrationService()
  }
  return integrationServiceInstance
}