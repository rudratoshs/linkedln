/**
 * WindMouse Typing Simulation
 * 
 * Implements natural human-like typing behavior with Gaussian jitter,
 * realistic dwell times, and WindMouse cursor movement algorithm.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

export interface TypingOptions {
  /**
   * Base typing speed in characters per minute (default: 180)
   */
  baseSpeed?: number
  
  /**
   * Temperature for Gaussian jitter (default: 0.3)
   */
  jitterTemperature?: number
  
  /**
   * Minimum dwell time between keystrokes in ms (default: 20)
   */
  minDwellTime?: number
  
  /**
   * Maximum dwell time between keystrokes in ms (default: 200)
   */
  maxDwellTime?: number
  
  /**
   * Probability of longer thinking pauses (default: 0.05)
   */
  thinkingPauseProbability?: number
  
  /**
   * Range for thinking pause duration in ms (default: [200, 800])
   */
  thinkingPauseRange?: [number, number]
  
  /**
   * Enable WindMouse cursor movement (default: true)
   */
  enableCursorMovement?: boolean
  
  /**
   * WindMouse movement parameters
   */
  windMouse?: {
    gravity?: number
    wind?: number
    minWait?: number
    maxWait?: number
    maxStep?: number
    targetArea?: number
  }
}

export interface TypingEvent {
  type: 'keypress' | 'pause' | 'cursor-move' | 'complete' | 'error'
  character?: string
  duration?: number
  position?: { x: number; y: number }
  timestamp: number
}

export interface TypingResult {
  success: boolean
  totalTime: number
  characterCount: number
  events: TypingEvent[]
  error?: Error
}

/**
 * WindMouse Typer class for natural typing simulation
 */
export class WindMouseTyper {
  private readonly options: Required<TypingOptions>
  private isTyping = false
  private currentTarget: HTMLElement | null = null
  
  constructor(options: TypingOptions = {}) {
    this.options = {
      baseSpeed: 180, // characters per minute
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
      ...options
    }
  }

  /**
   * Type text into target element with natural human-like behavior
   */
  async typeText(text: string, targetElement: HTMLElement): Promise<TypingResult> {
    if (this.isTyping) {
      throw new Error('WindMouseTyper is already typing - wait for completion')
    }

    this.isTyping = true
    this.currentTarget = targetElement
    
    const startTime = Date.now()
    const events: TypingEvent[] = []
    
    try {
      // Focus the target element
      await this.focusElement(targetElement)
      
      // Clear existing content if needed
      await this.clearElement(targetElement)
      
      // Type each character with natural timing
      const characters = text.split('')
      
      for (let i = 0; i < characters.length; i++) {
        const char = characters[i]
        
        // Calculate typing delay with Gaussian jitter
        const delay = this.calculateTypingDelay(char, i, characters.length)
        
        // Add thinking pause occasionally
        if (Math.random() < this.options.thinkingPauseProbability) {
          const pauseDuration = this.generateThinkingPause()
          await this.sleep(pauseDuration)
          
          events.push({
            type: 'pause',
            duration: pauseDuration,
            timestamp: Date.now()
          })
        }
        
        // Move cursor with WindMouse if enabled
        if (this.options.enableCursorMovement && i % 5 === 0) {
          const cursorEvent = await this.moveCursorNaturally(targetElement)
          if (cursorEvent) {
            events.push(cursorEvent)
          }
        }
        
        // Simulate keypress
        await this.simulateKeypress(char, targetElement)
        
        events.push({
          type: 'keypress',
          character: char,
          duration: delay,
          timestamp: Date.now()
        })
        
        // Wait for calculated delay
        await this.sleep(delay)
      }
      
      const totalTime = Date.now() - startTime
      
      events.push({
        type: 'complete',
        timestamp: Date.now()
      })
      
      return {
        success: true,
        totalTime,
        characterCount: text.length,
        events
      }
      
    } catch (error) {
      const errorEvent: TypingEvent = {
        type: 'error',
        timestamp: Date.now()
      }
      events.push(errorEvent)
      
      return {
        success: false,
        totalTime: Date.now() - startTime,
        characterCount: 0,
        events,
        error: error as Error
      }
      
    } finally {
      this.isTyping = false
      this.currentTarget = null
    }
  }

