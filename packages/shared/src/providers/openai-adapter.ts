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
 * OpenAI API message format
 */
interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | Array<{
    type: 'text' | 'image_url'
    text?: string
    image_url?: {
      url: string
      detail?: 'low' | 'high' | 'auto'
    }
  }>
}

/**
 * OpenAI API request format
 */
interface OpenAIRequest {
  model: string
  messages: OpenAIMessage[]
  max_tokens?: number
  temperature?: number
  stream?: boolean
}

/**
 * OpenAI API response format
 */
interface OpenAIResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * OpenAI Moderation API response format
 */
interface OpenAIModerationResponse {
  id: string
  model: string
  results: Array<{
    flagged: boolean
    categories: Record<string, boolean>
    category_scores: Record<string, number>
  }>
}

/**
 * OpenAI adapter implementing the IGenerativeModel interface
 * Handles message format conversion, moderation, and API communication
 */
export class OpenAIAdapter implements IGenerativeModel {
  private apiKey: string
  private baseUrl: string
  private model: string

  constructor(apiKey: string, model: string = 'gpt-4o', baseUrl: string = 'https://api.openai.com/v1') {
    this.apiKey = apiKey
    this.baseUrl = baseUrl
    this.model = model
  }

  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    // Step 1: Apply OpenAI Moderation API
    await this.moderateContent(request)

    // Step 2: Convert to OpenAI format
    const openaiRequest = this.convertToOpenAIFormat(request)

    // Step 3: Make API call
    const response = await this.callOpenAIAPI(openaiRequest)

    // Step 4: Convert response to standard format
    return this.convertFromOpenAIFormat(response)
  }

  async stream(request: GenerationRequest): Promise<ReadableStream> {
    // Apply moderation first
    await this.moderateContent(request)

    const openaiRequest = {
      ...this.convertToOpenAIFormat(request),
      stream: true
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(openaiRequest)
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
    }

    return response.body!
  }

  getProviderName(): string {
    return 'openai'
  }

  getCapabilities(): ProviderCapabilities {
    return {
      textGeneration: true,
      visionAnalysis: true,
      embeddings: true,
      maxContextTokens: 128000,
      supportedImageFormats: ['jpeg', 'png'] // LinkedIn standard formats only
    }
  }

  /**
   * Apply OpenAI Moderation API to check content safety
   */
  private async moderateContent(request: GenerationRequest): Promise<void> {
    // Extract text content from messages for moderation
    const textContent = request.messages
      .map(msg => msg.content)
      .join('\n')

    const moderationRequest = {
      input: textContent,
      model: 'text-moderation-latest'
    }

    const response = await fetch(`${this.baseUrl}/moderations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(moderationRequest)
    })

    if (!response.ok) {
      throw new Error(`OpenAI Moderation API error: ${response.status} ${response.statusText}`)
    }

    const moderationResponse: OpenAIModerationResponse = await response.json()
    const result = moderationResponse.results[0]

    if (result.flagged) {
      const flaggedCategories = Object.entries(result.categories)
        .filter(([_, flagged]) => flagged)
        .map(([category, _]) => category)

      throw new Error(`Content moderation failed. Flagged categories: ${flaggedCategories.join(', ')}`)
    }
  }

  /**
   * Convert standard GenerationRequest to OpenAI API format
   */
  private convertToOpenAIFormat(request: GenerationRequest): OpenAIRequest {
    const messages: OpenAIMessage[] = request.messages.map(msg => {
      // Handle text-only messages
      if (!request.images || request.images.length === 0) {
        return {
          role: msg.role,
          content: msg.content
        }
      }

      // Handle messages with images (vision)
      if (msg.role === 'user') {
        const content: Array<{
          type: 'text' | 'image_url'
          text?: string
          image_url?: { url: string; detail?: 'low' | 'high' | 'auto' }
        }> = []

        // Add text content
        if (msg.content) {
          content.push({
            type: 'text',
            text: msg.content
          })
        }

        // Add images
        request.images?.forEach(image => {
          content.push({
            type: 'image_url',
            image_url: {
              url: `data:${image.mimeType};base64,${image.data}`,
              detail: 'auto'
            }
          })
        })

        return {
          role: msg.role,
          content
        }
      }

      // Non-user messages remain text-only
      return {
        role: msg.role,
        content: msg.content
      }
    })

    return {
      model: this.model,
      messages,
      max_tokens: request.maxTokens,
      temperature: request.temperature
    }
  }

  /**
   * Make the actual API call to OpenAI
   */
  private async callOpenAIAPI(request: OpenAIRequest): Promise<OpenAIResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    return await response.json()
  }

  /**
   * Convert OpenAI response to standard GenerationResponse format
   */
  private convertFromOpenAIFormat(response: OpenAIResponse): GenerationResponse {
    const choice = response.choices[0]
    
    return {
      content: choice.message.content,
      provider: 'openai',
      tokensUsed: response.usage.total_tokens,
      finishReason: choice.finish_reason,
      // OpenAI doesn't provide safety ratings in the generation response
      // Safety is handled by the separate moderation API call
      safetyRatings: []
    }
  }
}