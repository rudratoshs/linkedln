import { defineContentScript } from 'wxt/sandbox'

// Standalone PostPhantom implementation - no Chrome APIs
const SUPABASE_URL = 'https://livddfovoslptifnbfek.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpdmRkZm92b3NscHRpZm5iZmVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMjY2NDMsImV4cCI6MjA4MzgwMjY0M30.MgmaDCjksLVCDRbKoj2Id-mrBo0aI6_UN-cNlTCivO8'

class StandalonePostPhantom {
  async generateContent(prompt: string) {
    // Simple rate limiting using localStorage only
    const now = Date.now()
    const lastRequestTime = parseInt(localStorage.getItem('postphantom_last_request') || '0')
    
    if (now - lastRequestTime < 120000) { // 2 minutes
      return {
        success: false,
        error: 'Please wait 2 minutes between requests'
      }
    }

    localStorage.setItem('postphantom_last_request', now.toString())

    // Try Supabase API, fallback to mock data
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          prompt,
          preferences: {},
          context: ''
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.drafts && data.drafts.length > 0) {
          return { success: true, drafts: data.drafts }
        }
      }
    } catch (error) {
      console.warn('API call failed, using mock data:', error)
    }

    // Mock data fallback
    return {
      success: true,
      drafts: [
        {
          id: '1',
          content: `🚀 ${prompt}\n\nExcited to share some thoughts on this topic. What's your experience been like?\n\n#Innovation #Growth`,
          provider: 'mock'
        },
        {
          id: '2',
          content: `Reflecting on ${prompt.toLowerCase()}...\n\nThis is such an important area. I'd love to hear different perspectives from the community.\n\nWhat are your thoughts?`,
          provider: 'mock'
        },
        {
          id: '3',
          content: `${prompt}\n\nJust had some insights on this that I wanted to share. Looking forward to the discussion!\n\nDrop your thoughts in the comments 👇`,
          provider: 'mock'
        }
      ]
    }
  }

  async typeDraft(content: string) {
    const selectors = [
      '[data-placeholder="What do you want to talk about?"]',
      '.ql-editor[data-placeholder="What do you want to talk about?"]',
      '[aria-label="Text editor for creating content"]',
      '.share-creation-state__text-editor .ql-editor',
      '.ql-editor[contenteditable="true"]',
      'div[role="textbox"]'
    ]

    let textArea: HTMLElement | null = null
    
    for (const selector of selectors) {
      textArea = document.querySelector(selector)
      if (textArea) break
    }

    if (!textArea) {
      throw new Error('LinkedIn text area not found')
    }

    textArea.focus()
    
    if (textArea.contentEditable === 'true') {
      textArea.innerHTML = ''
      textArea.textContent = content
    } else {
      ;(textArea as HTMLInputElement).value = content
    }

    // Trigger events
    textArea.dispatchEvent(new Event('input', { bubbles: true }))
    textArea.dispatchEvent(new Event('change', { bubbles: true }))
  }

  injectUI() {
    // Remove existing UI
    const existing = document.getElementById('postphantom-standalone')
    if (existing) existing.remove()

    const container = document.createElement('div')
    container.id = 'postphantom-standalone'
    container.innerHTML = `
      <div style="
        position: fixed;
        top: 80px;
        right: 20px;
        width: 350px;
        background: white;
        border: 3px solid #0a66c2;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        z-index: 9999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="margin: 0; color: #0a66c2; font-size: 18px; font-weight: bold;">🚀 PostPhantom AI</h3>
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
    console.log('🎯 PostPhantom UI injected! Look for the panel in the top-right corner.')
    this.setupEventListeners()
  }

  setupEventListeners() {
    const closeBtn = document.getElementById('postphantom-close')
    const generateBtn = document.getElementById('postphantom-generate')
    const promptInput = document.getElementById('postphantom-prompt') as HTMLTextAreaElement
    const statusDiv = document.getElementById('postphantom-status')
    const draftsDiv = document.getElementById('postphantom-drafts')

    closeBtn?.addEventListener('click', () => {
      const ui = document.getElementById('postphantom-standalone')
      if (ui) ui.remove()
    })

    generateBtn?.addEventListener('click', async () => {
      const prompt = promptInput?.value?.trim()
      if (!prompt) return

      if (statusDiv) statusDiv.textContent = 'Generating...'
      if (generateBtn) {
        generateBtn.textContent = 'Generating...'
        generateBtn.style.background = '#ccc'
        ;(generateBtn as HTMLButtonElement).disabled = true
      }
      if (draftsDiv) draftsDiv.innerHTML = ''

      try {
        const response = await this.generateContent(prompt)
        
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

  displayDrafts(drafts: any[], container: HTMLElement) {
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
          
          const promptInput = document.getElementById('postphantom-prompt') as HTMLTextAreaElement
          if (promptInput) promptInput.value = ''
          
          const statusDiv = document.getElementById('postphantom-status')
          if (statusDiv) statusDiv.textContent = 'Content typed into LinkedIn!'
          
        } catch (error) {
          btn.textContent = 'Error'
          btn.style.background = '#dc3545'
          console.error('Typing error:', error)
        } finally {
          setTimeout(() => {
            btn.textContent = originalText
            btn.style.background = '#057642'
            btn.disabled = false
          }, 3000)
        }
      })
    })
  }

  escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
}

export default defineContentScript({
  matches: ['https://linkedin.com/*', 'https://*.linkedin.com/*'],
  main() {
    console.log('🔗 PostPhantom standalone content script loaded')
    
    const postPhantom = new StandalonePostPhantom()
    
    const initialize = () => {
      try {
        console.log('🔄 PostPhantom initializing...')
        
        // Check if we're on LinkedIn
        if (!window.location.hostname.includes('linkedin.com')) {
          console.log('ℹ️ Not on LinkedIn, skipping initialization')
          return
        }

        console.log('✅ On LinkedIn, checking for post composer...')

        // Wait for LinkedIn to load
        const checkLinkedIn = () => {
          const selectors = [
            '[data-placeholder="What do you want to talk about?"]',
            '.share-creation-state__text-editor',
            '.ql-editor[contenteditable="true"]',
            '[aria-label="Text editor for creating content"]',
            '.share-box__input',
            '.share-creation-state'
          ]

          let hasComposer = false
          let foundSelector = ''

          for (const selector of selectors) {
            const element = document.querySelector(selector)
            if (element) {
              hasComposer = true
              foundSelector = selector
              break
            }
          }

          console.log(`🔍 Checking for LinkedIn composer... Found: ${hasComposer} (${foundSelector})`)

          if (hasComposer) {
            console.log('✅ LinkedIn composer found, injecting PostPhantom UI')
            postPhantom.injectUI()
            console.log('✅ PostPhantom initialized successfully')
          } else {
            console.log('⏳ LinkedIn composer not found, retrying in 2 seconds...')
            setTimeout(checkLinkedIn, 2000)
          }
        }

        checkLinkedIn()
      } catch (error) {
        console.error('❌ PostPhantom initialization failed:', error)
      }
    }

    // Initialize immediately and on DOM ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initialize)
    } else {
      setTimeout(initialize, 1000)
    }
  },
})