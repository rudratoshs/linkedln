import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0"
import { z } from "https://esm.sh/zod@3.22.4"
import { corsHeaders } from "../_shared/cors.ts"

// For Deno environment, we'll need to import the shared code differently
// Since we can't directly import from the shared package in Deno, we'll inline the necessary types and logic

// Core types (inlined from shared package)
interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ImageInput {
  data: string // base64 encoded
  mimeType: string
  size?: number // in bytes
}

interface GenerationRequest {
  messages: Message[]
  maxTokens?: number
  temperature?: number
  images?: ImageInput[]
  systemInstruction?: string
}

interface SafetyRating {
  category: string
  probability: string
  blocked: boolean
}

interface GenerationResponse {
  content: string
  provider: string
  tokensUsed: number
  safetyRatings?: SafetyRating[]
  finishReason: string
}

interface ProviderCapabilities {
  textGeneration: boolean
  visionAnalysis: boolean
  embeddings: boolean
  maxContextTokens: number
  supportedImageFormats: string[]
}

interface IGenerativeModel {
  generate(request: GenerationRequest): Promise<GenerationResponse>
  stream(request: GenerationRequest): Promise<ReadableStream>
  getProviderName(): string
  getCapabilities(): ProviderCapabilities
}

interface RequestLog {
  id?: string
  user_id: string
  provider: string
  model_name: string
  estimated_tokens?: number
  actual_tokens?: number
  safety_ratings?: SafetyRating[]
  request_type: 'generation' | 'embedding' | 'moderation'
  success: boolean
  error_message?: string
  response_time_ms: number
  created_at: string
}

interface RateLimit {
  user_id: string
  daily_count: number
  hourly_count: number
  last_request_at?: string
  daily_reset_at: string
  hourly_reset_at: string
  is_locked: boolean
  lock_expires_at?: string
}

interface UserPreferences {
  user_id: string
  preferred_provider: 'openai' | 'gemini'
  generation_temperature: number
  max_drafts_per_request: number
  anti_cheerleader_enabled: boolean
  typing_speed_multiplier: number
  preferences: Record<string, any>
}

// Validation schemas
const GenerationRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string().min(1)
  })).min(1),
  maxTokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  images: z.array(z.object({
    data: z.string(),
    mimeType: z.string(),
    size: z.number().optional()
  })).optional(),
  systemInstruction: z.string().optional()
})

const MultiDraftRequestSchema = z.object({
  request: GenerationRequestSchema,
  draftCount: z.number().int().min(1).max(5).default(3)
})

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required Supabase environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Check for required API keys
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
const geminiApiKey = Deno.env.get('GEMINI_API_KEY')

if (!openaiApiKey || !geminiApiKey) {
  console.warn('Missing AI provider API keys. Set OPENAI_API_KEY and GEMINI_API_KEY environment variables.')
}

// Simple provider implementations for the edge function
class SimpleOpenAIAdapter implements IGenerativeModel {
  constructor(private apiKey: string) {}

  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: request.messages,
        max_tokens: request.maxTokens || 1000,
        temperature: request.temperature || 0.7
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    return {
      content: data.choices[0].message.content,
      provider: 'openai',
      tokensUsed: data.usage?.total_tokens || 0,
      finishReason: data.choices[0].finish_reason
    }
  }

  async stream(): Promise<ReadableStream> {
    throw new Error('Streaming not implemented in simple adapter')
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
      supportedImageFormats: ['jpeg', 'png']
    }
  }
}

class SimpleGeminiAdapter implements IGenerativeModel {
  constructor(private apiKey: string) {}

  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: request.messages.map(m => `${m.role}: ${m.content}`).join('\n') }]
        }],
        generationConfig: {
          temperature: request.temperature || 0.7,
          maxOutputTokens: request.maxTokens || 1000
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_ONLY_HIGH'
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_ONLY_HIGH'
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_ONLY_HIGH'
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_ONLY_HIGH'
          }
        ]
      })
    })

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No content generated by Gemini')
    }

    return {
      content: data.candidates[0].content.parts[0].text,
      provider: 'gemini',
      tokensUsed: data.usageMetadata?.totalTokenCount || 0,
      finishReason: data.candidates[0].finishReason || 'STOP',
      safetyRatings: data.candidates[0].safetyRatings
    }
  }

  async stream(): Promise<ReadableStream> {
    throw new Error('Streaming not implemented in simple adapter')
  }

  getProviderName(): string {
    return 'gemini'
  }

  getCapabilities(): ProviderCapabilities {
    return {
      textGeneration: true,
      visionAnalysis: true,
      embeddings: false,
      maxContextTokens: 1000000,
      supportedImageFormats: ['jpeg', 'png']
    }
  }
}

