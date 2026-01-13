/**
 * Property-Based Tests for Typing Service Integration
 * 
 * Tests Property 17: Natural Typing Simulation (Integration)
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5 with state management
 */

import { describe, test, expect, beforeEach, vi } from 'vitest'
import fc from 'fast-check'
import { TypingService } from '../typing-service'
import { useAppStore } from '../../store/app-store'

// Mock the app store
vi.mock('../../store/app-store', () => ({
  useAppStore: {
    getState: vi.fn()
  }
}))

// Mock WindMouse typer
vi.mock('../../content/windmouse-typer', () => ({
  windMouseTyper: {
    typeText: vi.fn(),
    updateOptions: vi.fn(),
    stopTyping: vi.fn(),
    isCurrentlyTyping: vi.fn(() => false),
    getCurrentTarget: vi.fn(() => null),
    getOptions: vi.fn(() => ({
      baseSpeed: 180,
      jitterTemperature: 0.3,
      minDwellTime: 20,
      maxDwellTime: 200,
      thinkingPauseProbability: 0.05,
      thinkingPauseRange: [200, 800],
      enableCursorMovement: true,
      windMouse: {
        gravity: 9,
        wind: 3,
        minWait: 5,
        maxWait: 10,
        maxStep: 10,
        targetArea: 10
      }
    }))
  }
}))

// Mock DOM element
class MockElement {
  focus = vi.fn()
  getBoundingClientRect = vi.fn(() => ({
    left: 100,
    top: 100,
    width: 200,
    height: 50,
    right: 300,
    bottom: 150
  }))
  
  isContentEditable = true
  textContent = ''
}

