import { useAppStore } from '../store/app-store'
import { shadowDOMInjector, ShadowDOMInjector } from './shadow-dom-injector'
import { spaObserver } from './spa-observer'

export function initializePostPhantom() {
  console.log('Initializing PostPhantom...')
  
  // Check Shadow DOM support
  if (!ShadowDOMInjector.isSupported()) {
    console.error('Shadow DOM not supported - PostPhantom cannot initialize')
    return
  }
  
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupPostPhantom)
  } else {
    setupPostPhantom()
  }
}

function setupPostPhantom() {
  console.log('Setting up PostPhantom UI and event listeners')
  
  // Set up SPA observer for LinkedIn content changes
  setupSPAObserver()
  
  // Set up LinkedIn post detection (legacy fallback)
  setupLinkedInPostDetection()
  
  console.log('PostPhantom setup complete - SPA observer and Shadow DOM injection ready')
}

function setupSPAObserver() {
  // Configure SPA observer with callbacks
  spaObserver.startObserving()
  
  // Store reference for cleanup
  ;(window as any).__postphantom_spa_observer = spaObserver
}

function setupLinkedInPostDetection() {
  // Look for LinkedIn post composition areas
  const postSelectors = [
    '[data-test-id="share-box-text-editor"]',
    '.ql-editor[data-placeholder*="Start a post"]',
    '.share-creation-state__text-editor',
    '.mentions-texteditor__content'
  ]
  
  function detectPostElements() {
    postSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector)
      elements.forEach(element => {
        if (!element.hasAttribute('data-postphantom-attached')) {
          attachToPostElement(element as HTMLElement)
          element.setAttribute('data-postphantom-attached', 'true')
        }
      })
    })
  }
  
  function attachToPostElement(element: HTMLElement) {
    console.log('Attaching PostPhantom to post element:', element)
    
    // Set up focus event to show UI
    element.addEventListener('focus', async () => {
      console.log('Post element focused - showing PostPhantom UI')
      const store = useAppStore.getState()
      store.setCurrentPostElement(element)
      store.setState('scanning')
      store.showUI()
      
      // Inject Shadow DOM UI
      try {
        await shadowDOMInjector.createUI({
          targetElement: element,
          position: 'after',
          className: 'postphantom-shadow-host'
        })
      } catch (error) {
        console.error('Failed to inject Shadow DOM UI:', error)
        
        // Attempt recovery
        const recoveredInstance = await shadowDOMInjector.recoverFromInjectionFailure(element)
        if (!recoveredInstance) {
          store.setError('UI injection failed - extension may not work properly')
        }
      }
    })
    
    // Set up blur event to potentially hide UI
    element.addEventListener('blur', () => {
      // Small delay to allow for UI interaction
      setTimeout(() => {
        const store = useAppStore.getState()
        if (store.currentState === 'scanning' || store.currentState === 'idle') {
          store.hideUI()
          store.setState('idle')
          
          // Clean up Shadow DOM UI
          shadowDOMInjector.cleanup(element)
        }
      }, 200)
    })
  }
  
  // Initial detection
  detectPostElements()
  
  // Set up mutation observer for SPA navigation (enhanced by SPAObserver)
  const observer = new MutationObserver(() => {
    detectPostElements()
  })
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  })
  
  console.log('LinkedIn post detection setup complete')
}