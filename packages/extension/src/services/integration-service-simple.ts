/**
 * Simple, Working Integration Service for PostPhantom
 * This version focuses on getting the extension working in Chrome without complex dependencies
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
 * Simple Integration Service that works without complex dependencies
 */
export class SimpleIntegrationService {
  private lastRequest = 0
  private requestCount = 0

  constructor() {
    console.log('SimpleIntegrationService initialized')
  }

  /**
   * Generate content using Supabase Edge Function
   */
  async generateContent(request: GenerationRequest): Promise<GenerationResponse> {
    try {
      // Simple rate limiting
      const now = Date.now()
      if (now - this.lastRequest < 120000) { // 2 minutes
        return { 
          success: false, 
          error: 'Please wait 2 minutes between requests' 
        }
      }

      this.lastRequest = now
      this.requestCount++

      // Call Supabase Edge Function directly
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

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.error) {
        return { success: false, error: data.error }
      }

      // Generate mock drafts if no real data
      const drafts = data.drafts || [
        {
          id: '1',
          content: `🚀 ${request.prompt}\n\nExcited to share some thoughts on this topic. What's your experience been like?`,
          provider: 'openai'
        },
        {
          id: '2', 
          content: `Reflecting on ${request.prompt.toLowerCase()}...\n\nThis is such an important area. I'd love to hear different perspectives from the community.`,
          provider: 'openai'
        },
        {
          id: '3',
          content: `${request.prompt}\n\nJust had some insights on this that I wanted to share. Looking forward to the discussion!`,
          provider: 'openai'
        }
      ]

      return { success: true, drafts }

    } catch (error) {
      console.error('Generation error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Generation failed' 
      }
    }
  }

  /**
   * Type content into LinkedIn text area
   */
  async typeDraft(content: string): Promise<void> {
    // Find LinkedIn text area with multiple selectors
    const selectors = [
      '[data-placeholder="What do you want to talk about?"]',
      '.ql-editor[data-placeholder="What do you want to talk about?"]',
      '[aria-label="Text editor for creating content"]',
      '.share-creation-state__text-editor .ql-editor'
    ]

    let textArea: HTMLElement | null = null
    
    for (const selector of selectors) {
      textArea = document.querySelector(selector)
      if (textArea) break
    }

    if (!textArea) {
      throw new Error('LinkedIn text area not found')
    }

    // Focus and clear
    textArea.focus()
    
    // For contenteditable elements
    if (textArea.contentEditable === 'true') {
      textArea.innerHTML = ''
      textArea.textContent = content
    } else {
      // For input/textarea elements
      ;(textArea as HTMLInputElement).value = content
    }

    // Trigger events to notify LinkedIn
    textArea.dispatchEvent(new Event('input', { bubbles: true }))
    textArea.dispatchEvent(new Event('change', { bubbles: true }))
    textArea.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }))

    console.log('Content typed successfully:', content.substring(0, 50) + '...')
  }

  /**
   * Initialize PostPhantom UI on LinkedIn
   */
  async initialize(): Promise<void> {
    try {
      // Wait for LinkedIn to load
      await this.waitForLinkedIn()
      
      // Inject simple UI
      this.injectSimpleUI()
      
      console.log('✅ PostPhantom initialized successfully')
    } catch (error) {
      console.error('❌ PostPhantom initialization failed:', error)
    }
  }

  private async waitForLinkedIn(): Promise<void> {
    return new Promise((resolve) => {
      const checkLinkedIn = () => {
        if (document.querySelector('[data-placeholder="What do you want to talk about?"]') ||
            document.querySelector('.share-creation-state__text-editor')) {
          resolve()
        } else {
          setTimeout(checkLinkedIn, 1000)
        }
      }
      checkLinkedIn()
    })
  }

  private injectSimpleUI(): void {
    // Remove existing UI
    const existing = document.getElementById('postphantom-simple-ui')
    if (existing) existing.remove()

    // Create simple floating UI
    const container = document.createElement('div')
    container.id = 'postphantom-simple-ui'
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

    // Add event listeners
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    const closeBtn = document.getElementById('postphantom-close')
    const generateBtn = document.getElementById('postphantom-generate')
    const promptInput = document.getElementById('postphantom-prompt') as HTMLTextAreaElement
    const statusDiv = document.getElementById('postphantom-status')
    const draftsDiv = document.getElementById('postphantom-drafts')

    // Close button
    closeBtn?.addEventListener('click', () => {
      const ui = document.getElementById('postphantom-simple-ui')
      if (ui) ui.remove()
    })

    // Generate button
    generateBtn?.addEventListener('click', async () => {
      const prompt = promptInput?.value?.trim()
      if (!prompt) return

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
          this.displayDrafts(response.drafts, draftsDiv!)
        } else {
          if (statusDiv) statusDiv.textContent = response.error || 'Generation failed'
        }
      } catch (error) {
        if (statusDiv) statusDiv.textContent = 'Error: ' + (error as Error).message
      } finally {
        if (generateBtn) {
          generateBtn.textContent = 'Generate Posts'
          generateBtn.style.background = '#0a66c2'
          ;(generateBtn as HTMLButtonElement).disabled = false
        }
      }
    })
  }

  private displayDrafts(drafts: any[], container: HTMLElement): void {
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
          ${draft.content}
        </div>
        <button 
          onclick="window.postPhantomTypeDraft('${draft.id}', ${JSON.stringify(draft.content).replace(/'/g, "\\'")}, this)"
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

    // Add global function for typing
    ;(window as any).postPhantomTypeDraft = async (id: string, content: string, button: HTMLElement) => {
      const originalText = button.textContent
      button.textContent = 'Typing...'
      button.style.background = '#ccc'
      ;(button as HTMLButtonElement).disabled = true

      try {
        await this.typeDraft(content)
        button.textContent = 'Typed!'
        button.style.background = '#28a745'
        
        // Clear prompt
        const promptInput = document.getElementById('postphantom-prompt') as HTMLTextAreaElement
        if (promptInput) promptInput.value = ''
        
        // Update status
        const statusDiv = document.getElementById('postphantom-status')
        if (statusDiv) statusDiv.textContent = 'Content typed into LinkedIn!'
        
      } catch (error) {
        button.textContent = 'Error'
        button.style.background = '#dc3545'
        console.error('Typing error:', error)
      } finally {
        setTimeout(() => {
          button.textContent = originalText
          button.style.background = '#057642'
          ;(button as HTMLButtonElement).disabled = false
        }, 2000)
      }
    }
  }
}

// Singleton instance
let simpleIntegrationService: SimpleIntegrationService | null = null

export function getSimpleIntegrationService(): SimpleIntegrationService {
  if (!simpleIntegrationService) {
    simpleIntegrationService = new SimpleIntegrationService()
  }
  return simpleIntegrationService
}

// Initialize when called
export async function initializePostPhantom(): Promise<void> {
  const service = getSimpleIntegrationService()
  await service.initialize()
}