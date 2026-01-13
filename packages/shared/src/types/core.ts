/**
 * Core types for PostPhantom AI content generation system
 */

export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ImageInput {
  data: string // base64 encoded
  mimeType: string
  size?: number // in bytes
}

export interface GenerationRequest {
  messages: Message[]
  maxTokens?: number
  temperature?: number
  images?: ImageInput[]
  systemInstruction?: string
}

export interface SafetyRating {
  category: string
  probability: string
  blocked: boolean
}

export interface GenerationResponse {
  content: string
  provider: string
  tokensUsed: number
  safetyRatings?: SafetyRating[]
  finishReason: string
}

export interface ProviderCapabilities {
  textGeneration: boolean
  visionAnalysis: boolean
  embeddings: boolean
  maxContextTokens: number
  supportedImageFormats: string[]
}

/**
 * Core interface that all AI providers must implement
 * This ensures consistent behavior across OpenAI, Gemini, and future providers
 */
export interface IGenerativeModel {
  generate(request: GenerationRequest): Promise<GenerationResponse>
  stream(request: GenerationRequest): Promise<ReadableStream> // MAY throw NotSupportedError for Gemini tool-calling
  getProviderName(): string
  getCapabilities(): ProviderCapabilities
}

export class NotSupportedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotSupportedError'
  }
}

export interface ProviderHealth {
  isHealthy: boolean
  lastFailure?: number
  cooldownUntil?: number
}

export interface RequestContext {
  userId: string
  requestId: string
  timestamp: number
}

export interface ErrorResponse {
  error: string
  message: string
  code?: string
  details?: Record<string, any>
}