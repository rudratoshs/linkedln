import { describe, test, expect, vi, beforeEach } from 'vitest'
import fc from 'fast-check'
import { PostPhantomStateMachine, StateMachineValidator, AppState } from '../state-machine'

describe('PostPhantom State Machine Property Tests', () => {
  let stateMachine: PostPhantomStateMachine
  let onStateChangeMock: ReturnType<typeof vi.fn>
  let onInvalidTransitionMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onStateChangeMock = vi.fn()
    onInvalidTransitionMock = vi.fn()
    stateMachine = new PostPhantomStateMachine({
      onStateChange: onStateChangeMock,
      onInvalidTransition: onInvalidTransitionMock
    })
  })

  /**
   * Property 11: Human-in-the-Loop Enforcement
   * For any state machine instance, it should never allow automatic posting
   * and should require explicit user selection of drafts
   */
  test('Property 11: Human-in-the-Loop Enforcement', () => {
    fc.assert(fc.property(
      fc.constantFrom('idle', 'scanning', 'drafting', 'review', 'typing'),
      (currentState: AppState) => {
        // Reset to test state
        stateMachine.reset()
        if (currentState !== 'idle') {
          // Force to desired state for testing (bypassing normal validation)
          stateMachine['currentState'] = currentState
        }

        // Property: Should never allow automatic posting
        expect(stateMachine.canAutoPost()).toBe(false)

        // Property: Draft selection validation requires explicit user action
        const userActionRequired = StateMachineValidator.validateDraftSelection(
          stateMachine, 
          false // false = not explicit user action
        )
        
        if (currentState === 'review') {
          expect(userActionRequired).toBe(false) // Should reject non-explicit actions
        }

        const explicitUserAction = StateMachineValidator.validateDraftSelection(
          stateMachine,
          true // true = explicit user action
        )
        
        if (currentState === 'review') {
          expect(explicitUserAction).toBe(true) // Should allow explicit actions
        }
      }
    ), { numRuns: 100 })
  })

  /**
   * Property 14: State Machine Compliance
   * For any sequence of state transitions, the state machine should enforce
   * the correct flow: Idle → Scanning → Drafting → Review → Typing
   */
  test('Property 14: State Machine Compliance', () => {
    fc.assert(fc.property(
      fc.array(fc.constantFrom('idle', 'scanning', 'drafting', 'review', 'typing'), { 
        minLength: 1, 
        maxLength: 10 
      }),
      (attemptedStates: AppState[]) => {
        // Reset state machine
        stateMachine.reset()
        let currentState = stateMachine.getCurrentState()
        
        for (const targetState of attemptedStates) {
          const transitionResult = stateMachine.transition(targetState)
          const newState = stateMachine.getCurrentState()
          
          // Property: Valid transitions should succeed and change state
          if (transitionResult) {
            expect(newState).toBe(targetState)
          } else {
            // Property: Invalid transitions should not change state
            expect(newState).toBe(currentState)
          }
          
          currentState = newState
        }

        // Property: Should never skip review state when going from drafting to typing
        const history = stateMachine.getTransitionHistory()
        for (let i = 0; i < history.length - 1; i++) {
          const transition = history[i]
          if (transition.from === 'drafting' && transition.to === 'typing') {
            // This should never happen - must go through review
            expect(false).toBe(true) // Fail if this invalid transition occurred
          }
        }
      }
    ), { numRuns: 100 })
  })

  test('Property 14.1: Valid State Transitions Only', () => {
    fc.assert(fc.property(
      fc.constantFrom('idle', 'scanning', 'drafting', 'review', 'typing'),
      fc.constantFrom('idle', 'scanning', 'drafting', 'review', 'typing'),
      (fromState: AppState, toState: AppState) => {
        // Reset and set initial state
        stateMachine.reset()
        if (fromState !== 'idle') {
          stateMachine['currentState'] = fromState
        }

        const result = stateMachine.transition(toState)
        
        // Define valid transitions
        const validTransitions: Record<AppState, AppState[]> = {
          idle: ['scanning'],
          scanning: ['drafting', 'idle'],
          drafting: ['review', 'idle'],
          review: ['typing', 'idle', 'drafting'],
          typing: ['idle']
        }

        const isValidTransition = validTransitions[fromState].includes(toState)
        
        // Property: Transition result should match validity
        expect(result).toBe(isValidTransition)
        
        // Property: State should only change on valid transitions
        if (isValidTransition) {
          expect(stateMachine.getCurrentState()).toBe(toState)
        } else {
          expect(stateMachine.getCurrentState()).toBe(fromState)
        }
      }
    ), { numRuns: 100 })
  })

  test('Property 14.2: Typing State Validation', () => {
    fc.assert(fc.property(
      fc.boolean(),
      (hasSelectedDraft: boolean) => {
        // Set up state machine in review state
        stateMachine.reset()
        stateMachine.transition('scanning')
        stateMachine.transition('drafting')
        stateMachine.transition('review')

        // Property: Typing validation should require both correct state and selected draft
        const canStartTyping = StateMachineValidator.validateTypingStart(
          stateMachine,
          hasSelectedDraft
        )

        expect(canStartTyping).toBe(hasSelectedDraft && stateMachine.canStartTyping())
      }
    ), { numRuns: 100 })
  })

  test('Property 11.1: No Auto-Posting Enforcement', () => {
    fc.assert(fc.property(
      fc.array(fc.constantFrom('idle', 'scanning', 'drafting', 'review', 'typing'), {
        minLength: 1,
        maxLength: 5
      }),
      (stateSequence: AppState[]) => {
        stateMachine.reset()
        
        // Go through any sequence of states
        for (const state of stateSequence) {
          stateMachine.transition(state)
        }

        // Property: Should never allow auto-posting regardless of state
        expect(StateMachineValidator.validateNoAutoPosting(stateMachine)).toBe(true)
        expect(stateMachine.canAutoPost()).toBe(false)
      }
    ), { numRuns: 100 })
  })

  // Unit tests for specific edge cases
  describe('Unit Tests - Edge Cases', () => {
    test('should prevent direct drafting to typing transition', () => {
      stateMachine.reset()
      stateMachine.transition('scanning')
      stateMachine.transition('drafting')
      
      // Attempt invalid transition
      const result = stateMachine.transition('typing')
      
      expect(result).toBe(false)
      expect(stateMachine.getCurrentState()).toBe('drafting')
      expect(onInvalidTransitionMock).toHaveBeenCalled()
    })

    test('should allow editing by going back to drafting from review', () => {
      stateMachine.reset()
      stateMachine.transition('scanning')
      stateMachine.transition('drafting')
      stateMachine.transition('review')
      
      // Should allow going back to drafting for editing
      const result = stateMachine.transition('drafting')
      
      expect(result).toBe(true)
      expect(stateMachine.getCurrentState()).toBe('drafting')
    })

    test('should track transition history', () => {
      stateMachine.reset()
      stateMachine.transition('scanning')
      stateMachine.transition('drafting')
      
      const history = stateMachine.getTransitionHistory()
      
      expect(history).toHaveLength(3) // reset + 2 transitions
      expect(history[1].from).toBe('idle')
      expect(history[1].to).toBe('scanning')
      expect(history[2].from).toBe('scanning')
      expect(history[2].to).toBe('drafting')
    })

    test('should validate state-specific capabilities', () => {
      stateMachine.reset()
      
      // Idle state
      expect(stateMachine.canGenerateDrafts()).toBe(false)
      expect(stateMachine.canSelectDraft()).toBe(false)
      expect(stateMachine.canStartTyping()).toBe(false)
      
      // Scanning state
      stateMachine.transition('scanning')
      expect(stateMachine.canGenerateDrafts()).toBe(true)
      expect(stateMachine.canSelectDraft()).toBe(false)
      expect(stateMachine.canStartTyping()).toBe(false)
      
      // Review state
      stateMachine.transition('drafting')
      stateMachine.transition('review')
      expect(stateMachine.canGenerateDrafts()).toBe(false)
      expect(stateMachine.canSelectDraft()).toBe(true)
      expect(stateMachine.canStartTyping()).toBe(true)
    })
  })
})

// **Feature: linkedin-ghostwriter, Property 11: Human-in-the-Loop Enforcement**
// **Feature: linkedin-ghostwriter, Property 14: State Machine Compliance**