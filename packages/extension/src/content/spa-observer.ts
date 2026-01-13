import { shadowDOMInjector } from './shadow-dom-injector'

export interface SPAObserverOptions {
  /**
   * Selectors for LinkedIn post composition areas to monitor
   */
  postSelectors?: string[]
  
  /**
   * Debounce delay for mutation events (ms)
   */
  debounceDelay?: number
  
  /**
   * Maximum number of re-injection attempts per element
   */
  maxRetries?: number
  
  /**
   * Callback for when content changes are detected
   */
  onContentChange?: (mutations: MutationRecord[]) => void
  
  /**
   * Callback for when UI re-injection occurs
   */
  onUIReinjection?: (element: HTMLElement) => void
}

export interface SPAChangeEvent {
  type: 'navigation' | 'content' | 'dom-structure'
  mutations: MutationRecord[]
  affectedElements: HTMLElement[]
  timestamp: number
}

/**
 * SPAObserver class for detecting LinkedIn SPA changes and triggering UI re-injection
 * 
 * This class monitors DOM changes in LinkedIn's single-page application and ensures
 * that PostPhantom UI elements are properly maintained when content rerenders.
 */
export class SPAObserver {
  private observer: MutationObserver | null = null
  private isObserving = false
  private debounceTimer: number | null = null
  private attachedElements = new Set<HTMLElement>()
  private retryCount = new Map<HTMLElement, number>()
  
  private readonly options: Required<SPAObserverOptions>
  
  constructor(options: SPAObserverOptions = {}) {
    this.options = {
      postSelectors: [
        '[data-test-id="share-box-text-editor"]',
        '.ql-editor[data-placeholder*="Start a post"]',
        '.share-creation-state__text-editor',
        '.mentions-texteditor__content',
        '.msg-form__contenteditable', // LinkedIn messaging
        '.comment-form__text-editor', // Comment forms
        '.feed-shared-update-v2__commentary .ql-editor' // Post editing
      ],
      debounceDelay: 250,
      maxRetries: 3,
      onContentChange: () => {},
      onUIReinjection: () => {},
      ...options
    }
  }

