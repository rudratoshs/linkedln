import { supabase } from './supabase-client'
import { Draft } from '../store/app-store'

// Temporary types until shared package is fixed
interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface GenerationRequest {
  messages: Message[]
  maxTokens?: number
  temperature?: number
  systemInstruction?: string
}

interface GenerationResponse {
  content: string
  provider: string
  tokensUsed: number
  finishReason: string
}

interface GenerationEndpointResponse {
  success: boolean
  drafts: GenerationResponse[]
  metadata: {
    provider: string
    estimatedTokens: number
    actualTokens: number
    responseTimeMs: number
    draftsGenerated: number
    requestedDrafts: number
  }
}

export class GenerationService {
  async generateDrafts(request: GenerationRequest): Promise<Draft[]> {
    try {
      const { data, error } = await supabase.functions.invoke('generate', {
        body: {
          request,
          draftCount: 3 // Generate 3 drafts by default
        }
      })

      if (error) {
        throw new Error(`Generation failed: ${error.message}`)
      }

      const response = data as GenerationEndpointResponse
      
      if (!response.success) {
        throw new Error('Generation failed')
      }
      
      // Convert response to Draft format
      return response.drafts.map((gen, index) => ({
        id: `draft-${Date.now()}-${index}`,
        content: gen.content,
        provider: gen.provider,
        timestamp: Date.now(),
        selected: false
      }))
    } catch (error) {
      console.error('Generation service error:', error)
      throw error
    }
  }

  async checkRateLimit(): Promise<{ allowed: boolean; remainingRequests: number }> {
    try {
      const { data, error } = await supabase.functions.invoke('check-rate-limit')
      
      if (error) {
        throw new Error(`Rate limit check failed: ${error.message}`)
      }
      
      return data
    } catch (error) {
      console.error('Rate limit check error:', error)
      // Default to allowing if check fails
      return { allowed: true, remainingRequests: 50 }
    }
  }
}