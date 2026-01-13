/**
 * Typing Service
 * 
 * Integrates WindMouse typing simulation with PostPhantom state management
 * and human-in-the-loop governance.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { windMouseTyper, TypingOptions, TypingResult } from '../content/windmouse-typer'
import { useAppStore } from '../store/app-store'

export interface TypingServiceOptions extends TypingOptions {
  /**
   * Enable anti-cheerleader checking before typing (default: true)
   */
  enableAntiCheerleaderCheck?: boolean
  
  /**
   * Require explicit user confirmation before typing (default: true)
   */
  requireUserConfirmation?: boolean
  
  /**
   * Maximum content length to type (default: 2000)
   */
  maxContentLength?: number
}

export interface TypingServiceResult extends TypingResult {
  /**
   * Whether anti-cheerleader warning was shown
   */
  cheerleaderWarningShown?: boolean
  
  /**
   * Whether user confirmation was required and obtained
   */
  userConfirmationObtained?: boolean
  
  /**
   * State machine transitions during typing
   */
  stateTransitions?: string[]
}

/**
 * Typing Service class for managing natural typing with governance
 */
export class TypingService {
  private readonly options: Required<TypingServiceOptions>
  private isActive = false
  
  constructor(options: TypingServiceOptions = {}) {
    this.options = {
      // WindMouse typing options
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
      },
      
      // Typing service specific options
      enableAntiCheerleaderCheck: true,
      requireUserConfirmation: true,
      maxContentLength: 2000,
      
      ...options
    }
    
