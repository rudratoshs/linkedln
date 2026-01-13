/**
 * Comprehensive Error Handling Service for PostPhantom
 * Handles provider failures, moderation failures, and user feedback
 * Requirements: 3.4, 10.2
 */

export interface ErrorContext {
  userId?: string
  provider?: string
  requestId?: string
  operation?: string
  timestamp?: Date
}

export interface ErrorResponse {
  error: string
  message: string
  canRetry: boolean
  retryAfter?: number // seconds
  suggestions?: string[]
  metadata?: Record<string, any>
}

export interface ModerationFailure extends ErrorResponse {
  categories: string[]
  provider: 'openai' | 'gemini'
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface ProviderError extends Error {
  type: 'RATE_LIMIT_EXCEEDED' | 'MODERATION_FAILED' | 'PROVIDER_UNAVAILABLE' | 'INVALID_INPUT' | 'TIMEOUT' | 'UNKNOWN'
  provider?: string
  statusCode?: number
  retryAfter?: number
  originalError?: Error
}

export interface UIFeedbackOptions {
  showThinking?: boolean
  estimatedDuration?: number // milliseconds
  operation?: string
  onCancel?: () => void
}

export class ErrorHandler {
  private readonly maxRetries = 3
  private readonly baseRetryDelay = 1000 // 1 second

  /**
   * Handle provider-specific errors with appropriate user feedback
   * Requirement 3.4: Handle provider failures with appropriate user feedback
   */
  async handleProviderError(error: ProviderError, context: ErrorContext): Promise<ErrorResponse> {
    console.error('Provider error occurred:', {
      type: error.type,
      provider: error.provider,
      message: error.message,
      context
    })

    switch (error.type) {
      case 'RATE_LIMIT_EXCEEDED':
        return this.handleRateLimit(error, context)
      
      case 'MODERATION_FAILED':
        return this.handleModerationFailure(error, context)
      
      case 'PROVIDER_UNAVAILABLE':
        return this.handleProviderFailure(error, context)
      
      case 'INVALID_INPUT':
        return this.handleValidationError(error, context)
      
      case 'TIMEOUT':
        return this.handleTimeout(error, context)
      
      default:
        return this.handleUnknownError(error, context)
    }
  }

  /**
   * Handle rate limiting errors with clear user guidance
   */
  private handleRateLimit(error: ProviderError, context: ErrorContext): ErrorResponse {
    const retryAfter = error.retryAfter || 120 // Default 2 minutes

    if (error.message.includes('daily')) {
      return {
        error: 'DAILY_LIMIT_EXCEEDED',
        message: "You've reached your daily limit of 50 generations. Your limit will reset at midnight.",
        canRetry: false,
        suggestions: [
          'Try editing existing drafts instead of generating new ones',
          'Come back tomorrow for fresh generations',
          'Consider upgrading for higher limits'
        ],
        metadata: {
          resetAt: this.getNextMidnight(),
          remainingGenerations: 0
        }
      }
    }

    if (error.message.includes('hourly')) {
      return {
        error: 'HOURLY_LOCK_ACTIVE',
        message: 'You\'ve made too many requests recently. Please wait 30 minutes before trying again.',
        canRetry: true,
        retryAfter: 1800, // 30 minutes
        suggestions: [
          'Take a break and come back in 30 minutes',
          'Use this time to review and edit existing drafts'
        ],
        metadata: {
          lockExpiresAt: new Date(Date.now() + 30 * 60 * 1000)
        }
      }
    }

    return {
      error: 'COOLDOWN_ACTIVE',
      message: 'Please wait 2 minutes between requests to ensure quality responses.',
      canRetry: true,
      retryAfter,
      suggestions: [
        'Use this time to review the previous draft',
        'Consider editing the existing content instead'
      ],
      metadata: {
        cooldownExpiresAt: new Date(Date.now() + retryAfter * 1000)
      }
    }
  }

