/**
 * ProviderRouter - Intelligent routing logic for AI provider selection
 * Implements token estimation, video detection, and health-aware routing
 */

import { GenerationRequest, ProviderHealth } from '../types/core.js'

export interface UserPreferences {
  preferredProvider?: 'openai' | 'gemini'
  generationTemperature?: number
  maxDraftsPerRequest?: number
}

export interface CircuitBreakerInterface {
  isUnhealthy(provider: string): boolean
  isHealthy(provider: string): boolean
}

export class ProviderRouter {
  private circuitBreaker: CircuitBreakerInterface

  constructor(circuitBreaker: CircuitBreakerInterface) {
    this.circuitBreaker = circuitBreaker
  }

  /**
   * Select the optimal provider based on request characteristics and system health
   */
  selectProvider(
    request: GenerationRequest, 
    userPreference?: UserPreferences
  ): string {
    // 1. Check circuit breaker health - if OpenAI is unhealthy, use Gemini
    if (this.circuitBreaker.isUnhealthy('openai')) {
      return 'gemini'
    }
    
    // If Gemini is unhealthy, use OpenAI
    if (this.circuitBreaker.isUnhealthy('gemini')) {
      return 'openai'
    }

    // 2. Explicit user preference (if provider is healthy)
    if (userPreference?.preferredProvider && 
        this.circuitBreaker.isHealthy(userPreference.preferredProvider)) {
      return userPreference.preferredProvider
    }

    // 3. Token estimation routing - large contexts go to Gemini
    const estimatedTokens = this.estimateTokens(request)
    if (estimatedTokens > 110000) {
      return 'gemini'
    }

    // 4. Video input routing - Gemini handles video better
    if (this.hasVideoInput(request)) {
      return 'gemini'
    }

    // 5. Default to OpenAI for general use cases
    return 'openai'
  }

  /**
   * Estimate token count using chars/4 heuristic
   * This is a simple but effective approximation for routing decisions
   */
  private estimateTokens(request: GenerationRequest): number {
    const totalChars = request.messages
      .map(m => m.content.length)
      .reduce((sum, len) => sum + len, 0)
    
    // Add system instruction length if present
    const systemChars = request.systemInstruction?.length || 0
    
    return Math.ceil((totalChars + systemChars) / 4)
  }

  /**
   * Detect video input in the request
   * Currently checks for video MIME types in images array
   */
  private hasVideoInput(request: GenerationRequest): boolean {
    if (!request.images || request.images.length === 0) {
      return false
    }

    return request.images.some(image => 
      image.mimeType.startsWith('video/')
    )
  }

  /**
   * Get estimated token count for external use
   */
  getEstimatedTokens(request: GenerationRequest): number {
    return this.estimateTokens(request)
  }

  /**
   * Check if request has video content
   */
  hasVideo(request: GenerationRequest): boolean {
    return this.hasVideoInput(request)
  }
}