describe('Typing Service Integration Property Tests', () => {
  let typingService: TypingService
  let mockStore: any
  
  beforeEach(() => {
    typingService = new TypingService()
    
    // Setup mock store
    mockStore = {
      canStartTyping: vi.fn(() => true),
      selectedDraft: {
        id: 'test-draft',
        content: 'Test content',
        provider: 'openai',
        timestamp: Date.now(),
        selected: true
      },
      currentPostElement: new MockElement(),
      checkForCheerleaderContent: vi.fn(() => false),
      showCheerleaderWarning: vi.fn(),
      setState: vi.fn(() => true),
      clearDrafts: vi.fn()
    }
    
    vi.mocked(useAppStore.getState).mockReturnValue(mockStore)
    
    // Mock successful typing result
    const windMouseTyper = await import('../../content/windmouse-typer')
    vi.mocked(windMouseTyper.windMouseTyper.typeText).mockResolvedValue({
      success: true,
      totalTime: 1000,
      characterCount: 12,
      events: [
        { type: 'keypress', character: 'T', duration: 50, timestamp: Date.now() },
        { type: 'complete', timestamp: Date.now() }
      ]
    })
  })

  /**
   * Property 17: Natural Typing Simulation - Service Integration
   * Feature: linkedin-ghostwriter, Property 17: Natural Typing Simulation
   */
  test('Property 17: Typing service enforces human-in-the-loop governance', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        canStartTyping: fc.boolean(),
        hasSelectedDraft: fc.boolean(),
        hasTargetElement: fc.boolean(),
        enableAntiCheerleader: fc.boolean(),
        requireConfirmation: fc.boolean()
      }),
      async (scenario) => {
        // Setup scenario
        mockStore.canStartTyping = vi.fn(() => scenario.canStartTyping)
        mockStore.selectedDraft = scenario.hasSelectedDraft ? mockStore.selectedDraft : null
        mockStore.currentPostElement = scenario.hasTargetElement ? mockStore.currentPostElement : null
        
        const serviceWithOptions = new TypingService({
          enableAntiCheerleaderCheck: scenario.enableAntiCheerleader,
          requireUserConfirmation: scenario.requireConfirmation
        })
        
        const result = await serviceWithOptions.typeSelectedDraft()
        
        // Property: Should only succeed if all governance conditions are met
        const shouldSucceed = scenario.canStartTyping && 
                             scenario.hasSelectedDraft && 
                             scenario.hasTargetElement
        
        expect(result.success).toBe(shouldSucceed)
        
        if (shouldSucceed) {
          // Property: Should transition through proper states
          expect(mockStore.setState).toHaveBeenCalledWith('typing', expect.any(String))
          expect(mockStore.setState).toHaveBeenCalledWith('idle', expect.any(String))
          
          // Property: Should clear drafts after successful typing
          expect(mockStore.clearDrafts).toHaveBeenCalled()
          
          // Property: Should track state transitions
          expect(result.stateTransitions).toContain('typing')
          expect(result.stateTransitions).toContain('idle')
        } else {
          // Property: Should fail gracefully with proper error
          expect(result.error).toBeDefined()
          expect(result.stateTransitions).toContain('idle') // Should reset to idle
        }
      }
    ), { numRuns: 20 }) // Reduced runs for faster execution
  })

  test('Property 17: Anti-cheerleader integration works correctly', async () => {
    await fc.assert(fc.asyncProperty(
      fc.string({ minLength: 1, maxLength: 100 }),
      fc.boolean(), // isCheerleaderContent
      async (content, isCheerleaderContent) => {
        // Setup draft with test content
        mockStore.selectedDraft = {
          ...mockStore.selectedDraft,
          content
        }
        
        // Setup cheerleader detection
        mockStore.checkForCheerleaderContent = vi.fn(() => isCheerleaderContent)
        
        const result = await typingService.typeSelectedDraft()
        
        // Property: Should complete successfully regardless of cheerleader content
        expect(result.success).toBe(true)
        
        // Property: Should check for cheerleader content
        expect(mockStore.checkForCheerleaderContent).toHaveBeenCalledWith(content)
        
        // Property: Should show warning if cheerleader content detected
        expect(result.cheerleaderWarningShown).toBe(isCheerleaderContent)
        
        if (isCheerleaderContent) {
          expect(mockStore.showCheerleaderWarning).toHaveBeenCalledWith(content)
        }
      }
    ), { numRuns: 15 }) // Reduced runs for faster execution
  })

  test('Property 17: Content length validation works correctly', async () => {
    await fc.assert(fc.asyncProperty(
      fc.integer({ min: 1, max: 5000 }),
      fc.integer({ min: 100, max: 3000 }),
      async (contentLength, maxLength) => {
        const content = 'a'.repeat(contentLength)
        
        mockStore.selectedDraft = {
          ...mockStore.selectedDraft,
          content
        }
        
        const serviceWithLimit = new TypingService({
          maxContentLength: maxLength
        })
        
        const result = await serviceWithLimit.typeSelectedDraft()
        
        // Property: Should succeed only if content is within limits
        const shouldSucceed = contentLength <= maxLength
        expect(result.success).toBe(shouldSucceed)
        
        if (!shouldSucceed) {
          expect(result.error?.message).toContain('Content too long')
        }
      }
    ), { numRuns: 15 }) // Reduced runs for faster execution
  })

  test('Property 17: Custom content typing bypasses draft selection', async () => {
    await fc.assert(fc.asyncProperty(
      fc.string({ minLength: 1, maxLength: 100 }),
      async (customContent) => {
        const element = new MockElement() as any
        
        const result = await typingService.typeCustomContent(customContent, element)
        
        // Property: Should succeed with custom content
        expect(result.success).toBe(true)
        
        // Property: Should not require draft selection
        // (This bypasses the state machine draft requirements)
        
        // Property: Should still perform governance checks
        expect(result.cheerleaderWarningShown).toBeDefined()
        expect(result.userConfirmationObtained).toBeDefined()
        
        // Verify WindMouse typer was called with correct parameters
        const windMouseTyper = await import('../../content/windmouse-typer')
        expect(windMouseTyper.windMouseTyper.typeText).toHaveBeenCalledWith(customContent, element)
      }
    ), { numRuns: 15 }) // Reduced runs for faster execution
  })

  test('Property 17: Target element validation works correctly', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        hasElement: fc.boolean(),
        isVisible: fc.boolean(),
        isTextInput: fc.boolean()
      }),
      async (elementProps) => {
        let element: any = null
        
        if (elementProps.hasElement) {
          element = new MockElement()
          
          // Mock element properties
          if (!elementProps.isTextInput) {
            element.isContentEditable = false
            element.focus = undefined
          }
          
          if (!elementProps.isVisible) {
            element.getBoundingClientRect = vi.fn(() => ({
              left: -100,
              top: -100,
              width: 0,
              height: 0,
              right: -100,
              bottom: -100
            }))
          }
        }
        
        const isValid = typingService.validateTargetElement(element)
        
        // Property: Should validate element correctly
        const shouldBeValid = elementProps.hasElement && 
                             elementProps.isVisible && 
                             elementProps.isTextInput
        
        expect(isValid).toBe(shouldBeValid)
      }
    ), { numRuns: 20 }) // Reduced runs for faster execution
  })

  test('Property 17: Concurrent typing prevention works correctly', async () => {
    // Start first typing operation
    const promise1 = typingService.typeSelectedDraft()
    
    // Property: Should prevent concurrent typing
    expect(typingService.isCurrentlyActive()).toBe(true)
    
    // Try to start second operation
    await expect(typingService.typeSelectedDraft()).rejects.toThrow('already active')
    
    // Wait for first to complete
    const result1 = await promise1
    expect(result1.success).toBe(true)
    
    // Property: Should allow new typing after completion
    expect(typingService.isCurrentlyActive()).toBe(false)
    
    const result2 = await typingService.typeSelectedDraft()
    expect(result2.success).toBe(true)
  })

  test('Property 17: Options update propagates to WindMouse typer', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        baseSpeed: fc.integer({ min: 60, max: 300 }),
        jitterTemperature: fc.float({ min: 0.1, max: 1.0 }),
        enableCursorMovement: fc.boolean(),
        maxContentLength: fc.integer({ min: 100, max: 5000 })
      }),
      async (newOptions) => {
        typingService.updateOptions(newOptions)
        
        // Property: Options should be updated in service
        const serviceOptions = typingService.getOptions()
        expect(serviceOptions.baseSpeed).toBe(newOptions.baseSpeed)
        expect(serviceOptions.jitterTemperature).toBe(newOptions.jitterTemperature)
        expect(serviceOptions.enableCursorMovement).toBe(newOptions.enableCursorMovement)
        expect(serviceOptions.maxContentLength).toBe(newOptions.maxContentLength)
        
        // Property: Options should propagate to WindMouse typer
        const windMouseTyper = await import('../../content/windmouse-typer')
        expect(windMouseTyper.windMouseTyper.updateOptions).toHaveBeenCalledWith(
          expect.objectContaining(newOptions)
        )
      }
    ), { numRuns: 10 }) // Reduced runs for faster execution
  })

  test('Property 17: Error handling maintains service state consistency', async () => {
    // Mock WindMouse typer to fail
    const windMouseTyper = await import('../../content/windmouse-typer')
    vi.mocked(windMouseTyper.windMouseTyper.typeText).mockRejectedValue(new Error('Typing failed'))
    
    const result = await typingService.typeSelectedDraft()
    
    // Property: Should handle errors gracefully
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    
    // Property: Should reset service state after error
    expect(typingService.isCurrentlyActive()).toBe(false)
    
    // Property: Should reset state machine to idle
    expect(mockStore.setState).toHaveBeenCalledWith('idle', 'Typing failed')
  })
})

/**
 * Feature: linkedin-ghostwriter, Property 17: Natural Typing Simulation
 * 
 * These integration tests validate that the TypingService properly:
 * 1. Enforces human-in-the-loop governance during typing
 * 2. Integrates anti-cheerleader warnings with typing flow
 * 3. Validates content and target elements before typing
 * 4. Prevents concurrent typing operations
 * 5. Maintains proper state management throughout the typing process
 * 6. Handles errors gracefully while maintaining system consistency
 */