  /**
   * Handle moderation failures with constructive feedback
   * Requirement 3.4: Implement moderation failure responses
   */
  private handleModerationFailure(error: ProviderError, context: ErrorContext): ModerationFailure {
    const categories = this.extractModerationCategories(error.message)
    const severity = this.determineSeverity(categories)
    const provider = (context.provider as 'openai' | 'gemini') || 'openai'

    const result: ModerationFailure = {
      error: 'CONTENT_MODERATED',
      message: 'The generated content was flagged by our safety systems and cannot be used.',
      canRetry: true,
      categories,
      provider,
      severity,
      suggestions: this.getModerationSuggestions(categories),
      metadata: {
        flaggedCategories: categories,
        provider: context.provider,
        canModifyPrompt: true
      }
    }

    return result
  }

  /**
   * Handle provider unavailability with failover information
   */
  private handleProviderFailure(error: ProviderError, context: ErrorContext): ErrorResponse {
    return {
      error: 'PROVIDER_UNAVAILABLE',
      message: `The ${error.provider || 'AI'} service is temporarily unavailable. We're automatically trying an alternative provider.`,
      canRetry: true,
      retryAfter: 30,
      suggestions: [
        'The system will automatically retry with a different AI provider',
        'If the issue persists, try again in a few minutes',
        'Check your internet connection'
      ],
      metadata: {
        failedProvider: error.provider,
        statusCode: error.statusCode,
        willFailover: true
      }
    }
  }

  /**
   * Handle input validation errors
   */
  private handleValidationError(error: ProviderError, context: ErrorContext): ErrorResponse {
    return {
      error: 'INVALID_INPUT',
      message: 'There was an issue with your request. Please check your input and try again.',
      canRetry: true,
      suggestions: [
        'Make sure your message is not empty',
        'Check that any uploaded images are valid',
        'Try shortening your message if it\'s very long'
      ],
      metadata: {
        validationDetails: error.message
      }
    }
  }

  /**
   * Handle timeout errors
   */
  private handleTimeout(error: ProviderError, context: ErrorContext): ErrorResponse {
    return {
      error: 'REQUEST_TIMEOUT',
      message: 'The request took too long to process. This usually happens with very large or complex requests.',
      canRetry: true,
      retryAfter: 60,
      suggestions: [
        'Try shortening your message',
        'Remove any large images and try again',
        'Break complex requests into smaller parts'
      ],
      metadata: {
        timeoutDuration: error.retryAfter || 30000,
        provider: error.provider
      }
    }
  }

  /**
   * Handle unknown errors with generic guidance
   */
  private handleUnknownError(error: ProviderError, context: ErrorContext): ErrorResponse {
    return {
      error: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred. Please try again in a moment.',
      canRetry: true,
      retryAfter: 30,
      suggestions: [
        'Try refreshing the page',
        'Check your internet connection',
        'If the problem persists, contact support'
      ],
      metadata: {
        originalError: error.message,
        errorType: error.type,
        provider: error.provider
      }
    }
  }

  /**
   * Create UI feedback for long operations
   * Requirement 10.2: Add UI feedback for long operations ("Thinking...")
   */
  createLongOperationFeedback(options: UIFeedbackOptions = {}): UIFeedbackController {
    const {
      showThinking = true,
      estimatedDuration = 5000,
      operation = 'Processing your request',
      onCancel
    } = options

    return new UIFeedbackController({
      showThinking,
      estimatedDuration,
      operation,
      onCancel
    })
  }

  /**
   * Retry logic with exponential backoff
   */
  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.maxRetries,
    baseDelay: number = this.baseRetryDelay
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        if (attempt === maxRetries) {
          break
        }

