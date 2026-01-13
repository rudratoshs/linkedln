import {
  IGenerativeModel,
  GenerationRequest,
  GenerationResponse,
  ProviderCapabilities,
  SafetyRating,
  NotSupportedError,
  Message,
  ImageInput
} from '../types/core.js'

/**
 * Gemini API message format
 */
interface GeminiContent {
  role: 'user' | 'model'
  parts: Array<{
    text?: string
    inlineData?: {
      mimeType: string
      data: string
    }
  }>
}

/**
 * Gemini API request format
 */
interface GeminiRequest {
  contents: GeminiContent[]
  systemInstruction?: {
    parts: Array<{ text: string }>
  }
  generationConfig?: {
    maxOutputTokens?: number
    temperature?: number
  }
  safetySettings: Array<{
    category: string
    threshold: string
  }>
}

/**
 * Gemini API response format
 */
interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>
      role: string
    }
    finishReason: string
    safetyRatings: Array<{
      category: string
      probability: string
      blocked: boolean
    }>
  }>
  usageMetadata: {
    promptTokenCount: number
    candidatesTokenCount: number
    totalTokenCount: number
  }
}

/**
 * Gemini safety categories
 */
const GEMINI_SAFETY_CATEGORIES = [
  'HARM_CATEGORY_HARASSMENT',
  'HARM_CATEGORY_HATE_SPEECH',
  'HARM_CATEGORY_SEXUALLY_EXPLICIT',
  'HARM_CATEGORY_DANGEROUS_CONTENT'
]

/**
 * Gemini adapter implementing the IGenerativeModel interface
 * Maps SystemMessage to systemInstruction and applies BLOCK_ONLY_HIGH safety settings
 */
export class GeminiAdapter implements IGenerativeModel {
  private apiKey: string
  private baseUrl: string
  private model: string

  constructor(apiKey: string, model: string = 'gemini-1.5-pro', baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta') {
    this.apiKey = apiKey
    this.baseUrl = baseUrl
    this.model = model
  }

  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    // Step 1: Validate image sizes (10MB limit)
    this.validateImageSizes(request.images)

    // Step 2: Convert to Gemini format
    const geminiRequest = this.convertToGeminiFormat(request)

    // Step 3: Make API call
    const response = await this.callGeminiAPI(geminiRequest)

    // Step 4: Convert response to standard format
    return this.convertFromGeminiFormat(response)
  }

  async stream(request: GenerationRequest): Promise<ReadableStream> {
    // Gemini streaming with tool-calling may not be supported
    throw new NotSupportedError('Gemini streaming with tool-calling is not supported')
  }

  getProviderName(): string {
    return 'gemini'
  }

  getCapabilities(): ProviderCapabilities {
    return {
      textGeneration: true,
      visionAnalysis: true,
      embeddings: false, // Explicitly disabled per requirements
      maxContextTokens: 1000000,
      supportedImageFormats: ['jpeg', 'png'] // LinkedIn standard formats only
    }
  }

  /**
   * Validate image sizes against 10MB limit
   */
  private validateImageSizes(images?: ImageInput[]): void {
    if (!images) return

    const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB in bytes

    for (const image of images) {
      if (image.size && image.size > MAX_IMAGE_SIZE) {
        throw new Error(`Image size ${image.size} bytes exceeds 10MB limit`)
      }

      // Estimate size from base64 data if size not provided
      if (!image.size && image.data) {
        const estimatedSize = (image.data.length * 3) / 4 // Base64 to bytes approximation
        if (estimatedSize > MAX_IMAGE_SIZE) {
          throw new Error(`Estimated image size ${Math.round(estimatedSize)} bytes exceeds 10MB limit`)
        }
      }
    }
  }

  /**
   * Convert standard GenerationRequest to Gemini API format
   */
  private convertToGeminiFormat(request: GenerationRequest): GeminiRequest {
    let systemInstruction: { parts: Array<{ text: string }> } | undefined
    const contents: GeminiContent[] = []

    // Process messages
    for (const message of request.messages) {
      if (message.role === 'system') {
        // Map SystemMessage to systemInstruction
        systemInstruction = {
          parts: [{ text: message.content }]
        }
      } else {
        // Convert user/assistant messages
        const role = message.role === 'assistant' ? 'model' : 'user'
        const parts: Array<{
          text?: string
          inlineData?: { mimeType: string; data: string }
        }> = []

        // Add text content
        if (message.content) {
          parts.push({ text: message.content })
        }

        // Add images for user messages
        if (message.role === 'user' && request.images) {
          for (const image of request.images) {
            parts.push({
              inlineData: {
                mimeType: image.mimeType,
                data: image.data
              }
            })
          }
        }

        contents.push({ role, parts })
      }
    }

    // Handle systemInstruction from request if provided
    if (request.systemInstruction && !systemInstruction) {
      systemInstruction = {
        parts: [{ text: request.systemInstruction }]
      }
    }

    return {
      contents,
      systemInstruction,
      generationConfig: {
        maxOutputTokens: request.maxTokens,
        temperature: request.temperature
      },
      safetySettings: GEMINI_SAFETY_CATEGORIES.map(category => ({
        category,
        threshold: 'BLOCK_ONLY_HIGH' // Apply BLOCK_ONLY_HIGH safety settings
      }))
    }
  }

  /**
   * Make the actual API call to Gemini
   */
  private async callGeminiAPI(request: GeminiRequest): Promise<GeminiResponse> {
    const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const responseData = await response.json()

    // Check if the response was blocked by safety filters
    if (responseData.candidates?.[0]?.finishReason === 'SAFETY') {
      const safetyRatings = responseData.candidates[0].safetyRatings || []
      const blockedCategories = safetyRatings
        .filter((rating: any) => rating.blocked)
        .map((rating: any) => rating.category)

      throw new Error(`Content blocked by Gemini safety filters. Categories: ${blockedCategories.join(', ')}`)
    }

    return responseData
  }

  /**
   * Convert Gemini response to standard GenerationResponse format
   */
  private convertFromGeminiFormat(response: GeminiResponse): GenerationResponse {
    const candidate = response.candidates[0]
    
    if (!candidate) {
      throw new Error('No candidates returned from Gemini API')
    }

    const content = candidate.content.parts
      .map(part => part.text)
      .filter(text => text)
      .join('')

    const safetyRatings: SafetyRating[] = candidate.safetyRatings?.map(rating => ({
      category: rating.category,
      probability: rating.probability,
      blocked: rating.blocked
    })) || []

    return {
      content,
      provider: 'gemini',
      tokensUsed: response.usageMetadata?.totalTokenCount || 0,
      finishReason: candidate.finishReason,
      safetyRatings
    }
  }
}