  /**
   * Start observing DOM changes for SPA navigation and content updates
   */
  startObserving(): void {
    if (this.isObserving) {
      console.warn('SPAObserver is already observing')
      return
    }

    if (!this.isSupported()) {
      console.error('MutationObserver not supported - SPAObserver cannot start')
      return
    }

    this.observer = new MutationObserver((mutations) => {
      this.handleMutations(mutations)
    })

    // Observe the entire document for comprehensive SPA change detection
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        'class',
        'data-test-id',
        'data-placeholder',
        'contenteditable',
        'aria-label'
      ],
      characterData: false // Don't observe text changes to avoid noise
    })

    this.isObserving = true
    
    // Initial scan for existing elements
    this.scanForPostElements()
    
    console.log('SPAObserver started - monitoring LinkedIn SPA changes')
  }

  /**
   * Stop observing DOM changes
   */
  stopObserving(): void {
    if (!this.isObserving) {
      return
    }

    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }

    this.isObserving = false
    this.attachedElements.clear()
    this.retryCount.clear()
    
    console.log('SPAObserver stopped')
  }

  /**
   * Handle mutation events with debouncing
   */
  private handleMutations(mutations: MutationRecord[]): void {
    // Clear existing debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    // Debounce mutations to avoid excessive processing
    this.debounceTimer = window.setTimeout(() => {
      this.processMutations(mutations)
    }, this.options.debounceDelay)
  }

  /**
   * Process mutations and determine if UI re-injection is needed
   */
  private processMutations(mutations: MutationRecord[]): void {
    const changeEvent: SPAChangeEvent = {
      type: this.classifyMutations(mutations),
      mutations,
      affectedElements: [],
      timestamp: Date.now()
    }

    let needsReinjection = false
    const affectedElements = new Set<HTMLElement>()

    for (const mutation of mutations) {
      // Check for LinkedIn navigation changes
      if (this.isLinkedInNavigationChange(mutation)) {
        needsReinjection = true
        console.log('LinkedIn navigation detected - triggering UI re-injection')
      }

      // Check for content area changes
      if (this.isLinkedInContentChange(mutation)) {
        needsReinjection = true
        
        // Find affected post elements
        const postElements = this.findPostElementsInMutation(mutation)
        postElements.forEach(element => affectedElements.add(element))
      }

      // Check for removal of attached elements
      if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
        mutation.removedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement
            if (this.attachedElements.has(element)) {
              this.attachedElements.delete(element)
              this.retryCount.delete(element)
              shadowDOMInjector.cleanup(element)
            }
          }
        })
      }
    }

    changeEvent.affectedElements = Array.from(affectedElements)

    // Notify callback
    this.options.onContentChange(mutations)

    // Perform re-injection if needed
    if (needsReinjection) {
      this.reinjectUI(changeEvent.affectedElements)
    }

    // Always scan for new post elements
    this.scanForPostElements()
  }

  /**
   * Classify the type of mutations
   */
  private classifyMutations(mutations: MutationRecord[]): SPAChangeEvent['type'] {
    const hasNavigation = mutations.some(m => this.isLinkedInNavigationChange(m))
    const hasContent = mutations.some(m => this.isLinkedInContentChange(m))
    
    if (hasNavigation) return 'navigation'
    if (hasContent) return 'content'
    return 'dom-structure'
  }

  /**
   * Check if mutation indicates LinkedIn navigation change
   */
  private isLinkedInNavigationChange(mutation: MutationRecord): boolean {
    if (mutation.type !== 'childList') return false

    const target = mutation.target as Element
    
    // Check for main content area changes (navigation)
    const navigationSelectors = [
      '.scaffold-layout__main',
      '.application-outlet',
      '.feed-container-theme',
      '.core-rail',
      '[data-test-id="main-feed-container"]'
    ]

    return navigationSelectors.some(selector => {
      return target.matches?.(selector) || target.querySelector?.(selector)
    })
  }

  /**
   * Check if mutation indicates LinkedIn content change
   */
  private isLinkedInContentChange(mutation: MutationRecord): boolean {
    const target = mutation.target as Element

    // Check for post composition area changes
    const isPostArea = this.options.postSelectors.some(selector => {
      return target.matches?.(selector) || 
             target.closest?.(selector) ||
             target.querySelector?.(selector)
    })

    if (isPostArea) return true

    // Check for feed updates
    const feedSelectors = [
      '.feed-shared-update-v2',
      '.share-creation-state',
      '.msg-form',
      '.comment-form'
    ]

    return feedSelectors.some(selector => {
      return target.matches?.(selector) || target.querySelector?.(selector)
    })
  }

  /**
   * Find post elements affected by a mutation
   */
  private findPostElementsInMutation(mutation: MutationRecord): HTMLElement[] {
    const elements: HTMLElement[] = []
    const target = mutation.target as Element

    // Check if target itself is a post element
    for (const selector of this.options.postSelectors) {
      if (target.matches?.(selector)) {
        elements.push(target as HTMLElement)
      }
    }

    // Check added nodes for post elements
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element
          for (const selector of this.options.postSelectors) {
            // Check if the added element is a post element
            if (element.matches?.(selector)) {
              elements.push(element as HTMLElement)
            }
            // Check if the added element contains post elements
            const childElements = element.querySelectorAll(selector)
            childElements.forEach(child => elements.push(child as HTMLElement))
          }
        }
      })
    }

    return elements
  }

  /**
   * Scan for post elements and attach UI if needed
   */
  private scanForPostElements(): void {
    try {
      this.options.postSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector)
        elements.forEach(element => {
          const htmlElement = element as HTMLElement
          if (!this.attachedElements.has(htmlElement)) {
            this.attachToPostElement(htmlElement)
          }
        })
      })
    } catch (error) {
      console.warn('SPAObserver: Error scanning for post elements:', error)
    }
  }

  /**
   * Attach PostPhantom UI to a post element
   */
  private attachToPostElement(element: HTMLElement): void {
    if (this.attachedElements.has(element)) {
      return
    }

    // Mark as attached to prevent duplicate processing
    this.attachedElements.add(element)
    element.setAttribute('data-postphantom-attached', 'true')

    console.log('SPAObserver: Attaching to post element:', element)

    // Set up event listeners for UI interaction
    this.setupElementEventListeners(element)
  }

  /**
   * Set up event listeners for a post element
   */
  private setupElementEventListeners(element: HTMLElement): void {
    const focusHandler = async () => {
      console.log('SPAObserver: Post element focused - triggering UI injection')
      await this.injectUIForElement(element)
    }

    const blurHandler = () => {
      // Small delay to allow for UI interaction
      setTimeout(() => {
        shadowDOMInjector.cleanup(element)
      }, 200)
    }

    element.addEventListener('focus', focusHandler)
    element.addEventListener('blur', blurHandler)

    // Store handlers for cleanup
    element.setAttribute('data-postphantom-handlers', 'attached')
  }

  /**
   * Inject UI for a specific element with retry logic
   */
  private async injectUIForElement(element: HTMLElement): Promise<void> {
    const currentRetries = this.retryCount.get(element) || 0
    
    if (currentRetries > this.options.maxRetries) {
      console.warn('SPAObserver: Max retries reached for element:', element)
      return
    }

    try {
      await shadowDOMInjector.createUI({
        targetElement: element,
        position: 'after',
        className: 'postphantom-shadow-host'
      })
      
      // Reset retry count on success
      this.retryCount.delete(element)
      this.options.onUIReinjection(element)
      
    } catch (error) {
      console.warn('SPAObserver: UI injection failed, attempting recovery:', error)
      
      // Increment retry count
      this.retryCount.set(element, currentRetries + 1)
      
      // Attempt recovery
      const recoveredInstance = await shadowDOMInjector.recoverFromInjectionFailure(element)
      if (recoveredInstance) {
        this.retryCount.delete(element)
        this.options.onUIReinjection(element)
      }
    }
  }

  /**
   * Re-inject UI for affected elements
   */
  private reinjectUI(affectedElements: HTMLElement[]): void {
    console.log('SPAObserver: Re-injecting UI for', affectedElements.length, 'elements')
    
    affectedElements.forEach(element => {
      // Clean up existing UI first
      shadowDOMInjector.cleanup(element)
      
      // Re-inject if element is still in DOM and attached
      if (document.contains(element) && this.attachedElements.has(element)) {
        this.injectUIForElement(element)
      }
    })
  }

  /**
   * Check if MutationObserver is supported
   */
  private isSupported(): boolean {
    return typeof MutationObserver !== 'undefined'
  }

  /**
   * Get current observation status
   */
  isCurrentlyObserving(): boolean {
    return this.isObserving
  }

  /**
   * Get attached elements
   */
  getAttachedElements(): Set<HTMLElement> {
    return new Set(this.attachedElements)
  }

  /**
   * Force re-scan for post elements
   */
  forceScan(): void {
    console.log('SPAObserver: Force scanning for post elements')
    try {
      this.scanForPostElements()
    } catch (error) {
      console.warn('SPAObserver: Error during force scan:', error)
    }
  }

  /**
   * Clean up specific element
   */
  cleanupElement(element: HTMLElement): void {
    this.attachedElements.delete(element)
    this.retryCount.delete(element)
    shadowDOMInjector.cleanup(element)
    element.removeAttribute('data-postphantom-attached')
    element.removeAttribute('data-postphantom-handlers')
  }

  /**
   * Clean up all attached elements
   */
  cleanupAll(): void {
    this.attachedElements.forEach(element => {
      this.cleanupElement(element)
    })
    this.attachedElements.clear()
    this.retryCount.clear()
  }
}

// Export singleton instance
export const spaObserver = new SPAObserver()