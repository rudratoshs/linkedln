/**
 * Metadata-Only Logging Service for PostPhantom
 * Logs timestamps, providers, outcomes, safety categories without storing user content
 * Requirements: 3.5, 6.5, 8.3, 10.5
 */

export interface LogEntry {
  id: string
  timestamp: Date
  userId: string
  provider: 'openai' | 'gemini'
  operation: 'generation' | 'moderation' | 'embedding' | 'failover'
  outcome: 'success' | 'failure' | 'moderated' | 'rate_limited' | 'timeout'
  safetyCategories?: string[]
  metadata: Record<string, any>
}

export interface GenerationLogData {
  provider: 'openai' | 'gemini'
  tokenCount?: number
  responseTime: number
  safetyCategories?: string[]
  moderationScore?: number
  failoverReason?: string
}

export interface ModerationLogData {
  provider: 'openai' | 'gemini'
  categories: string[]
  severity: 'low' | 'medium' | 'high' | 'critical'
  confidence: number
}

export interface RateLimitLogData {
  limitType: 'daily' | 'hourly' | 'cooldown'
  currentCount: number
  limitValue: number
  resetTime: Date
}

export interface ErrorLogData {
  errorType: string
  errorCode?: string
  retryAttempt?: number
  willRetry: boolean
}

export class LoggingService {
  private logs: LogEntry[] = []
  private readonly maxLogEntries = 10000 // Keep last 10k entries in memory

  /**
   * Log a generation request with metadata only
   * Requirement 3.5: Log generation attempts without storing content
   */
  logGeneration(
    userId: string,
    provider: 'openai' | 'gemini',
    outcome: 'success' | 'failure' | 'moderated' | 'timeout',
    data: GenerationLogData
  ): void {
    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      userId,
      provider,
      operation: 'generation',
      outcome,
      safetyCategories: data.safetyCategories,
      metadata: {
        tokenCount: data.tokenCount,
        responseTime: data.responseTime,
        moderationScore: data.moderationScore,
        failoverReason: data.failoverReason,
        // CRITICAL: No user content or generated text stored
        contentStored: false
      }
    }

