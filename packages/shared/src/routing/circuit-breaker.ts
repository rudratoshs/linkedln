/**
 * CircuitBreaker - Provider health monitoring and failover logic
 * Implements circuit breaker pattern for AI provider reliability
 */

import { ProviderHealth } from '../types/core.js'

export interface CircuitBreakerConfig {
  failureThreshold: number // Number of failures before marking unhealthy
  cooldownPeriodMs: number // Time to wait before retrying unhealthy provider
  recoveryTimeoutMs: number // Time to wait for recovery attempts
}

export class CircuitBreaker {
  private providerHealth = new Map<string, ProviderHealth>()
  private failureCounts = new Map<string, number>()
  private config: CircuitBreakerConfig

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = {
      failureThreshold: 3,
      cooldownPeriodMs: 5 * 60 * 1000, // 5 minutes
      recoveryTimeoutMs: 30 * 1000, // 30 seconds
      ...config
    }

    // Initialize providers as healthy
    this.initializeProvider('openai')
    this.initializeProvider('gemini')
  }

  /**
   * Execute operation with automatic failover between providers
   */
  async executeWithFailover<T>(
    primaryProvider: string,
    secondaryProvider: string,
    operation: (provider: string) => Promise<T>
  ): Promise<T> {
    try {
      // Try primary provider first
      const result = await operation(primaryProvider)
      this.recordSuccess(primaryProvider)
      return result
    } catch (error) {
      console.warn(`Primary provider ${primaryProvider} failed:`, error)
      this.recordFailure(primaryProvider)

      try {
        // Failover to secondary provider
        const result = await operation(secondaryProvider)
        return result
      } catch (secondaryError) {
        console.error(`Secondary provider ${secondaryProvider} also failed:`, secondaryError)
        this.recordFailure(secondaryProvider)
        throw new Error(`Both providers failed: ${primaryProvider} and ${secondaryProvider}`)
      }
    }
  }

  /**
   * Check if a provider is currently unhealthy
   */
  isUnhealthy(provider: string): boolean {
    const health = this.providerHealth.get(provider)
    if (!health) {
      return false // Unknown providers are considered healthy
    }

    if (!health.isHealthy && health.cooldownUntil) {
      // Check if cooldown period has expired
      if (Date.now() > health.cooldownUntil) {
        this.attemptRecovery(provider)
        // Return the updated health status after recovery
        const updatedHealth = this.providerHealth.get(provider)
        return !updatedHealth?.isHealthy
      }
    }

    return !health.isHealthy
  }

  /**
   * Check if a provider is currently healthy
   */
  isHealthy(provider: string): boolean {
    return !this.isUnhealthy(provider)
  }

  /**
   * Record a successful operation for a provider
   */
  recordSuccess(provider: string): void {
    this.failureCounts.set(provider, 0)
    this.providerHealth.set(provider, {
      isHealthy: true,
      lastFailure: undefined,
      cooldownUntil: undefined
    })
  }

  /**
   * Record a failed operation for a provider
   */
  recordFailure(provider: string): void {
    const currentFailures = this.failureCounts.get(provider) || 0
    const newFailureCount = currentFailures + 1
    this.failureCounts.set(provider, newFailureCount)

    if (newFailureCount >= this.config.failureThreshold) {
      this.markUnhealthy(provider)
    }
  }

  /**
   * Mark a provider as unhealthy and set cooldown period
   */
  private markUnhealthy(provider: string): void {
    const now = Date.now()
    this.providerHealth.set(provider, {
      isHealthy: false,
      lastFailure: now,
      cooldownUntil: now + this.config.cooldownPeriodMs
    })

    console.warn(`Provider ${provider} marked as unhealthy. Cooldown until: ${new Date(now + this.config.cooldownPeriodMs)}`)
  }

  /**
   * Attempt to recover an unhealthy provider
   */
  private attemptRecovery(provider: string): void {
    console.info(`Attempting recovery for provider: ${provider}`)
    
    // Reset to healthy state for testing
    this.providerHealth.set(provider, {
      isHealthy: true,
      lastFailure: undefined,
      cooldownUntil: undefined
    })
    
    // Reset failure count to give it a fresh start
    this.failureCounts.set(provider, 0)
  }

  /**
   * Initialize a provider with healthy state
   */
  private initializeProvider(provider: string): void {
    this.providerHealth.set(provider, {
      isHealthy: true,
      lastFailure: undefined,
      cooldownUntil: undefined
    })
    this.failureCounts.set(provider, 0)
  }

  /**
   * Get current health status for all providers
   */
  getHealthStatus(): Record<string, ProviderHealth> {
    const status: Record<string, ProviderHealth> = {}
    for (const [provider, health] of this.providerHealth.entries()) {
      status[provider] = { ...health }
    }
    return status
  }

  /**
   * Manually mark a provider as healthy (for testing/admin purposes)
   */
  forceHealthy(provider: string): void {
    this.recordSuccess(provider)
  }

  /**
   * Manually mark a provider as unhealthy (for testing/admin purposes)
   */
  forceUnhealthy(provider: string): void {
    this.markUnhealthy(provider)
  }
}