  /**
   * Calculate typing delay with Gaussian jitter and natural variations
   */
  private calculateTypingDelay(char: string, position: number, totalLength: number): number {
    // Base delay from typing speed (convert CPM to ms per character)
    const baseDelay = (60 * 1000) / this.options.baseSpeed
    
    // Character-specific adjustments
    let charMultiplier = 1.0
    
    // Slower for punctuation and special characters
    if (/[.,!?;:]/.test(char)) {
      charMultiplier = 1.3
    } else if (/[(){}[\]"']/.test(char)) {
      charMultiplier = 1.5
    } else if (/[0-9]/.test(char)) {
      charMultiplier = 1.1
    } else if (char === ' ') {
      charMultiplier = 0.8 // Spaces are faster
    }
    
    // Position-based adjustments (slower at beginning, faster in middle)
    const positionRatio = position / totalLength
    let positionMultiplier = 1.0
    
    if (positionRatio < 0.1) {
      positionMultiplier = 1.4 // Slower start
    } else if (positionRatio > 0.9) {
      positionMultiplier = 1.2 // Slower finish
    } else {
      positionMultiplier = 0.9 // Faster in middle
    }
    
    // Apply Gaussian jitter
    const jitteredDelay = baseDelay * charMultiplier * positionMultiplier
    const jitter = this.gaussianRandom(0, jitteredDelay * this.options.jitterTemperature)
    
    // Ensure delay is within bounds
    const finalDelay = Math.max(
      this.options.minDwellTime,
      Math.min(this.options.maxDwellTime, jitteredDelay + jitter)
    )
    
    return Math.round(finalDelay)
  }

  /**
   * Generate Gaussian random number using Box-Muller transform
   */
  private gaussianRandom(mean: number, stdDev: number): number {
    // Box-Muller transform for Gaussian distribution
    const u1 = Math.random()
    const u2 = Math.random()
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    return z0 * stdDev + mean
  }

  /**
   * Generate thinking pause duration
   */
  private generateThinkingPause(): number {
    const [min, max] = this.options.thinkingPauseRange
    const range = max - min
    const jitter = this.gaussianRandom(0, range * 0.2)
    return Math.max(min, Math.min(max, min + (range * Math.random()) + jitter))
  }

  /**
   * Focus element with natural cursor movement
   */
  private async focusElement(element: HTMLElement): Promise<void> {
    // Move cursor to element if WindMouse is enabled
    if (this.options.enableCursorMovement) {
      await this.moveCursorToElement(element)
    }
    
    // Focus the element
    element.focus()
    
    // Small delay after focus
    await this.sleep(this.gaussianRandom(50, 20))
  }

  /**
   * Clear element content naturally
   */
  private async clearElement(element: HTMLElement): Promise<void> {
    // Check if element has content
    const hasContent = element.textContent && element.textContent.length > 0
    
    if (hasContent) {
      // Select all content first
      if (element.isContentEditable) {
        const selection = window.getSelection()
        const range = document.createRange()
        range.selectNodeContents(element)
        selection?.removeAllRanges()
        selection?.addRange(range)
      } else if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        element.select()
      }
      
      // Small delay before clearing
      await this.sleep(this.gaussianRandom(100, 30))
      
      // Clear content
      if (element.isContentEditable) {
        element.textContent = ''
      } else if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        element.value = ''
      }
    }
  }

  /**
   * Simulate keypress with proper event dispatching
   */
  private async simulateKeypress(char: string, element: HTMLElement): Promise<void> {
    // Create keyboard events
    const keydownEvent = new KeyboardEvent('keydown', {
      key: char,
      code: this.getKeyCode(char),
      bubbles: true,
      cancelable: true
    })
    
    const keypressEvent = new KeyboardEvent('keypress', {
      key: char,
      code: this.getKeyCode(char),
      bubbles: true,
      cancelable: true
    })
    
    const inputEvent = new InputEvent('input', {
      data: char,
      inputType: 'insertText',
      bubbles: true,
      cancelable: true
    })
    
    const keyupEvent = new KeyboardEvent('keyup', {
      key: char,
      code: this.getKeyCode(char),
      bubbles: true,
      cancelable: true
    })
    
    // Dispatch events in sequence
    element.dispatchEvent(keydownEvent)
    
    // Small delay between keydown and keypress
    await this.sleep(this.gaussianRandom(5, 2))
    
    element.dispatchEvent(keypressEvent)
    
    // Insert character into element
    this.insertCharacter(char, element)
    
    // Dispatch input event
    element.dispatchEvent(inputEvent)
    
    // Small delay before keyup
    await this.sleep(this.gaussianRandom(10, 3))
    
    element.dispatchEvent(keyupEvent)
  }

  /**
   * Insert character into element
   */
  private insertCharacter(char: string, element: HTMLElement): void {
    if (element.isContentEditable) {
      // For contenteditable elements, insert at cursor position
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        range.deleteContents()
        range.insertNode(document.createTextNode(char))
        range.collapse(false)
        selection.removeAllRanges()
        selection.addRange(range)
      } else {
        // Fallback: append to end
        element.textContent = (element.textContent || '') + char
      }
    } else if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      // For input/textarea elements
      const start = element.selectionStart || 0
      const end = element.selectionEnd || 0
      const value = element.value
      
      element.value = value.substring(0, start) + char + value.substring(end)
      element.selectionStart = element.selectionEnd = start + 1
    }
  }

  /**
   * Get key code for character
   */
  private getKeyCode(char: string): string {
    // Map common characters to key codes
    const keyMap: Record<string, string> = {
      ' ': 'Space',
      '\n': 'Enter',
      '\t': 'Tab',
      'a': 'KeyA', 'b': 'KeyB', 'c': 'KeyC', 'd': 'KeyD', 'e': 'KeyE',
      'f': 'KeyF', 'g': 'KeyG', 'h': 'KeyH', 'i': 'KeyI', 'j': 'KeyJ',
      'k': 'KeyK', 'l': 'KeyL', 'm': 'KeyM', 'n': 'KeyN', 'o': 'KeyO',
      'p': 'KeyP', 'q': 'KeyQ', 'r': 'KeyR', 's': 'KeyS', 't': 'KeyT',
      'u': 'KeyU', 'v': 'KeyV', 'w': 'KeyW', 'x': 'KeyX', 'y': 'KeyY', 'z': 'KeyZ',
      '0': 'Digit0', '1': 'Digit1', '2': 'Digit2', '3': 'Digit3', '4': 'Digit4',
      '5': 'Digit5', '6': 'Digit6', '7': 'Digit7', '8': 'Digit8', '9': 'Digit9',
      '.': 'Period', ',': 'Comma', '!': 'Digit1', '?': 'Slash',
      ';': 'Semicolon', ':': 'Semicolon', "'": 'Quote', '"': 'Quote'
    }
    
    return keyMap[char.toLowerCase()] || 'Unidentified'
  }

  /**
   * Move cursor naturally using WindMouse algorithm
   */
  private async moveCursorNaturally(targetElement: HTMLElement): Promise<TypingEvent | null> {
    if (!this.options.enableCursorMovement) {
      return null
    }
    
    try {
      const rect = targetElement.getBoundingClientRect()
      const currentX = rect.left + (rect.width * Math.random())
      const currentY = rect.top + (rect.height * Math.random())
      
      // Small random movement within the element
      const targetX = rect.left + (rect.width * Math.random())
      const targetY = rect.top + (rect.height * Math.random())
      
      await this.windMouseMove(currentX, currentY, targetX, targetY)
      
      return {
        type: 'cursor-move',
        position: { x: targetX, y: targetY },
        timestamp: Date.now()
      }
    } catch (error) {
      console.warn('WindMouse cursor movement failed:', error)
      return null
    }
  }

  /**
   * Move cursor to element using WindMouse algorithm
   */
  private async moveCursorToElement(element: HTMLElement): Promise<void> {
    const rect = element.getBoundingClientRect()
    const targetX = rect.left + (rect.width / 2)
    const targetY = rect.top + (rect.height / 2)
    
    // Get current cursor position (approximate)
    const currentX = window.innerWidth / 2
    const currentY = window.innerHeight / 2
    
    await this.windMouseMove(currentX, currentY, targetX, targetY)
  }

  /**
   * WindMouse algorithm for natural cursor movement
   */
  private async windMouseMove(startX: number, startY: number, endX: number, endY: number): Promise<void> {
    const { gravity, wind, minWait, maxWait, maxStep, targetArea } = this.options.windMouse
    
    let currentX = startX
    let currentY = startY
    let velocityX = 0
    let velocityY = 0
    
    while (Math.sqrt(Math.pow(endX - currentX, 2) + Math.pow(endY - currentY, 2)) > targetArea) {
      // Calculate distance to target
      const distance = Math.sqrt(Math.pow(endX - currentX, 2) + Math.pow(endY - currentY, 2))
      
      // Calculate wind effect
      const windX = (Math.random() - 0.5) * wind
      const windY = (Math.random() - 0.5) * wind
      
      // Calculate gravity effect
      const gravityX = (endX - currentX) / distance * gravity
      const gravityY = (endY - currentY) / distance * gravity
      
      // Update velocity
      velocityX += windX + gravityX
      velocityY += windY + gravityY
      
      // Limit velocity
      const velocityMagnitude = Math.sqrt(velocityX * velocityX + velocityY * velocityY)
      if (velocityMagnitude > maxStep) {
        velocityX = (velocityX / velocityMagnitude) * maxStep
        velocityY = (velocityY / velocityMagnitude) * maxStep
      }
      
      // Update position
      currentX += velocityX
      currentY += velocityY
      
      // Wait between movements
      const waitTime = Math.random() * (maxWait - minWait) + minWait
      await this.sleep(waitTime)
    }
  }

  /**
   * Sleep for specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Check if currently typing
   */
  isCurrentlyTyping(): boolean {
    return this.isTyping
  }

  /**
   * Get current target element
   */
  getCurrentTarget(): HTMLElement | null {
    return this.currentTarget
  }

  /**
   * Stop typing (if in progress)
   */
  stopTyping(): void {
    this.isTyping = false
    this.currentTarget = null
  }

  /**
   * Update typing options
   */
  updateOptions(options: Partial<TypingOptions>): void {
    Object.assign(this.options, options)
  }

  /**
   * Get current typing options
   */
  getOptions(): Required<TypingOptions> {
    return { ...this.options }
  }
}

// Export singleton instance
export const windMouseTyper = new WindMouseTyper()