    this.addLogEntry(entry)
    this.logToConsole(entry, 'Generation request processed')
  }

  /**
   * Log moderation results with safety categories
   * Requirement 6.5: Log safety enforcement without content
   */
  logModeration(
    userId: string,
    provider: 'openai' | 'gemini',
    outcome: 'success' | 'moderated',
    data: ModerationLogData
  ): void {
    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      userId,
      provider,
      operation: 'moderation',
      outcome,
      safetyCategories: data.categories,
      metadata: {
        severity: data.severity,
        confidence: data.confidence,
        categoriesCount: data.categories.length,
        // CRITICAL: No flagged content stored
        contentStored: false
      }
    }

    this.addLogEntry(entry)
    this.logToConsole(entry, 'Moderation check completed')
  }

  /**
   * Log rate limiting events
   * Requirement 8.3: Log rate limit enforcement
   */
  logRateLimit(
    userId: string,
    outcome: 'rate_limited',
    data: RateLimitLogData
  ): void {
    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      userId,
      provider: 'openai', // Default provider for rate limiting logs
      operation: 'generation',
      outcome,
      metadata: {
        limitType: data.limitType,
        currentCount: data.currentCount,
        limitValue: data.limitValue,
        resetTime: data.resetTime.toISOString(),
        utilizationPercentage: (data.currentCount / data.limitValue) * 100
      }
    }

    this.addLogEntry(entry)
    this.logToConsole(entry, 'Rate limit enforced')
  }

  /**
   * Log provider failover events
   * Requirement 10.5: Log system reliability events
   */
  logFailover(
    userId: string,
    fromProvider: 'openai' | 'gemini',
    toProvider: 'openai' | 'gemini',
    reason: string,
    outcome: 'success' | 'failure'
  ): void {
    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      userId,
      provider: fromProvider,
      operation: 'failover',
      outcome,
      metadata: {
        fromProvider,
        toProvider,
        failoverReason: reason,
        failoverSuccess: outcome === 'success'
      }
    }

    this.addLogEntry(entry)
    this.logToConsole(entry, 'Provider failover attempted')
  }

  /**
   * Log error events with metadata
   * Requirement 10.5: Log error patterns for debugging
   */
  logError(
    userId: string,
    provider: 'openai' | 'gemini',
    operation: 'generation' | 'moderation' | 'embedding',
    data: ErrorLogData
  ): void {
    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      userId,
      provider,
      operation,
      outcome: 'failure',
      metadata: {
        errorType: data.errorType,
        errorCode: data.errorCode,
        retryAttempt: data.retryAttempt,
        willRetry: data.willRetry,
        // CRITICAL: No error details that might contain user data
        sanitized: true
      }
    }

    this.addLogEntry(entry)
    this.logToConsole(entry, 'Error occurred')
  }

  /**
   * Get usage statistics for a user (metadata only)
   * Requirement 8.3: Provide usage analytics without content
   */
  getUserUsageStats(userId: string, timeframe: 'day' | 'hour' = 'day'): {
    totalGenerations: number
    successfulGenerations: number
    moderatedGenerations: number
    rateLimitedRequests: number
    averageResponseTime: number
    providerUsage: Record<string, number>
    safetyCategories: Record<string, number>
  } {
    const cutoff = new Date()
    if (timeframe === 'day') {
      cutoff.setHours(cutoff.getHours() - 24)
    } else {
      cutoff.setHours(cutoff.getHours() - 1)
    }

    const userLogs = this.logs.filter(
      log => log.userId === userId && log.timestamp >= cutoff
    )

    const generationLogs = userLogs.filter(log => log.operation === 'generation')
    
    const stats = {
      totalGenerations: generationLogs.length,
      successfulGenerations: generationLogs.filter(log => log.outcome === 'success').length,
      moderatedGenerations: generationLogs.filter(log => log.outcome === 'moderated').length,
      rateLimitedRequests: userLogs.filter(log => log.outcome === 'rate_limited').length,
      averageResponseTime: this.calculateAverageResponseTime(generationLogs),
      providerUsage: this.calculateProviderUsage(generationLogs),
      safetyCategories: this.calculateSafetyCategoryStats(userLogs)
    }

    return stats
  }

  /**
   * Get system-wide health metrics (no user data)
   * Requirement 10.5: System monitoring without privacy concerns
   */
  getSystemHealthMetrics(timeframe: 'hour' | 'day' = 'hour'): {
    totalRequests: number
    successRate: number
    averageResponseTime: number
    providerHealthScores: Record<string, number>
    moderationRate: number
    failoverRate: number
    topSafetyCategories: Array<{ category: string; count: number }>
  } {
    const cutoff = new Date()
    if (timeframe === 'day') {
      cutoff.setHours(cutoff.getHours() - 24)
    } else {
      cutoff.setHours(cutoff.getHours() - 1)
    }

    const recentLogs = this.logs.filter(log => log.timestamp >= cutoff)
    const generationLogs = recentLogs.filter(log => log.operation === 'generation')

    return {
      totalRequests: generationLogs.length,
      successRate: this.calculateSuccessRate(generationLogs),
      averageResponseTime: this.calculateAverageResponseTime(generationLogs),
      providerHealthScores: this.calculateProviderHealthScores(generationLogs),
      moderationRate: this.calculateModerationRate(recentLogs),
      failoverRate: this.calculateFailoverRate(recentLogs),
      topSafetyCategories: this.getTopSafetyCategories(recentLogs)
    }
  }

  /**
   * Clear old log entries to manage memory
   */
  private addLogEntry(entry: LogEntry): void {
    this.logs.push(entry)
    
    // Keep only the most recent entries
    if (this.logs.length > this.maxLogEntries) {
      this.logs = this.logs.slice(-this.maxLogEntries)
    }
  }

  /**
   * Generate unique log entry ID
   */
  private generateId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Log to console for development (metadata only)
   */
  private logToConsole(entry: LogEntry, message: string): void {
    console.log(`[${entry.timestamp.toISOString()}] ${message}`, {
      id: entry.id,
      userId: entry.userId.substring(0, 8) + '...', // Truncate for privacy
      provider: entry.provider,
      operation: entry.operation,
      outcome: entry.outcome,
      safetyCategories: entry.safetyCategories,
      // CRITICAL: Never log user content or generated text
      metadataKeys: Object.keys(entry.metadata)
    })
  }

  /**
   * Calculate average response time from logs
   */
  private calculateAverageResponseTime(logs: LogEntry[]): number {
    const responseTimes = logs
      .map(log => log.metadata.responseTime)
      .filter(time => typeof time === 'number')

    if (responseTimes.length === 0) return 0
    
    return responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
  }

  /**
   * Calculate provider usage distribution
   */
  private calculateProviderUsage(logs: LogEntry[]): Record<string, number> {
    const usage: Record<string, number> = {}
    
    logs.forEach(log => {
      usage[log.provider] = (usage[log.provider] || 0) + 1
    })

    return usage
  }

  /**
   * Calculate safety category statistics
   */
  private calculateSafetyCategoryStats(logs: LogEntry[]): Record<string, number> {
    const categories: Record<string, number> = {}
    
    logs.forEach(log => {
      if (log.safetyCategories) {
        log.safetyCategories.forEach(category => {
          categories[category] = (categories[category] || 0) + 1
        })
      }
    })

    return categories
  }

  /**
   * Calculate success rate percentage
   */
  private calculateSuccessRate(logs: LogEntry[]): number {
    if (logs.length === 0) return 0
    
    const successCount = logs.filter(log => log.outcome === 'success').length
    return (successCount / logs.length) * 100
  }

  /**
   * Calculate provider health scores
   */
  private calculateProviderHealthScores(logs: LogEntry[]): Record<string, number> {
    const scores: Record<string, number> = {}
    const providers = ['openai', 'gemini']

    providers.forEach(provider => {
      const providerLogs = logs.filter(log => log.provider === provider)
      if (providerLogs.length === 0) {
        scores[provider] = 100 // Default healthy score
        return
      }

      const successCount = providerLogs.filter(log => log.outcome === 'success').length
      scores[provider] = (successCount / providerLogs.length) * 100
    })

    return scores
  }

  /**
   * Calculate moderation rate
   */
  private calculateModerationRate(logs: LogEntry[]): number {
    const generationLogs = logs.filter(log => log.operation === 'generation')
    if (generationLogs.length === 0) return 0

    const moderatedCount = generationLogs.filter(log => log.outcome === 'moderated').length
    return (moderatedCount / generationLogs.length) * 100
  }

  /**
   * Calculate failover rate
   */
  private calculateFailoverRate(logs: LogEntry[]): number {
    const generationLogs = logs.filter(log => log.operation === 'generation')
    if (generationLogs.length === 0) return 0

    const failoverCount = logs.filter(log => log.operation === 'failover').length
    return (failoverCount / generationLogs.length) * 100
  }

  /**
   * Get top safety categories by frequency
   */
  private getTopSafetyCategories(logs: LogEntry[]): Array<{ category: string; count: number }> {
    const categoryStats = this.calculateSafetyCategoryStats(logs)
    
    return Object.entries(categoryStats)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10) // Top 10 categories
  }
}

/**
 * Create logging service instance
 */
export function createLoggingService(): LoggingService {
  return new LoggingService()
}