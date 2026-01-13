import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import fc from 'fast-check'
import { SPAObserver, SPAObserverOptions } from '../spa-observer'
import { shadowDOMInjector } from '../shadow-dom-injector'

// Mock the shadow DOM injector
vi.mock('../shadow-dom-injector', () => ({
  shadowDOMInjector: {
    createUI: vi.fn().mockResolvedValue({
      shadowRoot: {} as ShadowRoot,
      container: document.createElement('div'),
      reactRoot: { unmount: vi.fn() },
      cleanup: vi.fn()
    }),
    cleanup: vi.fn(),
    recoverFromInjectionFailure: vi.fn().mockResolvedValue({
      shadowRoot: {} as ShadowRoot,
      container: document.createElement('div'),
      reactRoot: { unmount: vi.fn() },
      cleanup: vi.fn()
    })
  }
}))

describe('SPAObserver', () => {
  let observer: SPAObserver
  let mockOnContentChange: ReturnType<typeof vi.fn>
  let mockOnUIReinjection: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = ''
    
    // Reset mocks
    vi.clearAllMocks()
    
    // Create mock callbacks
    mockOnContentChange = vi.fn()
    mockOnUIReinjection = vi.fn()
    
    // Create observer with test options
    observer = new SPAObserver({
      debounceDelay: 10, // Faster for tests
      maxRetries: 2,
      onContentChange: mockOnContentChange,
      onUIReinjection: mockOnUIReinjection
    })
  })

  afterEach(() => {
    if (observer.isCurrentlyObserving()) {
      observer.stopObserving()
    }
    observer.cleanupAll()
    document.body.innerHTML = ''
  })

  describe('Property 10: SPA Change Detection', () => {
    test('should detect LinkedIn content changes and trigger UI re-injection', async () => {
      // **Feature: linkedin-ghostwriter, Property 10: SPA Change Detection**
      
      // Start observing
      observer.startObserving()
      expect(observer.isCurrentlyObserving()).toBe(true)

      // Create a LinkedIn post element
      const postElement = document.createElement('div')
      postElement.setAttribute('data-test-id', 'share-box-text-editor')
      postElement.contentEditable = 'true'
      document.body.appendChild(postElement)

      // Wait for mutation observer to process
      await new Promise(resolve => setTimeout(resolve, 50))

      // Verify element was detected and attached
      expect(observer.getAttachedElements().has(postElement)).toBe(true)
      expect(postElement.getAttribute('data-postphantom-attached')).toBe('true')

      // Simulate content change by modifying the DOM
      const newElement = document.createElement('div')
      newElement.className = 'feed-shared-update-v2'
      document.body.appendChild(newElement)

      // Wait for debounced mutation processing
      await new Promise(resolve => setTimeout(resolve, 50))

      // Verify content change was detected
      expect(mockOnContentChange).toHaveBeenCalled()
    })

    test('Property-Based: SPA Change Detection for various LinkedIn elements', async () => {
      // **Feature: linkedin-ghostwriter, Property 10: SPA Change Detection**
      
      await fc.assert(fc.asyncProperty(
        fc.record({
          selector: fc.constantFrom(
            '[data-test-id="share-box-text-editor"]',
            '.ql-editor[data-placeholder*="Start a post"]',
            '.share-creation-state__text-editor',
            '.mentions-texteditor__content',
            '.msg-form__contenteditable',
            '.comment-form__text-editor'
          ),
          elementTag: fc.constantFrom('div', 'textarea', 'p', 'span'),
          attributes: fc.record({
            contentEditable: fc.constantFrom('true', 'false'),
            className: fc.string({ minLength: 1, maxLength: 50 }),
            id: fc.string({ minLength: 1, maxLength: 20 })
          })
        }),
        async (config) => {
          // Create fresh observer for each test
          const testObserver = new SPAObserver({
            debounceDelay: 5,
            onContentChange: mockOnContentChange,
            onUIReinjection: mockOnUIReinjection
          })

          try {
            testObserver.startObserving()

            // Create element matching the selector
            const element = document.createElement(config.elementTag)
            
            // Apply selector-specific attributes
            if (config.selector.includes('data-test-id')) {
              element.setAttribute('data-test-id', 'share-box-text-editor')
            } else if (config.selector.includes('ql-editor')) {
              element.className = 'ql-editor'
              element.setAttribute('data-placeholder', 'Start a post')
            } else if (config.selector.includes('share-creation-state')) {
              element.className = 'share-creation-state__text-editor'
            } else if (config.selector.includes('mentions-texteditor')) {
              element.className = 'mentions-texteditor__content'
            } else if (config.selector.includes('msg-form')) {
              element.className = 'msg-form__contenteditable'
            } else if (config.selector.includes('comment-form')) {
              element.className = 'comment-form__text-editor'
            }

            // Apply additional attributes
            element.contentEditable = config.attributes.contentEditable
            if (config.attributes.className) {
              element.className += ` ${config.attributes.className}`
            }
            if (config.attributes.id) {
              element.id = config.attributes.id
            }

            document.body.appendChild(element)

            // Wait for mutation observer processing
            await new Promise(resolve => setTimeout(resolve, 20))

            // Property: For any valid LinkedIn post element, it should be detected and attached
            expect(testObserver.getAttachedElements().has(element)).toBe(true)
            expect(element.getAttribute('data-postphantom-attached')).toBe('true')

            // Property: Element should have event handlers attached
            expect(element.getAttribute('data-postphantom-handlers')).toBe('attached')

            // Cleanup
            testObserver.stopObserving()
            testObserver.cleanupAll()
            element.remove()

          } catch (error) {
            testObserver.stopObserving()
            testObserver.cleanupAll()
            throw error
          }
        }
      ), { numRuns: 100 })
    })

    test('should handle LinkedIn navigation changes', async () => {
      observer.startObserving()

      // Create main content area
      const mainContent = document.createElement('div')
      mainContent.className = 'scaffold-layout__main'
      document.body.appendChild(mainContent)

      // Simulate navigation by replacing content
      const newContent = document.createElement('div')
      newContent.className = 'feed-container-theme'
      mainContent.appendChild(newContent)

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(mockOnContentChange).toHaveBeenCalled()
    })

    test('should detect feed updates and content changes', async () => {
      observer.startObserving()

      // Create feed update element
      const feedUpdate = document.createElement('div')
      feedUpdate.className = 'feed-shared-update-v2'
      document.body.appendChild(feedUpdate)

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(mockOnContentChange).toHaveBeenCalled()
    })

    test('should handle element removal and cleanup', async () => {
      observer.startObserving()

      // Create and attach element
      const postElement = document.createElement('div')
      postElement.setAttribute('data-test-id', 'share-box-text-editor')
      document.body.appendChild(postElement)

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(observer.getAttachedElements().has(postElement)).toBe(true)

      // Remove element
      postElement.remove()

      await new Promise(resolve => setTimeout(resolve, 50))

      // Should be cleaned up
      expect(observer.getAttachedElements().has(postElement)).toBe(false)
      expect(shadowDOMInjector.cleanup).toHaveBeenCalledWith(postElement)
    })
  })

  describe('UI Re-injection Logic', () => {
    test('should re-inject UI when content changes affect attached elements', async () => {
      observer.startObserving()

      // Create post element
      const postElement = document.createElement('div')
      postElement.setAttribute('data-test-id', 'share-box-text-editor')
      document.body.appendChild(postElement)

      await new Promise(resolve => setTimeout(resolve, 50))

      // Simulate focus to trigger UI injection
      postElement.dispatchEvent(new FocusEvent('focus'))

      await new Promise(resolve => setTimeout(resolve, 20))

      expect(shadowDOMInjector.createUI).toHaveBeenCalledWith({
        targetElement: postElement,
        position: 'after',
        className: 'postphantom-shadow-host'
      })
    })

    test('should handle UI injection failures with retry logic', async () => {
      // Mock createUI to fail initially
      const mockCreateUI = shadowDOMInjector.createUI as ReturnType<typeof vi.fn>
      mockCreateUI.mockRejectedValueOnce(new Error('Injection failed'))

      observer.startObserving()

      const postElement = document.createElement('div')
      postElement.setAttribute('data-test-id', 'share-box-text-editor')
      document.body.appendChild(postElement)

      await new Promise(resolve => setTimeout(resolve, 50))

      // Trigger injection
      postElement.dispatchEvent(new FocusEvent('focus'))

      await new Promise(resolve => setTimeout(resolve, 20))

      // Should attempt recovery
      expect(shadowDOMInjector.recoverFromInjectionFailure).toHaveBeenCalledWith(postElement)
    })

    test('should respect max retry limit', async () => {
      // Create observer with max retries of 1
      const testObserver = new SPAObserver({
        maxRetries: 1,
        debounceDelay: 5
      })

      // Mock both createUI and recovery to fail
      const mockCreateUI = shadowDOMInjector.createUI as ReturnType<typeof vi.fn>
      const mockRecover = shadowDOMInjector.recoverFromInjectionFailure as ReturnType<typeof vi.fn>
      mockCreateUI.mockRejectedValue(new Error('Always fails'))
      mockRecover.mockResolvedValue(null)

      testObserver.startObserving()

      const postElement = document.createElement('div')
      postElement.setAttribute('data-test-id', 'share-box-text-editor')
      document.body.appendChild(postElement)

      await new Promise(resolve => setTimeout(resolve, 50))

      // Trigger injection multiple times
      postElement.dispatchEvent(new FocusEvent('focus'))
      await new Promise(resolve => setTimeout(resolve, 20))
      
      postElement.dispatchEvent(new FocusEvent('focus'))
      await new Promise(resolve => setTimeout(resolve, 20))
      
      postElement.dispatchEvent(new FocusEvent('focus'))
      await new Promise(resolve => setTimeout(resolve, 20))

      // Should attempt injection: initial (retry count 0) + 1 retry (retry count 1)
      // After that, retry count becomes 2 which is > maxRetries (1), so no more attempts
      expect(mockCreateUI).toHaveBeenCalledTimes(2) // Initial + 1 retry

      testObserver.stopObserving()
    })
  })

  describe('Debouncing and Performance', () => {
    test('should debounce rapid mutations', async () => {
      observer.startObserving()

      // Create multiple rapid mutations
      for (let i = 0; i < 5; i++) {
        const element = document.createElement('div')
        element.className = 'feed-shared-update-v2'
        document.body.appendChild(element)
      }

      // Wait for debounce period
      await new Promise(resolve => setTimeout(resolve, 50))

      // Should only process once due to debouncing
      expect(mockOnContentChange).toHaveBeenCalledTimes(1)
    })

    test('Property-Based: Debouncing behavior with various mutation patterns', async () => {
      // **Feature: linkedin-ghostwriter, Property 10: SPA Change Detection**
      
      await fc.assert(fc.asyncProperty(
        fc.record({
          mutationCount: fc.integer({ min: 1, max: 10 }),
          mutationDelay: fc.integer({ min: 0, max: 5 }),
          debounceDelay: fc.integer({ min: 5, max: 20 })
        }),
        async (config) => {
          const testObserver = new SPAObserver({
            debounceDelay: config.debounceDelay,
            onContentChange: mockOnContentChange
          })

          try {
            testObserver.startObserving()
            mockOnContentChange.mockClear()

            // Create rapid mutations
            for (let i = 0; i < config.mutationCount; i++) {
              const element = document.createElement('div')
              element.className = 'feed-shared-update-v2'
              document.body.appendChild(element)
              
              if (config.mutationDelay > 0) {
                await new Promise(resolve => setTimeout(resolve, config.mutationDelay))
              }
            }

            // Wait for debounce period plus buffer
            await new Promise(resolve => setTimeout(resolve, config.debounceDelay + 10))

            // Property: Debouncing should limit the number of callback invocations
            // regardless of the number of mutations
            expect(mockOnContentChange).toHaveBeenCalledTimes(1)

            testObserver.stopObserving()
            testObserver.cleanupAll()

          } catch (error) {
            testObserver.stopObserving()
            testObserver.cleanupAll()
            throw error
          }
        }
      ), { numRuns: 50 })
    })
  })

  describe('Observer Lifecycle', () => {
    test('should start and stop observing correctly', () => {
      expect(observer.isCurrentlyObserving()).toBe(false)

      observer.startObserving()
      expect(observer.isCurrentlyObserving()).toBe(true)

      observer.stopObserving()
      expect(observer.isCurrentlyObserving()).toBe(false)
    })

    test('should handle multiple start calls gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      observer.startObserving()
      observer.startObserving() // Second call should warn

      expect(consoleSpy).toHaveBeenCalledWith('SPAObserver is already observing')
      expect(observer.isCurrentlyObserving()).toBe(true)

      consoleSpy.mockRestore()
    })

    test('should handle stop when not observing', () => {
      // Should not throw
      expect(() => observer.stopObserving()).not.toThrow()
    })

    test('should cleanup all elements on stop', async () => {
      observer.startObserving()

      // Create multiple elements
      const elements = []
      for (let i = 0; i < 3; i++) {
        const element = document.createElement('div')
        element.setAttribute('data-test-id', 'share-box-text-editor')
        document.body.appendChild(element)
        elements.push(element)
      }

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(observer.getAttachedElements().size).toBe(3)

      observer.stopObserving()

      expect(observer.getAttachedElements().size).toBe(0)
    })
  })

  describe('Element Management', () => {
    test('should track attached elements correctly', async () => {
      observer.startObserving()

      const element1 = document.createElement('div')
      element1.setAttribute('data-test-id', 'share-box-text-editor')
      document.body.appendChild(element1)

      const element2 = document.createElement('div')
      element2.className = 'ql-editor'
      element2.setAttribute('data-placeholder', 'Start a post')
      document.body.appendChild(element2)

      await new Promise(resolve => setTimeout(resolve, 50))

      const attachedElements = observer.getAttachedElements()
      expect(attachedElements.has(element1)).toBe(true)
      expect(attachedElements.has(element2)).toBe(true)
      expect(attachedElements.size).toBe(2)
    })

    test('should cleanup individual elements', async () => {
      observer.startObserving()

      const element = document.createElement('div')
      element.setAttribute('data-test-id', 'share-box-text-editor')
      document.body.appendChild(element)

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(observer.getAttachedElements().has(element)).toBe(true)

      observer.cleanupElement(element)

      expect(observer.getAttachedElements().has(element)).toBe(false)
      expect(element.getAttribute('data-postphantom-attached')).toBeNull()
      expect(shadowDOMInjector.cleanup).toHaveBeenCalledWith(element)
    })

    test('should force scan for new elements', async () => {
      observer.startObserving()

      // Add element after observer is started
      const element = document.createElement('div')
      element.setAttribute('data-test-id', 'share-box-text-editor')
      document.body.appendChild(element)

      // Force scan instead of waiting for mutation observer
      observer.forceScan()

      expect(observer.getAttachedElements().has(element)).toBe(true)
    })
  })

  describe('Error Handling', () => {
    test('should handle MutationObserver not supported', () => {
      // Mock MutationObserver to be undefined
      const originalMutationObserver = (global as any).MutationObserver
      ;(global as any).MutationObserver = undefined

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const testObserver = new SPAObserver()
      testObserver.startObserving()

      expect(consoleSpy).toHaveBeenCalledWith('MutationObserver not supported - SPAObserver cannot start')
      expect(testObserver.isCurrentlyObserving()).toBe(false)

      // Restore
      ;(global as any).MutationObserver = originalMutationObserver
      consoleSpy.mockRestore()
    })

    test('should handle DOM query errors gracefully', () => {
      // Should not crash when DOM queries fail
      expect(() => observer.forceScan()).not.toThrow()
    })
  })

  describe('Configuration Options', () => {
    test('should use custom post selectors', async () => {
      const customObserver = new SPAObserver({
        postSelectors: ['.custom-post-selector'],
        debounceDelay: 10
      })

      customObserver.startObserving()

      // Create element with custom selector
      const element = document.createElement('div')
      element.className = 'custom-post-selector'
      document.body.appendChild(element)

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(customObserver.getAttachedElements().has(element)).toBe(true)

      customObserver.stopObserving()
    })

    test('should call custom callbacks', async () => {
      const customOnChange = vi.fn()
      const customOnReinjection = vi.fn()

      const customObserver = new SPAObserver({
        onContentChange: customOnChange,
        onUIReinjection: customOnReinjection,
        debounceDelay: 10
      })

      customObserver.startObserving()

      // Create content change
      const element = document.createElement('div')
      element.className = 'feed-shared-update-v2'
      document.body.appendChild(element)

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(customOnChange).toHaveBeenCalled()

      customObserver.stopObserving()
    })
  })
})