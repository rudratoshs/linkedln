import React from 'react'
import { createRoot, Root } from 'react-dom/client'
import { PostPhantomApp } from '../components/PostPhantomAppSimple'

export interface ShadowDOMInjectionOptions {
  targetElement: HTMLElement
  position?: 'after' | 'before' | 'inside'
  className?: string
  zIndex?: number
}

export interface ShadowDOMInstance {
  shadowRoot: ShadowRoot
  container: HTMLElement
  reactRoot: Root
  cleanup: () => void
}

export class ShadowDOMInjector {
  private instances = new Map<HTMLElement, ShadowDOMInstance>()
  private tailwindCSS: string | null = null
  private customStyles: string | null = null

  constructor() {
    this.loadStyles()
  }

  /**
   * Load Tailwind CSS and custom styles for Shadow DOM isolation
   */
  private async loadStyles(): Promise<void> {
    try {
      // In a real implementation, these would be bundled or fetched
      // For now, we'll use inline styles that match Tailwind classes
      this.tailwindCSS = await this.getTailwindCSS()
      this.customStyles = this.getCustomStyles()
    } catch (error) {
      console.warn('Failed to load styles for Shadow DOM:', error)
      // Fallback to minimal styles
      this.tailwindCSS = this.getFallbackStyles()
      this.customStyles = this.getCustomStyles()
    }
  }

  /**
   * Create and inject UI using Shadow DOM
   */
  async createUI(options: ShadowDOMInjectionOptions): Promise<ShadowDOMInstance> {
    const { targetElement, position = 'after', className = 'postphantom-shadow-host', zIndex = 10000 } = options

    try {
      // Clean up any existing instance for this target
      if (this.instances.has(targetElement)) {
        this.cleanup(targetElement)
      }

      // Create shadow host element
      const shadowHost = document.createElement('div')
      shadowHost.className = className
      shadowHost.style.cssText = `
        position: absolute;
        z-index: ${zIndex};
        pointer-events: none;
      `

      // Position the shadow host relative to target element
      this.positionShadowHost(shadowHost, targetElement, position)

      // Create shadow root with closed mode for security
      const shadowRoot = shadowHost.attachShadow({ mode: 'closed' })

      // Create container for React app
      const container = document.createElement('div')
      container.style.cssText = `
        pointer-events: auto;
        position: relative;
      `
      shadowRoot.appendChild(container)

      // Apply styles to shadow root
      await this.applyStyles(shadowRoot)

      // Create React root and render UI
      const reactRoot = createRoot(container)
      reactRoot.render(React.createElement(PostPhantomApp))

      // Insert shadow host into DOM
      this.insertShadowHost(shadowHost)

      // Create instance object
      const instance: ShadowDOMInstance = {
        shadowRoot,
        container,
        reactRoot,
        cleanup: () => {
          reactRoot.unmount()
          shadowHost.remove()
          this.instances.delete(targetElement)
        }
      }

      // Store instance for cleanup
      this.instances.set(targetElement, instance)

      console.log('Shadow DOM UI injected successfully for element:', targetElement)
      return instance

    } catch (error) {
      console.error('Shadow DOM injection failed:', error)
      throw new ShadowDOMInjectionError('Failed to create Shadow DOM UI', error as Error, targetElement)
    }
  }

  /**
   * Position shadow host relative to target element
   */
  private positionShadowHost(shadowHost: HTMLElement, targetElement: HTMLElement, position: string): void {
    const rect = targetElement.getBoundingClientRect()
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft

    switch (position) {
      case 'after':
        shadowHost.style.top = `${rect.bottom + scrollTop + 8}px`
        shadowHost.style.left = `${rect.left + scrollLeft}px`
        break
      case 'before':
        shadowHost.style.top = `${rect.top + scrollTop - 8}px`
        shadowHost.style.left = `${rect.left + scrollLeft}px`
        shadowHost.style.transform = 'translateY(-100%)'
        break
      case 'inside':
        shadowHost.style.top = `${rect.top + scrollTop + 8}px`
        shadowHost.style.left = `${rect.right + scrollLeft - 320}px` // Align to right edge
        break
      default:
        throw new Error(`Invalid position: ${position}`)
    }
  }

  /**
   * Insert shadow host into DOM at appropriate position
   */
  private insertShadowHost(shadowHost: HTMLElement): void {
    // Always append to body for absolute positioning
    document.body.appendChild(shadowHost)
  }

  /**
   * Apply styles to shadow root for isolation
   */
  private async applyStyles(shadowRoot: ShadowRoot): Promise<void> {
    if (!this.tailwindCSS || !this.customStyles) {
      await this.loadStyles()
    }

    // Create style element
    const styleElement = document.createElement('style')
    styleElement.textContent = `
      ${this.tailwindCSS || ''}
      ${this.customStyles || ''}
    `

    shadowRoot.appendChild(styleElement)
  }