        const delay = baseDelay * Math.pow(2, attempt)
        await this.sleep(delay)
      }
    }

    throw lastError!
  }

  /**
   * Extract moderation categories from error message
   */
  private extractModerationCategories(message: string): string[] {
    const categories: string[] = []
    
    if (message.includes('hate')) categories.push('hate')
    if (message.includes('harassment')) categories.push('harassment')
    if (message.includes('violence')) categories.push('violence')
    if (message.includes('sexual')) categories.push('sexual')
    if (message.includes('self-harm')) categories.push('self-harm')
    if (message.includes('spam')) categories.push('spam')
    
    return categories.length > 0 ? categories : ['content-policy']
  }

  /**
   * Determine severity based on moderation categories
   */
  private determineSeverity(categories: string[]): 'low' | 'medium' | 'high' | 'critical' {
    if (categories.includes('violence') || categories.includes('self-harm')) {
      return 'critical'
    }
    if (categories.includes('hate') || categories.includes('harassment')) {
      return 'high'
    }
    if (categories.includes('sexual') || categories.includes('spam')) {
      return 'medium'
    }
    return 'low'
  }

  /**
   * Get suggestions based on moderation categories
   */
  private getModerationSuggestions(categories: string[]): string[] {
    const suggestions = [
      'Try rephrasing your request in a more professional tone',
      'Focus on constructive and positive content',
      'Avoid controversial or sensitive topics'
    ]

    if (categories.includes('spam')) {
      suggestions.push('Make your content more specific and valuable')
    }

    if (categories.includes('hate') || categories.includes('harassment')) {
      suggestions.push('Ensure your content is respectful and inclusive')
    }

    return suggestions
  }

  /**
   * Get next midnight for daily limit reset
   */
  private getNextMidnight(): Date {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    return tomorrow
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * UI Feedback Controller for long operations
 * Requirement 10.2: UI feedback for long operations ("Thinking...")
 */
export class UIFeedbackController {
  private startTime: number
  private timeoutId?: NodeJS.Timeout
  private progressInterval?: NodeJS.Timeout
  private isActive = false

  constructor(private options: Required<UIFeedbackOptions>) {
    this.startTime = Date.now()
  }

  /**
   * Start showing UI feedback
   */
  start(): void {
    if (this.isActive) return

    this.isActive = true
    this.showInitialFeedback()
    this.startProgressUpdates()
    this.scheduleTimeout()
  }

  /**
   * Stop showing UI feedback
   */
  stop(): void {
    if (!this.isActive) return

    this.isActive = false
    this.clearTimers()
    this.hideFeedback()
  }

  /**
   * Update the operation message
   */
  updateMessage(message: string): void {
    if (!this.isActive) return
    
    this.options.operation = message
    this.updateFeedbackDisplay()
  }

  /**
   * Show initial "Thinking..." feedback
   */
  private showInitialFeedback(): void {
    if (!this.options.showThinking) return

    // This would integrate with the actual UI framework
    // For now, we'll use console logging as a placeholder
    console.log(`🤔 ${this.options.operation}...`)
  }

  /**
   * Start progress updates
   */
  private startProgressUpdates(): void {
    this.progressInterval = setInterval(() => {
      if (!this.isActive) return

      const elapsed = Date.now() - this.startTime
      const progress = Math.min(elapsed / this.options.estimatedDuration, 0.95)
      
      this.updateProgress(progress)
    }, 500)
  }

  /**
   * Schedule timeout for maximum operation duration
   */
  private scheduleTimeout(): void {
    const maxDuration = this.options.estimatedDuration * 2 // Allow 2x estimated time
    
    this.timeoutId = setTimeout(() => {
      if (this.isActive) {
        this.updateMessage('This is taking longer than expected')
      }
    }, maxDuration)
  }

  /**
   * Update progress display
   */
  private updateProgress(progress: number): void {
    // This would update the actual UI progress indicator
    // For now, we'll use console logging as a placeholder
    const percentage = Math.round(progress * 100)
    console.log(`Progress: ${percentage}% - ${this.options.operation}`)
  }

  /**
   * Update feedback display
   */
  private updateFeedbackDisplay(): void {
    // This would update the actual UI message
    // For now, we'll use console logging as a placeholder
    console.log(`Updated: ${this.options.operation}`)
  }

  /**
   * Hide feedback UI
   */
  private hideFeedback(): void {
    // This would hide the actual UI feedback
    // For now, we'll use console logging as a placeholder
    console.log('✅ Operation completed')
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = undefined
    }

    if (this.progressInterval) {
      clearInterval(this.progressInterval)
      this.progressInterval = undefined
    }
  }
}

/**
 * Create error handler instance
 */
export function createErrorHandler(): ErrorHandler {
  return new ErrorHandler()
}

/**
 * Create provider error
 */
export function createProviderError(
  type: ProviderError['type'],
  message: string,
  options: Partial<ProviderError> = {}
): ProviderError {
  const error = new Error(message) as ProviderError
  error.type = type
  error.provider = options.provider
  error.statusCode = options.statusCode
  error.retryAfter = options.retryAfter
  error.originalError = options.originalError
  return error
}