// Simple provider router
function selectProvider(request: GenerationRequest, userPreference?: string): string {
  // Estimate tokens (chars/4 heuristic)
  const totalChars = request.messages
    .map(m => m.content.length)
    .reduce((sum, len) => sum + len, 0)
  const estimatedTokens = Math.ceil(totalChars / 4)

  // Route large contexts to Gemini
  if (estimatedTokens > 110000) {
    return 'gemini'
  }

  // Route video input to Gemini (if present)
  if (request.images?.some(img => img.mimeType.startsWith('video/'))) {
    return 'gemini'
  }

  // Use user preference if valid
  if (userPreference === 'gemini' || userPreference === 'openai') {
    return userPreference
  }

  // Default to OpenAI
  return 'openai'
}

// Rate limiting functions
async function checkRateLimit(userId: string): Promise<{ allowed: boolean; error?: string }> {
  const { data: rateLimit, error } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') { // Not found is OK
    console.error('Rate limit check error:', error)
    return { allowed: false, error: 'Rate limit check failed' }
  }

  const now = new Date()
  
  if (!rateLimit) {
    // Create new rate limit record
    await supabase.from('rate_limits').insert({
      user_id: userId,
      daily_count: 0,
      hourly_count: 0,
      last_request_at: now.toISOString(),
      daily_reset_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      hourly_reset_at: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
      is_locked: false
    })
    return { allowed: true }
  }

  // Check if locked
  if (rateLimit.is_locked && rateLimit.lock_expires_at && new Date(rateLimit.lock_expires_at) > now) {
    const remainingSeconds = Math.ceil((new Date(rateLimit.lock_expires_at).getTime() - now.getTime()) / 1000)
    return { 
      allowed: false, 
      error: `Account locked. Try again in ${remainingSeconds} seconds.` 
    }
  }

  // Reset counters if needed
  let dailyCount = rateLimit.daily_count
  let hourlyCount = rateLimit.hourly_count
  let dailyResetAt = new Date(rateLimit.daily_reset_at)
  let hourlyResetAt = new Date(rateLimit.hourly_reset_at)

  if (now > dailyResetAt) {
    dailyCount = 0
    dailyResetAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  }

  if (now > hourlyResetAt) {
    hourlyCount = 0
    hourlyResetAt = new Date(now.getTime() + 60 * 60 * 1000)
  }

  // Check daily limit (50 generations per day)
  if (dailyCount >= 50) {
    return { 
      allowed: false, 
      error: `Daily limit of 50 generations exceeded. Resets at ${dailyResetAt.toISOString()}` 
    }
  }

  // Check cooldown (2 minutes between requests)
  if (rateLimit.last_request_at) {
    const lastRequest = new Date(rateLimit.last_request_at)
    const cooldownEnd = new Date(lastRequest.getTime() + 2 * 60 * 1000)
    if (now < cooldownEnd) {
      const remainingSeconds = Math.ceil((cooldownEnd.getTime() - now.getTime()) / 1000)
      return { 
        allowed: false, 
        error: `Cooldown active. Wait ${remainingSeconds} seconds between requests.` 
      }
    }
  }

  // Check hourly limit (10 requests per hour, then 30-minute lock)
  if (hourlyCount >= 10) {
    const lockExpiresAt = new Date(now.getTime() + 30 * 60 * 1000)
    await supabase.from('rate_limits').update({
      is_locked: true,
      lock_expires_at: lockExpiresAt.toISOString()
    }).eq('user_id', userId)
    
    return { 
      allowed: false, 
      error: `Hourly limit exceeded. Account locked for 30 minutes.` 
    }
  }

  return { allowed: true }
}

async function updateRateLimit(userId: string): Promise<void> {
  const now = new Date()
  
  // Get current rate limit
  const { data: current } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (current) {
    await supabase.from('rate_limits').update({
      daily_count: current.daily_count + 1,
      hourly_count: current.hourly_count + 1,
      last_request_at: now.toISOString(),
      is_locked: false,
      lock_expires_at: null
    }).eq('user_id', userId)
  }
}