  /**
   * Get Tailwind CSS (in production, this would be bundled)
   */
  private async getTailwindCSS(): Promise<string> {
    // In a real implementation, this would load the actual Tailwind CSS
    // For now, return essential utility classes used by PostPhantom components
    return `
      /* Reset and base styles */
      * { box-sizing: border-box; }
      
      /* Layout utilities */
      .flex { display: flex; }
      .items-center { align-items: center; }
      .items-start { align-items: flex-start; }
      .justify-between { justify-content: space-between; }
      .max-w-md { max-width: 28rem; }
      .max-w-sm { max-width: 24rem; }
      .w-full { width: 100%; }
      .space-y-2 > * + * { margin-top: 0.5rem; }
      .space-y-3 > * + * { margin-top: 0.75rem; }
      .max-h-60 { max-height: 15rem; }
      .overflow-y-auto { overflow-y: auto; }
      
      /* Spacing utilities */
      .p-3 { padding: 0.75rem; }
      .p-4 { padding: 1rem; }
      .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
      .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
      .px-4 { padding-left: 1rem; padding-right: 1rem; }
      .mb-3 { margin-bottom: 0.75rem; }
      .mt-1 { margin-top: 0.25rem; }
      .ml-2 { margin-left: 0.5rem; }
      
      /* Typography utilities */
      .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
      .text-xs { font-size: 0.75rem; line-height: 1rem; }
      .font-semibold { font-weight: 600; }
      .font-medium { font-weight: 500; }
      .capitalize { text-transform: capitalize; }
      .line-clamp-3 {
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      
      /* Color utilities */
      .bg-white { background-color: rgb(255 255 255); }
      .bg-blue-50 { background-color: rgb(239 246 255); }
      .bg-blue-600 { background-color: rgb(37 99 235); }
      .bg-red-50 { background-color: rgb(254 242 242); }
      .bg-gray-900 { background-color: rgb(17 24 39); }
      .text-white { color: rgb(255 255 255); }
      .text-gray-900 { color: rgb(17 24 39); }
      .text-gray-700 { color: rgb(55 65 81); }
      .text-gray-600 { color: rgb(75 85 99); }
      .text-gray-500 { color: rgb(107 114 128); }
      .text-blue-500 { color: rgb(59 130 246); }
      .text-red-700 { color: rgb(185 28 28); }
      .text-red-400 { color: rgb(248 113 113); }
      .text-red-600 { color: rgb(220 38 38); }
      .border-gray-200 { border-color: rgb(229 231 235); }
      .border-gray-300 { border-color: rgb(209 213 219); }
      .border-blue-500 { border-color: rgb(59 130 246); }
      .border-red-200 { border-color: rgb(254 202 202); }
      .fill-white { fill: rgb(255 255 255); }
      .fill-gray-900 { fill: rgb(17 24 39); }
      
      /* Border utilities */
      .border { border-width: 1px; }
      .rounded { border-radius: 0.25rem; }
      .rounded-lg { border-radius: 0.5rem; }
      
      /* Shadow utilities */
      .shadow-lg { 
        box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
      }
      
      /* Interactive utilities */
      .cursor-pointer { cursor: pointer; }
      .transition-colors { transition-property: color, background-color, border-color; transition-duration: 150ms; }
      .hover\\:border-gray-300:hover { border-color: rgb(209 213 219); }
      .hover\\:bg-blue-700:hover { background-color: rgb(29 78 216); }
      .hover\\:text-red-600:hover { color: rgb(220 38 38); }
      
      /* Z-index utilities */
      .z-50 { z-index: 50; }
    `
  }

  /**
   * Get custom styles for PostPhantom components
   */
  private getCustomStyles(): string {
    return `
      /* PostPhantom specific styles */
      .postphantom-ui {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        line-height: 1.5;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      
      /* Ensure tooltips and popovers render within shadow DOM */
      .postphantom-tooltip,
      .postphantom-popover {
        position: relative;
        z-index: 1000;
      }
      
      /* Animation utilities */
      .postphantom-fade-in {
        animation: postphantom-fadeIn 0.2s ease-out;
      }
      
      @keyframes postphantom-fadeIn {
        from { opacity: 0; transform: translateY(-4px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      /* Ensure proper isolation from LinkedIn styles */
      .postphantom-ui * {
        all: unset;
        display: revert;
        box-sizing: border-box;
      }
    `
  }

