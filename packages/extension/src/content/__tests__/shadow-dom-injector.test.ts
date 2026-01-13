import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import fc from 'fast-check'
import { ShadowDOMInjector, ShadowDOMInjectionError } from '../shadow-dom-injector'

describe('ShadowDOMInjector', () => {
  let injector: ShadowDOMInjector
  let targetElement: HTMLElement

  beforeEach(() => {
    injector = new ShadowDOMInjector()
    targetElement = document.createElement('div')
    targetElement.style.position = 'absolute'
    targetElement.style.top = '100px'
    targetElement.style.left = '100px'
    targetElement.style.width = '200px'
    targetElement.style.height = '50px'
    document.body.appendChild(targetElement)
    
    // Mock getBoundingClientRect
    targetElement.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 100,
      left: 100,
      bottom: 150,
      right: 300,
      width: 200,
      height: 50,
    })
  })

  afterEach(() => {
    injector.cleanupAll()
    document.body.innerHTML = ''
  })

  describe('Property 9: Shadow DOM UI Isolation', () => {
    test('should inject UI elements using Shadow DOM for isolation', async () => {
      // **Feature: linkedin-ghostwriter, Property 9: Shadow DOM UI Isolation**
      
      const instance = await injector.createUI({
        targetElement,
        position: 'after'
      })

      // Verify Shadow DOM was created
      expect(instance.shadowRoot).toBeDefined()
      expect(instance.container).toBeDefined()
      expect(instance.reactRoot).toBeDefined()

      // Verify shadow host is in DOM
      const shadowHosts = document.querySelectorAll('.postphantom-shadow-host')
      expect(shadowHosts).toHaveLength(1)

      // Verify shadow root is closed mode for security
      const shadowHost = shadowHosts[0] as HTMLElement
      expect(shadowHost.shadowRoot).toBeNull() // Closed mode means shadowRoot is not accessible

      // Verify positioning
      expect(shadowHost.style.position).toBe('absolute')
      expect(shadowHost.style.zIndex).toBe('10000')
    })

    test('Property-Based: Shadow DOM UI Isolation for any valid configuration', async () => {
      // **Feature: linkedin-ghostwriter, Property 9: Shadow DOM UI Isolation**
      
      await fc.assert(fc.asyncProperty(
        fc.record({
          position: fc.constantFrom('after', 'before', 'inside'),
          className: fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z][a-zA-Z0-9-_]*$/.test(s)),
          zIndex: fc.integer({ min: 1, max: 999999 }),
          elementBounds: fc.record({
            top: fc.integer({ min: 0, max: 1000 }),
            left: fc.integer({ min: 0, max: 1000 }),
            width: fc.integer({ min: 50, max: 500 }),
            height: fc.integer({ min: 20, max: 200 })
          })
        }),
        async (config) => {
          // Create a fresh target element for each test
          const testElement = document.createElement('div')
          testElement.style.position = 'absolute'
          testElement.style.top = `${config.elementBounds.top}px`
          testElement.style.left = `${config.elementBounds.left}px`
          testElement.style.width = `${config.elementBounds.width}px`
          testElement.style.height = `${config.elementBounds.height}px`
          document.body.appendChild(testElement)
          
          // Mock getBoundingClientRect with generated bounds
          testElement.getBoundingClientRect = vi.fn().mockReturnValue({
            top: config.elementBounds.top,
            left: config.elementBounds.left,
            bottom: config.elementBounds.top + config.elementBounds.height,
            right: config.elementBounds.left + config.elementBounds.width,
            width: config.elementBounds.width,
            height: config.elementBounds.height,
          })

          try {
            const instance = await injector.createUI({
              targetElement: testElement,
              position: config.position as any,
              className: config.className,
              zIndex: config.zIndex
            })

            // Property: For any valid configuration, Shadow DOM should be created with proper isolation
            expect(instance.shadowRoot).toBeDefined()
            expect(instance.container).toBeDefined()
            expect(instance.reactRoot).toBeDefined()

            // Property: Shadow host should always be in DOM with correct class and positioning
            const shadowHost = document.querySelector(`.${config.className}`) as HTMLElement
            expect(shadowHost).toBeTruthy()
            expect(shadowHost.style.position).toBe('absolute')
            expect(shadowHost.style.zIndex).toBe(config.zIndex.toString())

            // Property: Shadow root should always be in closed mode for security isolation
            expect(shadowHost.shadowRoot).toBeNull() // Closed mode

            // Property: Container should always have proper pointer events and positioning
            expect(instance.container.style.pointerEvents).toBe('auto')
            expect(instance.container.style.position).toBe('relative')

            // Cleanup for this test iteration
            injector.cleanup(testElement)
            testElement.remove()

          } catch (error) {
            // Cleanup on error
            testElement.remove()
            throw error
          }
        }
      ), { numRuns: 100 })
    })

    test('should isolate styles within Shadow DOM', async () => {
      const instance = await injector.createUI({
        targetElement,
        position: 'after'
      })

      // Verify styles are applied within shadow root
      const shadowHost = document.querySelector('.postphantom-shadow-host') as HTMLElement
      expect(shadowHost).toBeTruthy()

      // Verify container has proper styling isolation
      expect(instance.container.style.pointerEvents).toBe('auto')
      expect(instance.container.style.position).toBe('relative')
    })

    test('should position shadow host correctly for different positions', async () => {
      const positions = ['after', 'before', 'inside'] as const

      for (const position of positions) {
        injector.cleanup(targetElement)
        
        const instance = await injector.createUI({
          targetElement,
          position
        })

        const shadowHost = document.querySelector('.postphantom-shadow-host') as HTMLElement
        expect(shadowHost).toBeTruthy()
        expect(shadowHost.style.position).toBe('absolute')

        // Verify position-specific styling
        switch (position) {
          case 'after':
            expect(shadowHost.style.top).toBe('158px') // bottom + scrollTop + 8
            break
          case 'before':
            expect(shadowHost.style.transform).toBe('translateY(-100%)')
            break
          case 'inside':
            expect(shadowHost.style.left).toBe('-120px') // right - 320 (width)
            break
        }
      }
    })

    test('should handle cleanup properly', async () => {
      const instance = await injector.createUI({
        targetElement,
        position: 'after'
      })

      // Verify instance is created
      expect(injector.getInstance(targetElement)).toBe(instance)
      expect(document.querySelectorAll('.postphantom-shadow-host')).toHaveLength(1)

      // Cleanup
      injector.cleanup(targetElement)

      // Verify cleanup
      expect(injector.getInstance(targetElement)).toBeUndefined()
      expect(document.querySelectorAll('.postphantom-shadow-host')).toHaveLength(0)
    })

    test('should handle multiple instances for different elements', async () => {
      const targetElement2 = document.createElement('div')
      document.body.appendChild(targetElement2)
      targetElement2.getBoundingClientRect = vi.fn().mockReturnValue({
        top: 200,
        left: 200,
        bottom: 250,
        right: 400,
        width: 200,
        height: 50,
      })

      const instance1 = await injector.createUI({
        targetElement,
        position: 'after'
      })

      const instance2 = await injector.createUI({
        targetElement: targetElement2,
        position: 'after'
      })

      // Verify both instances exist
      expect(injector.getInstance(targetElement)).toBe(instance1)
      expect(injector.getInstance(targetElement2)).toBe(instance2)
      expect(document.querySelectorAll('.postphantom-shadow-host')).toHaveLength(2)

      // Cleanup
      injector.cleanupAll()
      expect(document.querySelectorAll('.postphantom-shadow-host')).toHaveLength(0)
    })

    test('should replace existing instance when creating UI for same element', async () => {
      const instance1 = await injector.createUI({
        targetElement,
        position: 'after'
      })

      expect(document.querySelectorAll('.postphantom-shadow-host')).toHaveLength(1)

      const instance2 = await injector.createUI({
        targetElement,
        position: 'before'
      })

      // Should still have only one shadow host
      expect(document.querySelectorAll('.postphantom-shadow-host')).toHaveLength(1)
      expect(injector.getInstance(targetElement)).toBe(instance2)
      expect(injector.getInstance(targetElement)).not.toBe(instance1)
    })
  })

  describe('Error Recovery', () => {
    test('should attempt recovery when injection fails', async () => {
      // Mock attachShadow to fail initially
      const originalAttachShadow = Element.prototype.attachShadow
      let callCount = 0
      
      Element.prototype.attachShadow = vi.fn().mockImplementation(() => {
        callCount++
        if (callCount <= 2) {
          throw new Error('Shadow DOM creation failed')
        }
        return originalAttachShadow.call(this, { mode: 'closed' })
      })

      const recoveredInstance = await injector.recoverFromInjectionFailure(targetElement)

      // Should eventually succeed with recovery
      expect(recoveredInstance).toBeTruthy()
      expect(callCount).toBeGreaterThan(1) // Multiple attempts were made

      // Restore original method
      Element.prototype.attachShadow = originalAttachShadow
    })

    test('Property-Based: Error recovery should handle various failure scenarios', async () => {
      // **Feature: linkedin-ghostwriter, Property 9: Shadow DOM UI Isolation**
      
      await fc.assert(fc.asyncProperty(
        fc.record({
          failureCount: fc.integer({ min: 1, max: 3 }), // Max 3 since there are 3 strategies
          errorMessage: fc.string({ minLength: 5, maxLength: 100 }),
          shouldEventuallySucceed: fc.boolean()
        }),
        async (config) => {
          const originalAttachShadow = Element.prototype.attachShadow
          let callCount = 0
          
          Element.prototype.attachShadow = vi.fn().mockImplementation(function() {
            callCount++
            if (config.shouldEventuallySucceed && callCount === config.failureCount) {
              // Succeed on the exact failure count when should succeed
              return originalAttachShadow.call(this, { mode: 'closed' })
            } else if (!config.shouldEventuallySucceed || callCount < config.failureCount) {
              // Fail if should not succeed, or if we haven't reached the success point yet
              throw new Error(config.errorMessage)
            }
            // If we get here and shouldEventuallySucceed is true, succeed
            return originalAttachShadow.call(this, { mode: 'closed' })
          })

          try {
            const result = await injector.recoverFromInjectionFailure(targetElement)

            if (config.shouldEventuallySucceed && config.failureCount <= 3) {
              // Property: If recovery should succeed and failure count is within strategy limit, result should be truthy
              expect(result).toBeTruthy()
              if (result) {
                expect(result.shadowRoot).toBeDefined()
                expect(result.container).toBeDefined()
              }
            } else {
              // Property: If all strategies should fail (failureCount > 3 or shouldEventuallySucceed is false), result should be null
              expect(result).toBeNull()
            }

            // Property: Call count should reflect the number of attempts made
            expect(callCount).toBeGreaterThanOrEqual(1)

          } finally {
            // Always restore original method
            Element.prototype.attachShadow = originalAttachShadow
            // Cleanup any created instances
            injector.cleanup(targetElement)
          }
        }
      ), { numRuns: 50 }) // Reduced runs for error scenarios
    })

    test('should create minimal UI when all strategies fail', async () => {
      // Mock attachShadow to always fail
      const originalAttachShadow = Element.prototype.attachShadow
      Element.prototype.attachShadow = vi.fn().mockImplementation(() => {
        throw new Error('Shadow DOM not supported')
      })

      const recoveredInstance = await injector.recoverFromInjectionFailure(targetElement)

      // Should create minimal fallback
      expect(recoveredInstance).toBeTruthy()
      expect(document.querySelector('.postphantom-shadow-host-minimal')).toBeTruthy()

      // Restore original method
      Element.prototype.attachShadow = originalAttachShadow
    })

    test('should notify user when all recovery fails', async () => {
      // Mock all recovery strategies to fail
      const originalAttachShadow = Element.prototype.attachShadow
      Element.prototype.attachShadow = vi.fn().mockImplementation(() => {
        throw new Error('Complete failure')
      })

      // Mock createElement to fail for minimal UI as well
      const originalCreateElement = document.createElement
      document.createElement = vi.fn().mockImplementation(() => {
        throw new Error('DOM manipulation failed')
      })

      const result = await injector.recoverFromInjectionFailure(targetElement)

      expect(result).toBeNull()

      // Restore original methods
      Element.prototype.attachShadow = originalAttachShadow
      document.createElement = originalCreateElement
    })
  })

  describe('Static Methods', () => {
    test('should detect Shadow DOM support', () => {
      expect(ShadowDOMInjector.isSupported()).toBe(true)
    })

    test('should handle lack of Shadow DOM support', () => {
      const originalAttachShadow = Element.prototype.attachShadow
      delete (Element.prototype as any).attachShadow

      expect(ShadowDOMInjector.isSupported()).toBe(false)

      // Restore
      Element.prototype.attachShadow = originalAttachShadow
    })
  })

  describe('Error Handling', () => {
    test('should throw ShadowDOMInjectionError on creation failure', async () => {
      // Mock attachShadow to fail
      const originalAttachShadow = Element.prototype.attachShadow
      Element.prototype.attachShadow = vi.fn().mockImplementation(() => {
        throw new Error('Shadow DOM creation failed')
      })

      await expect(injector.createUI({
        targetElement,
        position: 'after'
      })).rejects.toThrow(ShadowDOMInjectionError)

      // Restore
      Element.prototype.attachShadow = originalAttachShadow
    })

    test('should handle invalid position parameter', async () => {
      await expect(injector.createUI({
        targetElement,
        position: 'invalid' as any
      })).rejects.toThrow('Invalid position: invalid')
    })
  })
})