    // Update WindMouse typer with options
    windMouseTyper.updateOptions(this.options)
  }

  /**
   * Type selected draft content with full governance checks
   */
  async typeSelectedDraft(): Promise<TypingServiceResult> {
    if (this.isActive) {
      throw new Error('TypingService is already active')
    }

    this.isActive = true
    const stateTransitions: string[] = []
    
    try {
      const store = useAppStore.getState()
      
      // Validate state machine allows typing
      if (!store.canStartTyping()) {
        throw new Error('State machine does not allow typing in current state')
      }
      
      // Get selected draft
      const selectedDraft = store.selectedDraft
      if (!selectedDraft) {
        throw new Error('No draft selected for typing')
      }
      
      // Get current post element
      const targetElement = store.currentPostElement
      if (!targetElement) {
        throw new Error('No target element available for typing')
      }
      
      // Validate content length
      if (selectedDraft.content.length > this.options.maxContentLength) {
        throw new Error(`Content too long: ${selectedDraft.content.length} > ${this.options.maxContentLength}`)
      }
      
      let cheerleaderWarningShown = false
      let userConfirmationObtained = false
      
      // Anti-cheerleader check
      if (this.options.enableAntiCheerleaderCheck) {
        if (store.checkForCheerleaderContent(selectedDraft.content)) {
          store.showCheerleaderWarning(selectedDraft.content)
          cheerleaderWarningShown = true
          
          // In a real implementation, this would wait for user decision
          // For now, we'll proceed but log the warning
          console.warn('Anti-cheerleader warning shown for content:', selectedDraft.content.substring(0, 50))
        }
      }
      
      // User confirmation (in real implementation, this would show a modal)
      if (this.options.requireUserConfirmation) {
        userConfirmationObtained = await this.requestUserConfirmation(selectedDraft.content)
        if (!userConfirmationObtained) {
          throw new Error('User confirmation required but not obtained')
        }
      }
      
      // Transition to typing state
      const transitionSuccess = store.setState('typing', 'Starting natural typing simulation')
      if (!transitionSuccess) {
        throw new Error('Failed to transition to typing state')
      }
      stateTransitions.push('typing')
      
      // Perform natural typing
      const typingResult = await windMouseTyper.typeText(selectedDraft.content, targetElement)
      
      // Transition back to idle state
      store.setState('idle', 'Typing completed')
      stateTransitions.push('idle')
      
      // Clear drafts after successful typing
      store.clearDrafts()
      
      return {
        ...typingResult,
        cheerleaderWarningShown,
        userConfirmationObtained,
        stateTransitions
      }
      
    } catch (error) {
      // Ensure we return to idle state on error
      const store = useAppStore.getState()
      store.setState('idle', 'Typing failed')
      stateTransitions.push('idle')
      
      return {
        success: false,
        totalTime: 0,
        characterCount: 0,
        events: [],
        error: error as Error,
        cheerleaderWarningShown: false,
        userConfirmationObtained: false,
        stateTransitions
      }
      
    } finally {
      this.isActive = false
    }
  }

  /**
   * Type custom content (bypasses draft selection)
   */
  async typeCustomContent(content: string, targetElement: HTMLElement): Promise<TypingServiceResult> {
    if (this.isActive) {
      throw new Error('TypingService is already active')
    }

    this.isActive = true
    const stateTransitions: string[] = []
    
    try {
      const store = useAppStore.getState()
      
      // Validate content length
      if (content.length > this.options.maxContentLength) {
        throw new Error(`Content too long: ${content.length} > ${this.options.maxContentLength}`)
      }
      
      let cheerleaderWarningShown = false
      let userConfirmationObtained = false
      
      // Anti-cheerleader check
      if (this.options.enableAntiCheerleaderCheck) {
        if (store.checkForCheerleaderContent(content)) {
          store.showCheerleaderWarning(content)
          cheerleaderWarningShown = true
        }
      }
      
      // User confirmation
      if (this.options.requireUserConfirmation) {
        userConfirmationObtained = await this.requestUserConfirmation(content)
        if (!userConfirmationObtained) {
          throw new Error('User confirmation required but not obtained')
        }
      }
      
      // Perform natural typing
      const typingResult = await windMouseTyper.typeText(content, targetElement)
      
      return {
        ...typingResult,
        cheerleaderWarningShown,
        userConfirmationObtained,
        stateTransitions
      }
      
    } catch (error) {
      return {
        success: false,
        totalTime: 0,
        characterCount: 0,
        events: [],
        error: error as Error,
        cheerleaderWarningShown: false,
        userConfirmationObtained: false,
        stateTransitions
      }
      
    } finally {
      this.isActive = false
    }
  }

  /**
   * Request user confirmation for typing (placeholder implementation)
   */
  private async requestUserConfirmation(content: string): Promise<boolean> {
    // In a real implementation, this would show a modal dialog
    // For now, we'll simulate user confirmation
    console.log('Requesting user confirmation for typing:', content.substring(0, 50))
    
    // Simulate async user interaction
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // For testing purposes, always return true
    // In production, this would wait for actual user input
    return true
  }

  /**
   * Stop typing if in progress
   */
  stopTyping(): void {
    if (this.isActive) {
      windMouseTyper.stopTyping()
      this.isActive = false
      
      // Reset state machine
      const store = useAppStore.getState()
      store.setState('idle', 'Typing stopped by user')
    }
  }

  /**
   * Check if typing service is currently active
   */
  isCurrentlyActive(): boolean {
    return this.isActive
  }

  /**
   * Update typing options
   */
  updateOptions(options: Partial<TypingServiceOptions>): void {
    Object.assign(this.options, options)
    windMouseTyper.updateOptions(this.options)
  }

  /**
   * Get current typing options
   */
  getOptions(): Required<TypingServiceOptions> {
    return { ...this.options }
  }

  /**
   * Validate target element for typing
   */
  validateTargetElement(element: HTMLElement): boolean {
    // Check if element is focusable
    if (!element.focus) {
      return false
    }
    
    // Check if element accepts text input
    const isTextInput = element instanceof HTMLInputElement || 
                       element instanceof HTMLTextAreaElement ||
                       element.isContentEditable
    
    if (!isTextInput) {
      return false
    }
    
    // Check if element is visible and in viewport
    const rect = element.getBoundingClientRect()
    const isVisible = rect.width > 0 && rect.height > 0 &&
                     rect.top >= 0 && rect.left >= 0 &&
                     rect.bottom <= window.innerHeight &&
                     rect.right <= window.innerWidth
    
    return isVisible
  }

  /**
   * Get typing statistics for the current session
   */
  getTypingStats(): {
    isActive: boolean
    currentTarget: HTMLElement | null
    windMouseOptions: Required<TypingOptions>
  } {
    return {
      isActive: this.isActive,
      currentTarget: windMouseTyper.getCurrentTarget(),
      windMouseOptions: windMouseTyper.getOptions()
    }
  }
}

// Export singleton instance
export const typingService = new TypingService()