import { describe, test, expect, beforeEach } from 'vitest'
import fc from 'fast-check'
import { useAppStore } from '../app-store'
import { renderHook, act } from '@testing-library/react'

describe('App Store State Machine Integration Tests', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useAppStore())
    act(() => {
      result.current.resetState('Test reset')
      result.current.clearDrafts()
      result.current.setError(null)
    })
  })

  /**
   * Property 11: Human-in-the-Loop Enforcement in App Store
   * For any draft selection attempt, it should require explicit user action
   */
  test('Property 11: Draft Selection Requires Explicit User Action', () => {
    fc.assert(fc.property(
      fc.array(fc.record({
        id: fc.string(),
        content: fc.string({ minLength: 1 }),
        provider: fc.constantFrom('openai', 'gemini'),
        timestamp: fc.integer({ min: 0 }),
        selected: fc.boolean()
      }), { minLength: 1, maxLength: 5 }),
      fc.boolean(),
      (drafts, userAction) => {
        const { result } = renderHook(() => useAppStore())
        
        act(() => {
          // Set up drafts (this should transition to review state)
          result.current.setDrafts(drafts)
        })

        // Property: Draft selection should only succeed with explicit user action
        const draftId = drafts[0].id
        let selectionResult: boolean = false
        
        act(() => {
          selectionResult = result.current.selectDraft(draftId, userAction)
        })

        if (result.current.currentState === 'review') {
          expect(selectionResult).toBe(userAction) // Should match user action flag
        }

        // Property: Selected draft should only be set on successful selection
        if (selectionResult) {
          expect(result.current.selectedDraft?.id).toBe(draftId)
        }
      }
    ), { numRuns: 50 })
  })

  /**
   * Property 14: State Machine Integration
   * For any app store operations, state transitions should follow the state machine rules
   */
  test('Property 14: App Store State Transitions Follow Rules', () => {
    fc.assert(fc.property(
      fc.array(fc.record({
        id: fc.string(),
        content: fc.string({ minLength: 1 }),
        provider: fc.constantFrom('openai', 'gemini'),
        timestamp: fc.integer({ min: 0 }),
        selected: fc.boolean()
      }), { minLength: 1, maxLength: 3 }),
      (drafts) => {
        const { result } = renderHook(() => useAppStore())
        
        // Start from idle
        expect(result.current.currentState).toBe('idle')
        
        act(() => {
          // Simulate post element detection (should go to scanning)
          const mockElement = document.createElement('div')
          result.current.setCurrentPostElement(mockElement)
        })
        
        expect(result.current.currentState).toBe('scanning')
        
        act(() => {
          // Start generation (should go to drafting)
          result.current.setGenerating(true)
        })
        
        expect(result.current.currentState).toBe('drafting')
        
        act(() => {
          // Set drafts (should go to review)
          result.current.setDrafts(drafts)
        })
        
        expect(result.current.currentState).toBe('review')
        
        // Property: Should be able to select draft in review state
        expect(result.current.canSelectDraft()).toBe(true)
        expect(result.current.canStartTyping()).toBe(true)
        
        // Property: Should prevent auto-posting
        expect(result.current.preventAutoPosting()).toBe(true)
      }
    ), { numRuns: 50 })
  })

  test('Property 11.1: Auto-Posting Prevention', () => {
    fc.assert(fc.property(
      fc.constantFrom('idle', 'scanning', 'drafting', 'review', 'typing'),
      (targetState) => {
        const { result } = renderHook(() => useAppStore())
        
        // Force to target state (for testing purposes)
        act(() => {
          result.current.stateMachine['currentState'] = targetState
        })
        
        // Property: Should always prevent auto-posting regardless of state
        expect(result.current.preventAutoPosting()).toBe(true)
      }
    ), { numRuns: 100 })
  })

  // Unit tests for specific scenarios
  describe('Unit Tests - App Store Integration', () => {
    test('should enforce human-in-the-loop in draft selection', () => {
      const { result } = renderHook(() => useAppStore())
      
      const testDrafts = [
        {
          id: 'draft1',
          content: 'Test content',
          provider: 'openai',
          timestamp: Date.now(),
          selected: false
        }
      ]
      
      act(() => {
        result.current.setDrafts(testDrafts)
      })
      
      // Should reject non-explicit user action
      act(() => {
        const success = result.current.selectDraft('draft1', false)
        expect(success).toBe(false)
      })
      
      expect(result.current.selectedDraft).toBeNull()
      
      // Should accept explicit user action
      act(() => {
        const success = result.current.selectDraft('draft1', true)
        expect(success).toBe(true)
      })
      
      expect(result.current.selectedDraft?.id).toBe('draft1')
    })

    test('should validate state machine capabilities', () => {
      const { result } = renderHook(() => useAppStore())
      
      // Initial state - no capabilities
      expect(result.current.canGenerateDrafts()).toBe(false)
      expect(result.current.canSelectDraft()).toBe(false)
      expect(result.current.canStartTyping()).toBe(false)
      
      // Transition to scanning
      act(() => {
        const mockElement = document.createElement('div')
        result.current.setCurrentPostElement(mockElement)
      })
      
      expect(result.current.canGenerateDrafts()).toBe(true)
      expect(result.current.canSelectDraft()).toBe(false)
      
      // Transition through drafting to review
      act(() => {
        result.current.setGenerating(true)
        result.current.setDrafts([{
          id: 'test',
          content: 'Test',
          provider: 'openai',
          timestamp: Date.now(),
          selected: false
        }])
      })
      
      expect(result.current.canSelectDraft()).toBe(true)
      expect(result.current.canStartTyping()).toBe(true)
    })

    test('should handle invalid state transitions gracefully', () => {
      const { result } = renderHook(() => useAppStore())
      
      // Try invalid transition
      act(() => {
        const success = result.current.setState('typing', 'Invalid direct transition')
        expect(success).toBe(false)
      })
      
      // Should remain in idle state
      expect(result.current.currentState).toBe('idle')
      
      // Should have error set
      expect(result.current.error).toContain('Invalid state transition')
    })
  })
})

// **Feature: linkedin-ghostwriter, Property 11: Human-in-the-Loop Enforcement**
// **Feature: linkedin-ghostwriter, Property 14: State Machine Compliance**