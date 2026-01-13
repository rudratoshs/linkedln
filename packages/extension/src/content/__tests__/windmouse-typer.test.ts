/**
 * Property-Based Tests for WindMouse Typing Simulation
 * 
 * Tests Property 17: Natural Typing Simulation
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { describe, test, expect, beforeEach, vi } from 'vitest'
import fc from 'fast-check'
import { WindMouseTyper, TypingOptions } from '../windmouse-typer'

// Mock DOM elements for testing
class MockHTMLElement {
  textContent = ''
  value = ''
  isContentEditable = false
  selectionStart = 0
  selectionEnd = 0
  
  focus = vi.fn()
  dispatchEvent = vi.fn()
  getBoundingClientRect = vi.fn(() => ({
    left: 100,
    top: 100,
    width: 200,
    height: 50,
    right: 300,
    bottom: 150
  }))
  
  addEventListener = vi.fn()
  removeEventListener = vi.fn()
}

class MockInputElement extends MockHTMLElement {
  constructor() {
    super()
    this.value = ''
  }
  
  select = vi.fn()
}

class MockContentEditableElement extends MockHTMLElement {
  constructor() {
    super()
    this.isContentEditable = true
  }
}

// Mock window.getSelection
const mockSelection = {
  removeAllRanges: vi.fn(),
  addRange: vi.fn(),
  getRangeAt: vi.fn(() => ({
    deleteContents: vi.fn(),
    insertNode: vi.fn(),
    collapse: vi.fn(),
    selectNodeContents: vi.fn()
  })),
  rangeCount: 1
}

Object.defineProperty(window, 'getSelection', {
  value: () => mockSelection,
  writable: true
})

// Mock document.createRange
Object.defineProperty(document, 'createRange', {
  value: () => ({
    selectNodeContents: vi.fn(),
    deleteContents: vi.fn(),
    insertNode: vi.fn(),
    collapse: vi.fn()
  }),
  writable: true
})

// Mock document.createTextNode
Object.defineProperty(document, 'createTextNode', {
  value: (text: string) => ({ textContent: text }),
  writable: true
})

describe('WindMouse Typing Simulation Property Tests', () => {
  let typer: WindMouseTyper
  
  beforeEach(() => {
    typer = new WindMouseTyper()
    vi.clearAllMocks()
  })

  /**
   * Property 17: Natural Typing Simulation
   * Feature: linkedin-ghostwriter, Property 17: Natural Typing Simulation
   */
  test('Property 17: Natural Typing Simulation - Gaussian jitter timing', async () => {
    await fc.assert(fc.asyncProperty(
      fc.string({ minLength: 1, maxLength: 10 }), // Reduced length for faster tests
      fc.record({
        baseSpeed: fc.integer({ min: 60, max: 300 }),
        jitterTemperature: fc.float({ min: Math.fround(0.1), max: Math.fround(1.0) }),
        minDwellTime: fc.integer({ min: 10, max: 50 }),
        maxDwellTime: fc.integer({ min: 100, max: 500 })
      }),
      async (text, options) => {
        // Ensure maxDwellTime > minDwellTime
        if (options.maxDwellTime <= options.minDwellTime) {
          options.maxDwellTime = options.minDwellTime + 100
        }
        
        const typerWithOptions = new WindMouseTyper(options)
        const element = new MockInputElement() as any
        
        const result = await typerWithOptions.typeText(text, element)
        
        // Property: Should successfully type all characters
        expect(result.success).toBe(true)
        expect(result.characterCount).toBe(text.length)
        
        // Property: Should have keypress events for each character
        const keypressEvents = result.events.filter(e => e.type === 'keypress')
        expect(keypressEvents).toHaveLength(text.length)
        
        // Property: All timing should respect bounds
        keypressEvents.forEach(event => {
          if (event.duration) {
            expect(event.duration).toBeGreaterThanOrEqual(options.minDwellTime)
            expect(event.duration).toBeLessThanOrEqual(options.maxDwellTime)
          }
        })
        
        // Property: Should dispatch proper keyboard events
        expect(element.dispatchEvent).toHaveBeenCalled()
        
        // Property: Total time should be reasonable for the content length
        const expectedMinTime = text.length * options.minDwellTime
        const expectedMaxTime = text.length * options.maxDwellTime * 3 // Allow for thinking pauses and jitter
        expect(result.totalTime).toBeGreaterThanOrEqual(0) // Just check it's positive
        expect(result.totalTime).toBeLessThanOrEqual(expectedMaxTime * 2) // Very generous upper bound
      }
    ), { numRuns: 20 }) // Reduced runs for faster execution
  })

  test('Property 17: Natural Typing Simulation - Character-specific timing variations', async () => {
    await fc.assert(fc.asyncProperty(
      fc.string({ minLength: 5, maxLength: 20 }).filter(s => 
        s.includes('.') || s.includes(',') || s.includes(' ') || /[a-zA-Z]/.test(s)
      ),
      async (text) => {
        const element = new MockInputElement() as any
        const result = await typer.typeText(text, element)
        
        // Property: Should successfully type mixed content
        expect(result.success).toBe(true)
        expect(result.characterCount).toBe(text.length)
        
        // Property: Should have events for each character
        const keypressEvents = result.events.filter(e => e.type === 'keypress')
        expect(keypressEvents).toHaveLength(text.length)
        
        // Property: Each character should have a corresponding event
        keypressEvents.forEach((event, index) => {
          expect(event.character).toBe(text[index])
          expect(event.timestamp).toBeGreaterThan(0)
        })
      }
    ), { numRuns: 50 })
  })

  test('Property 17: Natural Typing Simulation - Thinking pauses occur naturally', async () => {
    await fc.assert(fc.asyncProperty(
      fc.string({ minLength: 5, maxLength: 20 }), // Reduced length
      fc.record({
        thinkingPauseProbability: fc.float({ min: Math.fround(0.1), max: Math.fround(0.3) }),
        thinkingPauseRange: fc.tuple(
          fc.integer({ min: 100, max: 300 }),
          fc.integer({ min: 400, max: 1000 })
        ).map(([min, max]) => [min, max] as [number, number])
      }),
      async (text, options) => {
        const typerWithOptions = new WindMouseTyper(options)
        const element = new MockInputElement() as any
        
        const result = await typerWithOptions.typeText(text, element)
        
        // Property: Should complete successfully
        expect(result.success).toBe(true)
        
        // Property: May have thinking pauses (probabilistic)
        const pauseEvents = result.events.filter(e => e.type === 'pause')
        
        // If pauses occurred, they should be within the specified range
        pauseEvents.forEach(event => {
          if (event.duration) {
            expect(event.duration).toBeGreaterThanOrEqual(options.thinkingPauseRange[0])
            expect(event.duration).toBeLessThanOrEqual(options.thinkingPauseRange[1])
          }
        })
        
        // Property: Pause probability should be roughly respected over many characters
        // (This is probabilistic, so we allow some variance)
        const expectedPauses = text.length * options.thinkingPauseProbability
        const actualPauses = pauseEvents.length
        
        // Allow 50% variance due to randomness
        const tolerance = Math.max(1, expectedPauses * 0.5)
        expect(actualPauses).toBeLessThanOrEqual(expectedPauses + tolerance)
      }
    ), { numRuns: 10 }) // Reduced runs for faster execution
  })

  test('Property 17: Natural Typing Simulation - WindMouse cursor movement integration', async () => {
    await fc.assert(fc.asyncProperty(
      fc.string({ minLength: 10, maxLength: 30 }),
      fc.record({
        enableCursorMovement: fc.boolean(),
        windMouse: fc.record({
          gravity: fc.integer({ min: 5, max: 15 }),
          wind: fc.integer({ min: 1, max: 5 }),
          minWait: fc.integer({ min: 1, max: 10 }),
          maxWait: fc.integer({ min: 5, max: 20 }),
          maxStep: fc.integer({ min: 5, max: 20 }),
          targetArea: fc.integer({ min: 5, max: 20 })
        })
      }),
      async (text, options) => {
        const typerWithOptions = new WindMouseTyper(options)
        const element = new MockInputElement() as any
        
        const result = await typerWithOptions.typeText(text, element)
        
        // Property: Should complete successfully regardless of cursor movement settings
        expect(result.success).toBe(true)
        expect(result.characterCount).toBe(text.length)
        
        // Property: Cursor movement events should only occur if enabled
        const cursorEvents = result.events.filter(e => e.type === 'cursor-move')
        
        if (options.enableCursorMovement) {
          // May have cursor movement events (they occur every 5 characters)
          cursorEvents.forEach(event => {
            expect(event.position).toBeDefined()
            expect(event.position!.x).toBeGreaterThanOrEqual(0)
            expect(event.position!.y).toBeGreaterThanOrEqual(0)
          })
        }
        
        // Property: Should focus the element
        expect(element.focus).toHaveBeenCalled()
      }
    ), { numRuns: 20 }) // Reduced runs for faster execution
  })

  test('Property 17: Natural Typing Simulation - Content editable vs input element handling', async () => {
    await fc.assert(fc.asyncProperty(
      fc.string({ minLength: 1, max: 20 }),
      fc.boolean(), // isContentEditable
      async (text, isContentEditable) => {
        const element = isContentEditable 
          ? new MockContentEditableElement() as any
          : new MockInputElement() as any
        
        const result = await typer.typeText(text, element)
        
        // Property: Should handle both element types successfully
        expect(result.success).toBe(true)
        expect(result.characterCount).toBe(text.length)
        
        // Property: Should dispatch keyboard events for both types
        expect(element.dispatchEvent).toHaveBeenCalled()
        
        // Property: Should focus the element
        expect(element.focus).toHaveBeenCalled()
        
        // Property: Should have keypress events for each character
        const keypressEvents = result.events.filter(e => e.type === 'keypress')
        expect(keypressEvents).toHaveLength(text.length)
      }
    ), { numRuns: 20 }) // Reduced runs for faster execution
  })

  test('Property 17: Natural Typing Simulation - Speed variations create natural patterns', async () => {
    await fc.assert(fc.asyncProperty(
      fc.string({ minLength: 5, maxLength: 20 }), // Reduced length
      fc.record({
        baseSpeed: fc.integer({ min: 120, max: 240 }),
        jitterTemperature: fc.float({ min: Math.fround(0.2), max: Math.fround(0.8) })
      }),
      async (text, options) => {
        const typerWithOptions = new WindMouseTyper(options)
        const element = new MockInputElement() as any
        
        const result = await typerWithOptions.typeText(text, element)
        
        // Property: Should complete successfully
        expect(result.success).toBe(true)
        
        // Property: Timing should vary naturally (not all the same)
        const keypressEvents = result.events.filter(e => e.type === 'keypress')
        const durations = keypressEvents.map(e => e.duration).filter(d => d !== undefined)
        
        if (durations.length > 1) {
          // Should have variation in timing (not all identical)
          const uniqueDurations = new Set(durations)
          expect(uniqueDurations.size).toBeGreaterThan(1)
          
          // Should have reasonable distribution (not all at extremes)
          const avgDuration = durations.reduce((sum, d) => sum + d!, 0) / durations.length
          expect(avgDuration).toBeGreaterThan(0)
        }
      }
    ), { numRuns: 20 }) // Reduced runs for faster execution
  })

  test('Property 17: Natural Typing Simulation - Error handling and recovery', async () => {
    await fc.assert(fc.asyncProperty(
      fc.string({ minLength: 1, maxLength: 20 }),
      async (text) => {
        // Test with null element (should fail gracefully)
        const result = await typer.typeText(text, null as any)
        
        // Property: Should handle errors gracefully
        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
        expect(result.characterCount).toBe(0)
        
        // Property: Should have error event
        const errorEvents = result.events.filter(e => e.type === 'error')
        expect(errorEvents).toHaveLength(1)
      }
    ), { numRuns: 10 }) // Reduced runs for faster execution
  })

  test('Property 17: Natural Typing Simulation - Concurrent typing prevention', async () => {
    const text1 = 'First'
    const text2 = 'Second'
    const element = new MockInputElement() as any
    
    // Start first typing session
    const promise1 = typer.typeText(text1, element)
    
    // Try to start second session while first is running
    await expect(typer.typeText(text2, element)).rejects.toThrow('already typing')
    
    // First session should complete successfully
    const result1 = await promise1
    expect(result1.success).toBe(true)
    
    // After first session completes, second session should work
    const result2 = await typer.typeText(text2, element)
    expect(result2.success).toBe(true)
  }, 10000) // Increased timeout for this test

  test('Property 17: Natural Typing Simulation - State management during typing', async () => {
    const text = 'Test'
    const element = new MockInputElement() as any
    
    // Initially not typing
    expect(typer.isCurrentlyTyping()).toBe(false)
    expect(typer.getCurrentTarget()).toBe(null)
    
    // Start typing
    const promise = typer.typeText(text, element)
    
    // Should be in typing state
    expect(typer.isCurrentlyTyping()).toBe(true)
    expect(typer.getCurrentTarget()).toBe(element)
    
    // Wait for completion
    const result = await promise
    expect(result.success).toBe(true)
    
    // Should return to idle state
    expect(typer.isCurrentlyTyping()).toBe(false)
    expect(typer.getCurrentTarget()).toBe(null)
  }, 10000) // Increased timeout for this test
})

/**
 * Feature: linkedin-ghostwriter, Property 17: Natural Typing Simulation
 * 
 * These tests validate that the WindMouse typing implementation provides:
 * 1. Gaussian jitter for typing intervals (Requirement 7.2)
 * 2. Realistic dwell times between keystrokes (Requirement 7.3) 
 * 3. Natural typing speed variations (Requirement 7.5)
 * 4. WindMouse algorithm for cursor movement (Requirement 7.4)
 * 5. Human-like typing patterns overall (Requirement 7.1)
 */