  /**
   * Get fallback styles if main styles fail to load
   */
  private getFallbackStyles(): string {
    return `
      .postphantom-ui {
        background: white;
        border: 1px solid #ccc;
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        font-family: system-ui, sans-serif;
        font-size: 14px;
        max-width: 320px;
      }
    `
  }

  /**
   * Clean up Shadow DOM instance for a specific target element
   */
  cleanup(targetElement: HTMLElement): void {
    const instance = this.instances.get(targetElement)
    if (instance) {
      try {
        instance.cleanup()
        console.log('Shadow DOM instance cleaned up for element:', targetElement)
      } catch (error) {
        console.warn('Error during Shadow DOM cleanup:', error)
      }
    }
  }

  /**
   * Clean up all Shadow DOM instances
   */
  cleanupAll(): void {
    for (const [targetElement] of this.instances) {
      this.cleanup(targetElement)
    }
  }

  /**
   * Get Shadow DOM instance for a target element
   */
  getInstance(targetElement: HTMLElement): ShadowDOMInstance | undefined {
    return this.instances.get(targetElement)
  }

  /**
   * Check if Shadow DOM is supported
   */
  static isSupported(): boolean {
    return 'attachShadow' in Element.prototype
  }

  /**
   * Recover from injection failures with fallback strategies
   */
  async recoverFromInjectionFailure(targetElement: HTMLElement): Promise<ShadowDOMInstance | null> {
    console.warn('Attempting Shadow DOM injection recovery for element:', targetElement)

    const strategies = [
      // Strategy 1: Retry with different position
      () => this.createUI({ targetElement, position: 'before' }),
      
      // Strategy 2: Retry with reduced z-index
      () => this.createUI({ targetElement, position: 'after', zIndex: 1000 }),
      
      // Strategy 3: Retry with minimal features
      () => this.createUIWithReducedFeatures(targetElement),
    ]

    for (let i = 0; i < strategies.length; i++) {
      try {
        console.log(`Trying recovery strategy ${i + 1}...`)
        const instance = await strategies[i]()
        console.log(`Recovery strategy ${i + 1} succeeded`)
        return instance
      } catch (error) {
        console.warn(`Recovery strategy ${i + 1} failed:`, error)
      }
    }

    // All strategies failed
    console.error('All Shadow DOM injection recovery strategies failed')
    this.notifyUserOfUIFailure()
    return null
  }

  /**
   * Create UI with reduced features as fallback
   */
  private async createUIWithReducedFeatures(targetElement: HTMLElement): Promise<ShadowDOMInstance> {
    // Create a minimal shadow DOM with basic functionality
    const shadowHost = document.createElement('div')
    shadowHost.className = 'postphantom-shadow-host-minimal'
    shadowHost.style.cssText = `
      position: absolute;
      z-index: 999;
      pointer-events: none;
    `

    this.positionShadowHost(shadowHost, targetElement, 'after')

    const shadowRoot = shadowHost.attachShadow({ mode: 'closed' })
    const container = document.createElement('div')
    container.style.cssText = `
      pointer-events: auto;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 8px;
      font-family: system-ui, sans-serif;
      font-size: 12px;
    `
    
    container.innerHTML = `
      <div>PostPhantom (Minimal Mode)</div>
      <div style="font-size: 10px; color: #666; margin-top: 4px;">
        UI features limited due to injection issues
      </div>
    `

    shadowRoot.appendChild(container)
    document.body.appendChild(shadowHost)

    // Create minimal React root
    const reactRoot = createRoot(container)

    const instance: ShadowDOMInstance = {
      shadowRoot,
      container,
      reactRoot,
      cleanup: () => {
        reactRoot.unmount()
        shadowHost.remove()
        this.instances.delete(targetElement)
      }
    }

    this.instances.set(targetElement, instance)
    return instance
  }

  /**
   * Notify user of UI failure
   */
  private notifyUserOfUIFailure(): void {
    // Create a simple notification that doesn't rely on Shadow DOM
    const notification = document.createElement('div')
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #f44336;
      color: white;
      padding: 12px 16px;
      border-radius: 4px;
      font-family: system-ui, sans-serif;
      font-size: 14px;
      z-index: 999999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `
    notification.textContent = 'PostPhantom UI injection failed - extension may not work properly'
    
    document.body.appendChild(notification)
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification)
      }
    }, 5000)
  }
}

/**
 * Custom error class for Shadow DOM injection failures
 */
export class ShadowDOMInjectionError extends Error {
  constructor(
    message: string,
    public readonly cause: Error,
    public readonly targetElement: HTMLElement
  ) {
    super(message)
    this.name = 'ShadowDOMInjectionError'
  }
}

// Export singleton instance
export const shadowDOMInjector = new ShadowDOMInjector()