async function logRequest(
  userId: string, 
  provider: string, 
  modelName: string, 
  success: boolean, 
  responseTimeMs: number,
  estimatedTokens?: number,
  actualTokens?: number,
  errorMessage?: string
): Promise<void> {
  const log: RequestLog = {
    user_id: userId,
    provider,
    model_name: modelName,
    estimated_tokens: estimatedTokens,
    actual_tokens: actualTokens,
    request_type: 'generation',
    success,
    error_message: errorMessage,
    response_time_ms: responseTimeMs,
    created_at: new Date().toISOString()
  }

  await supabase.from('request_logs').insert(log)
}

async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user preferences:', error)
    return null
  }

  return data
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  const startTime = Date.now()

  try {
    // Get user from Supabase Auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse and validate request
    const body = await req.json()
    const validationResult = MultiDraftRequestSchema.safeParse(body)
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request format',
          details: validationResult.error.issues 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { request: generationRequest, draftCount } = validationResult.data

    // Check rate limiting
    const rateLimitCheck = await checkRateLimit(user.id)
    if (!rateLimitCheck.allowed) {
      return new Response(
        JSON.stringify({ error: rateLimitCheck.error }),
        { 
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get user preferences
    const userPreferences = await getUserPreferences(user.id)
    const preferredProvider = userPreferences?.preferred_provider || 'openai'
    const temperature = userPreferences?.generation_temperature || generationRequest.temperature || 0.7

    // Select provider using router
    const selectedProvider = selectProvider(generationRequest, preferredProvider)
    
    // Initialize adapters only if API keys are available
    if (!openaiApiKey || !geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'AI provider API keys not configured' }),
        { 
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const openaiAdapter = new SimpleOpenAIAdapter(openaiApiKey)
    const geminiAdapter = new SimpleGeminiAdapter(geminiApiKey)
    const adapter: IGenerativeModel = selectedProvider === 'gemini' ? geminiAdapter : openaiAdapter

    // Estimate tokens for logging
    const totalChars = generationRequest.messages
      .map(m => m.content.length)
      .reduce((sum, len) => sum + len, 0)
    const estimatedTokens = Math.ceil(totalChars / 4)

    // Generate multiple drafts
    const drafts: GenerationResponse[] = []
    let totalTokensUsed = 0
    let lastError: string | undefined

    for (let i = 0; i < draftCount; i++) {
      try {
        const requestWithTemp = { ...generationRequest, temperature }
        const response = await adapter.generate(requestWithTemp)

        drafts.push(response)
        totalTokensUsed += response.tokensUsed
      } catch (error) {
        console.error(`Draft ${i + 1} generation failed:`, error)
        lastError = error.message
        
        // If we have at least one successful draft, continue
        if (drafts.length === 0 && i === draftCount - 1) {
          throw error // Re-throw if no drafts were generated
        }
      }
    }

    if (drafts.length === 0) {
      throw new Error(lastError || 'All draft generation attempts failed')
    }

    // Update rate limiting
    await updateRateLimit(user.id)

    // Log successful request
    const responseTime = Date.now() - startTime
    await logRequest(
      user.id,
      selectedProvider,
      adapter.getProviderName(),
      true,
      responseTime,
      estimatedTokens,
      totalTokensUsed
    )

    // Return structured response
    const response = {
      success: true,
      drafts,
      metadata: {
        provider: selectedProvider,
        estimatedTokens,
        actualTokens: totalTokensUsed,
        responseTimeMs: responseTime,
        draftsGenerated: drafts.length,
        requestedDrafts: draftCount
      }
    }

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Generation endpoint error:', error)
    
    const responseTime = Date.now() - startTime
    
    // Try to log failed request if we have user context
    try {
      const authHeader = req.headers.get('Authorization')
      if (authHeader) {
        const { data: { user } } = await supabase.auth.getUser(
          authHeader.replace('Bearer ', '')
        )
        if (user) {
          await logRequest(
            user.id,
            'unknown',
            'unknown',
            false,
            responseTime,
            undefined,
            undefined,
            error.message
          )
        }
      }
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }

    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})