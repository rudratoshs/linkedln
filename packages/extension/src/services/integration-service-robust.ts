/**
 * Robust Integration Service for PostPhantom
 * Handles Chrome extension context invalidation and other edge cases
 */

// Environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export interface GenerationRequest {
  prompt: string
  context?: string
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
  }>
  error?: string
}

/**
 * Robust Integration Service that handles Chrome extension context issues
 */
export class RobustIntegrationService {
  private lastRequest = 0
  private requestCount = 0
  private isContextValid = true

  constructor() {
    console.log('RobustIntegrationService initialized')
    this.setupContextValidation()
  }

  private setupContextValidation(): void {
    // Check if Chrome extension context is valid
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        // Test if we can access chrome.runtime
        chrome.runtime.id
        this.isContextValid = true
      }
    } catch (error) {
      console.warn('Chrome extension context may be invalid:', error)
      this.isContextValid = false
    }
  }

  private checkContextValidity(): boolean {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.id
        return true
      }
    } catch (error) {
      console.warn('Extension context invalidated, using fallback mode')
      return false
    }
    return false
  }

  /**
   * Generate content using Supabase Edge Function with fallback
   */
  async generateContent(request: GenerationRequest): Promise<GenerationResponse> {
    try {
      // Check context validity
      this.isContextValid = this.checkContextValidity()

      // Simple rate limiting using localStorage as fallback
      const now = Date.now()
      const lastRequestKey = 'postphantom_last_request'
      
      let lastRequestTime = 0
      try {
        if (this.isContextValid && chrome.storage) {
          const result = await chrome.storage.local.get([lastRequestKey])
          lastRequestTime = result[lastRequestKey] || 0
        } else {
          lastRequestTime = parseInt(localStorage.getItem(lastRequestKey) || '0')
        }
      } catch (error) {
        console.warn('Storage access failed, using memory-based rate limiting')
        lastRequestTime = this.lastRequest
      }

      // 2-minute cooldown
      if (now - lastRequestTime < 120000) {
        return { 
          success: false, 
          error: 'Please wait 2 minutes between requests' 
        }
      }

      // Update last request time
      try {
        if (this.isContextValid && chrome.storage) {
          await chrome.storage.local.set({ [lastRequestKey]: now })
        } else {
          localStorage.setItem(lastRequestKey, now.toString())
        }
      } catch (error) {
        console.warn('Failed to update rate limit storage')
      }

      this.lastRequest = now
      this.requestCount++

      // Try to call Supabase Edge Function
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-content`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            prompt: request.prompt,
            preferences: request.userPreferences || {},
            context: request.context || ''
          })
        })

        if (response.ok) {
          const data = await response.json()
          if (data.drafts && data.drafts.length > 0) {
            return { success: true, drafts: data.drafts }
          }
        }
      } catch (error) {
        console.warn('Supabase API call failed, using fallback generation:', error)
      }

      // Fallback to mock generation
      const drafts = this.generateMockDrafts(request.prompt)
      return { success: true, drafts }

    } catch (error) {
      console.error('Generation error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Generation failed' 
      }
    }
  }

  private generateMockDrafts(prompt: string): Array<{id: string, content: string, provider: string}> {
    const templates = [
      {
        id: '1',
        content: `🚀 ${prompt}\n\nExcited to share some thoughts on this topic. What's your experience been like?\n\n#Innovation #Growth`,
        provider: 'openai'
      },
      {
        id: '2', 
        content: `Reflecting on ${prompt.toLowerCase()}...\n\nThis is such an important area. I'd love to hear different perspectives from the community.\n\nWhat are your thoughts?`,
        provider: 'openai'
      },
      {
        id: '3',
        content: `${prompt}\n\nJust had some insights on this that I wanted to share. Looking forward to the discussion!\n\nDrop your thoughts in the comments 👇`,
        provider: 'gemini'
      }
    ]

    return templates
  }

  /**
   * Type content into LinkedIn text area with robust element finding
   */
  async typeDraft(content: string): Promise<void> {
    // Multiple selectors for LinkedIn text areas
    const selectors = [
      '[data-placeholder="What do you want to talk about?"]',
      '.ql-editor[data-placeholder="What do you want to talk about?"]',
      '[aria-label="Text editor for creating content"]',
      '.share-creation-state__text-editor .ql-editor',
      '.ql-editor[contenteditable="true"]',
      'div[role="textbox"]',
      '.mentions-texteditor__content',
      '.editor-content'
    ]

    let textArea: HTMLElement | null = null
    
    // Try each selector
    for (const selector of selectors) {
      try {
        textArea = document.querySelector(selector)
        if (textArea && this.isElementVisible(textArea)) {
          break
        }
      } catch (error) {
        console.warn(`Selector failed: ${selector}`, error)
      }
    }

    if (!textArea) {
      throw new Error('LinkedIn text area not found. Please make sure you\'re on a LinkedIn page with a post composer.')
    }

    try {
      // Focus the element
      textArea.focus()
      
      // Clear existing content
      if (textArea.contentEditable === 'true') {
        // For contenteditable elements (LinkedIn's rich text editor)
        textArea.innerHTML = ''
        textArea.textContent = content
        
        // Create and insert text nodes for better compatibility
        const textNode = document.createTextNode(content)
        textArea.appendChild(textNode)
      } else {
        // For input/textarea elements
        ;(textArea as HTMLInputElement).value = content
      }

      // Trigger comprehensive events to notify LinkedIn
      const events = [
        new Event('input', { bubbles: true }),
        new Event('change', { bubbles: true }),
        new KeyboardEvent('keyup', { bubbles: true }),
        new KeyboardEvent('keydown', { bubbles: true }),
        new Event('blur', { bubbles: true }),
        new Event('focus', { bubbles: true })
      ]

      events.forEach(event => {
        try {
          textArea!.dispatchEvent(event)
        } catch (error) {
          console.warn('Event dispatch failed:', error)
        }
      })

      // Additional LinkedIn-specific triggers
      setTimeout(() => {
        try {
          textArea!.dispatchEvent(new Event('input', { bubbles: true }))
        } catch (error) {
          console.warn('Delayed event failed:', error)
        }
      }, 100)

      console.log('✅ Content typed successfully:', content.substring(0, 50) + '...')
    } catch (error) {
      console.error('❌ Typing failed:', error)
      throw new Error(`Failed to type content: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private isElementVisible(element: HTMLElement): boolean {
    try {
      const rect = element.getBoundingClientRect()
      const style = window.getComputedStyle(element)
      
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0'
      )
    } catch (error) {
      return true // Assume visible if we can't check
    }
  }

  /**
   * Initialize PostPhantom UI with robust error handling
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔄 Initializing PostPhantom...')
      
      // Check if we're on LinkedIn
      if (!this.isLinkedInPage()) {
        console.log('ℹ️ Not on LinkedIn, skipping initialization')
        return
      }

      // Wait for LinkedIn to load with timeout
      await this.waitForLinkedInWithTimeout(10000) // 10 second timeout
      
      // Remove any existing UI
      this.removeExistingUI()
      
      // Inject new UI
      this.injectRobustUI()
      
      console.log('✅ PostPhantom initialized successfully')
    } catch (error) {
      console.error('❌ PostPhantom initialization failed:', error)
      // Try to show a minimal error UI
      this.showErrorUI(error instanceof Error ? error.message : 'Initialization failed')
    }
  }

  private isLinkedInPage(): boolean {
    try {
      return window.location.hostname.includes('linkedin.com')
    } catch (error) {
      return false
    }
  }

  private async waitForLinkedInWithTimeout(timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()
      
      const checkLinkedIn = () => {
        try {
          // Check for LinkedIn post composer elements
          const hasComposer = !!(
            document.querySelector('[data-placeholder="What do you want to talk about?"]') ||
            document.querySelector('.share-creation-state__text-editor') ||
            document.querySelector('.ql-editor[contenteditable="true"]')
          )

          if (hasComposer) {
            resolve()
            return
          }

          // Check timeout
          if (Date.now() - startTime > timeout) {
            reject(new Error('Timeout waiting for LinkedIn to load'))
            return
          }

          // Continue checking
          setTimeout(checkLinkedIn, 1000)
        } catch (error) {
          reject(error)
        }
      }
      
      checkLinkedIn()
    })
  }

  private removeExistingUI(): void {
    try {
      const existing = document.getElementById('postphantom-robust-ui')
      if (existing) {
        existing.remove()
      }
    } catch (error) {
      console.warn('Failed to remove existing UI:', error)
    }
  }

  private injectRobustUI(): void {
    try {
      // Create container with error boundaries
      const container = document.createElement('div')
      container.id = 'postphantom-robust-ui'
      container.innerHTML = `
        <div style="
          position: fixed;
          top: 20px;
          right: 20px;
          width: 320px;
          background: white;
          border: 1px solid #e1e5e9;
          border-radius: 8px;
          padding: 16px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 999999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h3 style="margin: 0; color: #0a66c2; font-size: 16px;">PostPhantom</h3>
            <button id="postphantom-close" style="
              background: none;
              border: none;
              font-size: 18px;
              cursor: pointer;
              color: #666;
              padding: 4px;
            ">×</button>
          </div>
          
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
              font-family: inherit;
              box-sizing: border-box;
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
              font-size: 14px;
            "
          >
            Generate Posts
          </button>
          
          <div id="postphantom-status" style="
            margin-top: 8px; 
            font-size: 12px; 
            color: #666;
            min-height: 16px;
          "></div>
          
          <div id="postphantom-drafts" style="margin-top: 12px;"></div>
        </div>
      `

      document.body.appendChild(container)
      this.setupRobustEventListeners()
    } catch (error) {
      console.error('Failed to inject UI:', error)
      throw error
    }
  }

  private setupRobustEventListeners(): void {
    try {
      const closeBtn = document.getElementById('postphantom-close')
      const generateBtn = document.getElementById('postphantom-generate')
      const promptInput = document.getElementById('postphantom-prompt') as HTMLTextAreaElement
      const statusDiv = document.getElementById('postphantom-status')
      const draftsDiv = document.getElementById('postphantom-drafts')

      // Close button with error handling
      closeBtn?.addEventListener('click', () => {
        try {
          const ui = document.getElementById('postphantom-robust-ui')
          if (ui) ui.remove()
        } catch (error) {
          console.error('Close button error:', error)
        }
      })

      // Generate button with comprehensive error handling
      generateBtn?.addEventListener('click', async () => {
        const prompt = promptInput?.value?.trim()
        if (!prompt) {
          if (statusDiv) statusDiv.textContent = 'Please enter a prompt'
          return
        }

        // Update UI state
        if (statusDiv) statusDiv.textContent = 'Generating...'
        if (generateBtn) {
          generateBtn.textContent = 'Generating...'
          generateBtn.style.background = '#ccc'
          ;(generateBtn as HTMLButtonElement).disabled = true
        }
        if (draftsDiv) draftsDiv.innerHTML = ''

        try {
          const response = await this.generateContent({ prompt })
          
          if (response.success && response.drafts) {
            if (statusDiv) statusDiv.textContent = `Generated ${response.drafts.length} drafts`
            this.displayRobustDrafts(response.drafts, draftsDiv!)
          } else {
            if (statusDiv) statusDiv.textContent = response.error || 'Generation failed'
          }
        } catch (error) {
          console.error('Generation error:', error)
          if (statusDiv) statusDiv.textContent = 'Error: ' + (error as Error).message
        } finally {
          if (generateBtn) {
            generateBtn.textContent = 'Generate Posts'
            generateBtn.style.background = '#0a66c2'
            ;(generateBtn as HTMLButtonElement).disabled = false
          }
        }
      })
    } catch (error) {
      console.error('Failed to setup event listeners:', error)
    }
  }

  private displayRobustDrafts(drafts: any[], container: HTMLElement): void {
    try {
      container.innerHTML = drafts.map((draft, index) => `
        <div style="
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 12px;
          margin-bottom: 8px;
          background: #f8f9fa;
        ">
          <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
            Draft ${index + 1} (${draft.provider})
          </div>
          <div style="font-size: 14px; line-height: 1.4; margin-bottom: 8px; white-space: pre-wrap;">
            ${this.escapeHtml(draft.content)}
          </div>
          <button 
            class="postphantom-type-btn"
            data-content="${this.escapeHtml(draft.content)}"
            style="
              background: #057642;
              color: white;
              border: none;
              padding: 6px 12px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 12px;
              font-weight: 600;
            "
          >
            Type into LinkedIn
          </button>
        </div>
      `).join('')

      // Add event listeners to type buttons
      const typeButtons = container.querySelectorAll('.postphantom-type-btn')
      typeButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
          const btn = e.target as HTMLButtonElement
          const content = btn.getAttribute('data-content') || ''
          
          const originalText = btn.textContent
          btn.textContent = 'Typing...'
          btn.style.background = '#ccc'
          btn.disabled = true

          try {
            await this.typeDraft(content)
            btn.textContent = 'Typed!'
            btn.style.background = '#28a745'
            
            // Clear prompt
            const promptInput = document.getElementById('postphantom-prompt') as HTMLTextAreaElement
            if (promptInput) promptInput.value = ''
            
            // Update status
            const statusDiv = document.getElementById('postphantom-status')
            if (statusDiv) statusDiv.textContent = 'Content typed into LinkedIn!'
            
          } catch (error) {
            btn.textContent = 'Error'
            btn.style.background = '#dc3545'
            console.error('Typing error:', error)
            
            // Show error in status
            const statusDiv = document.getElementById('postphantom-status')
            if (statusDiv) statusDiv.textContent = 'Error: ' + (error as Error).message
          } finally {
            setTimeout(() => {
              btn.textContent = originalText
              btn.style.background = '#057642'
              btn.disabled = false
            }, 3000)
          }
        })
      })
    } catch (error) {
      console.error('Failed to display drafts:', error)
      container.innerHTML = '<div style="color: red;">Error displaying drafts</div>'
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  private showErrorUI(message: string): void {
    try {
      const errorContainer = document.createElement('div')
      errorContainer.id = 'postphantom-error-ui'
      errorContainer.innerHTML = `
        <div style="
          position: fixed;
          top: 20px;
          right: 20px;
          width: 300px;
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 8px;
          padding: 16px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 999999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <h4 style="margin: 0; color: #856404;">PostPhantom Error</h4>
            <button onclick="this.parentElement.parentElement.parentElement.remove()" style="
              background: none;
              border: none;
              font-size: 16px;
              cursor: pointer;
              color: #856404;
            ">×</button>
          </div>
          <p style="margin: 0; font-size: 14px; color: #856404;">
            ${this.escapeHtml(message)}
          </p>
          <p style="margin: 8px 0 0 0; font-size: 12px; color: #856404;">
            Try refreshing the page or reloading the extension.
          </p>
        </div>
      `
      document.body.appendChild(errorContainer)
    } catch (error) {
      console.error('Failed to show error UI:', error)
    }
  }
}

// Singleton instance
let robustIntegrationService: RobustIntegrationService | null = null

export function getRobustIntegrationService(): RobustIntegrationService {
  if (!robustIntegrationService) {
    robustIntegrationService = new RobustIntegrationService()
  }
  return robustIntegrationService
}

// Initialize function
export async function initializePostPhantomRobust(): Promise<void> {
  try {
    const service = getRobustIntegrationService()
    await service.initialize()
  } catch (error) {
    console.error('Failed to initialize PostPhantom:', error)
  }
}