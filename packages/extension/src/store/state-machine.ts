/**
 * Human-in-the-Loop State Machine for PostPhantom
 * Enforces strict governance: Idle → Scanning → Drafting → Review → Typing
 * Requirements: 5.1, 5.3, 5.5
 */

export type AppState = 'idle' | 'scanning' | 'drafting' | 'review' | 'typing'

export interface StateTransition {
  from: AppState
  to: AppState
  timestamp: number
  reason?: string
}

export interface StateMachineConfig {
  onStateChange?: (transition: StateTransition) => void
  onInvalidTransition?: (attempted: StateTransition) => void
}

export class PostPhantomStateMachine {
  private currentState: AppState = 'idle'
  private transitionHistory: StateTransition[] = []
  private config: StateMachineConfig

  // Valid state transitions - enforces human-in-the-loop governance
  private readonly validTransitions: Record<AppState, AppState[]> = {
    idle: ['scanning'],
    scanning: ['drafting', 'idle'],
    drafting: ['review', 'idle'], // Must go to review, never directly to typing
    review: ['typing', 'idle', 'drafting'], // Can edit (back to drafting) or proceed to typing
    typing: ['idle'] // After typing, return to idle
  }

  constructor(config: StateMachineConfig = {}) {
    this.config = config
  }

  getCurrentState(): AppState {
    return this.currentState
  }

  getTransitionHistory(): StateTransition[] {
    return [...this.transitionHistory]
  }

  /**
   * Attempt to transition to a new state
   * Enforces human-in-the-loop governance by validating transitions
   */
  transition(to: AppState, reason?: string): boolean {
    const from = this.currentState
    
    // Check if transition is valid
    if (!this.isValidTransition(from, to)) {
      const attemptedTransition: StateTransition = {
        from,
        to,
        timestamp: Date.now(),
        reason: `Invalid transition: ${from} → ${to}`
      }
      
      this.config.onInvalidTransition?.(attemptedTransition)
      console.warn(`Invalid state transition attempted: ${from} → ${to}`)
      return false
    }

    // Perform the transition
    const transition: StateTransition = {
      from,
      to,
      timestamp: Date.now(),
      reason
    }

    this.currentState = to
    this.transitionHistory.push(transition)
    this.config.onStateChange?.(transition)
    
    console.log(`State transition: ${from} → ${to}${reason ? ` (${reason})` : ''}`)
    return true
  }

  /**
   * Check if a transition is valid according to human-in-the-loop rules
   */
  private isValidTransition(from: AppState, to: AppState): boolean {
    const allowedStates = this.validTransitions[from]
    return allowedStates.includes(to)
  }

  /**
   * Force transition to idle (emergency reset)
   */
  reset(reason = 'Manual reset'): void {
    const from = this.currentState
    this.currentState = 'idle'
    
    const transition: StateTransition = {
      from,
      to: 'idle',
      timestamp: Date.now(),
      reason
    }
    
    this.transitionHistory.push(transition)
    this.config.onStateChange?.(transition)
    console.log(`State machine reset: ${from} → idle (${reason})`)
  }

  /**
   * Validate that we're in the correct state for specific actions
   */
  canGenerateDrafts(): boolean {
    return this.currentState === 'scanning'
  }

  canSelectDraft(): boolean {
    return this.currentState === 'review'
  }

  canStartTyping(): boolean {
    return this.currentState === 'review'
  }

  /**
   * Enforce human-in-the-loop: never allow automatic posting
   */
  canAutoPost(): boolean {
    return false // Always false - human must explicitly approve
  }

  /**
   * Get valid next states from current state
   */
  getValidNextStates(): AppState[] {
    return this.validTransitions[this.currentState] || []
  }
}

/**
 * State machine validation helpers
 */
export class StateMachineValidator {
  /**
   * Validate that a draft selection requires explicit user action
   */
  static validateDraftSelection(
    stateMachine: PostPhantomStateMachine,
    userAction: boolean
  ): boolean {
    if (!stateMachine.canSelectDraft()) {
      return false
    }
    
    // Must be explicit user action, never automatic
    return userAction === true
  }

  /**
   * Validate that typing can only start after review
   */
  static validateTypingStart(
    stateMachine: PostPhantomStateMachine,
    hasSelectedDraft: boolean
  ): boolean {
    return stateMachine.canStartTyping() && hasSelectedDraft
  }

  /**
   * Ensure no automatic posting is ever allowed
   */
  static validateNoAutoPosting(stateMachine: PostPhantomStateMachine): boolean {
    return !stateMachine.canAutoPost()
  }
}