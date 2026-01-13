import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0"
import { z } from "npm:zod";
import { corsHeaders } from "../_shared/cors.ts"

// Core types for embeddings
interface EmbeddingRequest {
  text: string
  contentType: 'interaction' | 'contact' | 'topic'
  metadata?: Record<string, any>
}

interface EmbeddingResponse {
  embedding: number[]
  contentHash: string
  dimensions: number
  model: string
  tokensUsed: number
}

interface ContentEmbedding {
  id?: string
  user_id: string
  content_hash: string
  content_type: 'interaction' | 'contact' | 'topic'
  embedding: number[]
  metadata: Record<string, any>
  created_at: string
}

// Validation schemas
const EmbeddingRequestSchema = z.object({
  text: z.string().min(1).max(8000), // OpenAI embedding limit
  contentType: z.enum(['interaction', 'contact', 'topic']),
  metadata: z.record(z.any()).optional().default({})
})

const BatchEmbeddingRequestSchema = z.object({
  requests: z.array(EmbeddingRequestSchema).min(1).max(10) // Batch limit
})

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required Supabase environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Check for required API key - ONLY OpenAI for embeddings
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')

if (!openaiApiKey) {
  console.warn('Missing OpenAI API key. Set OPENAI_API_KEY environment variable.')
}

// Simple hash function for content
function hashContent(text: string): string {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16)
}

// OpenAI Embedding Adapter - EXCLUSIVELY text-embedding-3-small
class OpenAIEmbeddingAdapter {
  constructor(private apiKey: string) {}

  async generateEmbedding(text: string): Promise<{ embedding: number[]; tokensUsed: number }> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small', // EXCLUSIVELY this model
        input: text,
        encoding_format: 'float'
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`OpenAI Embedding API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`)
    }

    const data = await response.json()
    
    if (!data.data || data.data.length === 0) {
      throw new Error('No embedding data returned from OpenAI')
    }

    return {
      embedding: data.data[0].embedding,
      tokensUsed: data.usage?.total_tokens || 0
    }
  }

  getModel(): string {
    return 'text-embedding-3-small'
  }

  getDimensions(): number {
    return 1536 // text-embedding-3-small dimensions
  }
}

// Rate limiting for embeddings (separate from generation)
async function checkEmbeddingRateLimit(userId: string): Promise<{ allowed: boolean; error?: string }> {
  const { data: rateLimit, error } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Embedding rate limit check error:', error)
    return { allowed: false, error: 'Rate limit check failed' }
  }

  const now = new Date()
  
  if (!rateLimit) {
    return { allowed: true } // New users allowed
  }

  // Embeddings have more generous limits - 200 per day, 50 per hour
  if (rateLimit.daily_count >= 200) {
    return { 
      allowed: false, 
      error: `Daily embedding limit of 200 exceeded. Resets at ${new Date(rateLimit.daily_reset_at).toISOString()}` 
    }
  }

  // No cooldown for embeddings, but hourly limit
  if (rateLimit.hourly_count >= 50) {
    return { 
      allowed: false, 
      error: `Hourly embedding limit of 50 exceeded. Resets at ${new Date(rateLimit.hourly_reset_at).toISOString()}` 
    }
  }

  return { allowed: true }
}

async function logEmbeddingRequest(
  userId: string, 
  success: boolean, 
  responseTimeMs: number,
  tokensUsed?: number,
  errorMessage?: string
): Promise<void> {
  const log = {
    user_id: userId,
    provider: 'openai',
    model_name: 'text-embedding-3-small',
    actual_tokens: tokensUsed,
    request_type: 'embedding' as const,
    success,
    error_message: errorMessage,
    response_time_ms: responseTimeMs,
    created_at: new Date().toISOString()
  }

  await supabase.from('request_logs').insert(log)
}

// Store embedding in PostgreSQL with pgvector
async function storeEmbedding(
  userId: string,
  contentHash: string,
  contentType: 'interaction' | 'contact' | 'topic',
  embedding: number[],
  metadata: Record<string, any>
): Promise<string> {
  const embeddingRecord: ContentEmbedding = {
    user_id: userId,
    content_hash: contentHash,
    content_type: contentType,
    embedding,
    metadata, // Metadata only, never user content or generated text
    created_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('context_embeddings')
    .insert(embeddingRecord)
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to store embedding: ${error.message}`)
  }

  return data.id
}

// Check if embedding already exists
async function findExistingEmbedding(
  userId: string,
  contentHash: string
): Promise<ContentEmbedding | null> {
  const { data, error } = await supabase
    .from('context_embeddings')
    .select('*')
    .eq('user_id', userId)
    .eq('content_hash', contentHash)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking existing embedding:', error)
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
    
    // Support both single and batch requests
    let requests: EmbeddingRequest[]
    
    if (Array.isArray(body.requests)) {
      // Batch request
      const validationResult = BatchEmbeddingRequestSchema.safeParse(body)
      if (!validationResult.success) {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid batch request format',
            details: validationResult.error.issues 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      requests = validationResult.data.requests
    } else {
      // Single request
      const validationResult = EmbeddingRequestSchema.safeParse(body)
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
      requests = [validationResult.data]
    }

    // Check rate limiting
    const rateLimitCheck = await checkEmbeddingRateLimit(user.id)
    if (!rateLimitCheck.allowed) {
      return new Response(
        JSON.stringify({ error: rateLimitCheck.error }),
        { 
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check API key availability
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { 
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const embeddingAdapter = new OpenAIEmbeddingAdapter(openaiApiKey)
    const results: EmbeddingResponse[] = []
    let totalTokensUsed = 0

    // Process each embedding request
    for (const request of requests) {
      const contentHash = hashContent(request.text)
      
      // Check if embedding already exists
      const existingEmbedding = await findExistingEmbedding(user.id, contentHash)
      
      if (existingEmbedding) {
        // Return cached embedding
        results.push({
          embedding: existingEmbedding.embedding,
          contentHash,
          dimensions: embeddingAdapter.getDimensions(),
          model: embeddingAdapter.getModel(),
          tokensUsed: 0 // No tokens used for cached result
        })
        continue
      }

      // Generate new embedding
      const { embedding, tokensUsed } = await embeddingAdapter.generateEmbedding(request.text)
      totalTokensUsed += tokensUsed

      // Store embedding in PostgreSQL with pgvector
      await storeEmbedding(
        user.id,
        contentHash,
        request.contentType,
        embedding,
        request.metadata || {}
      )

      results.push({
        embedding,
        contentHash,
        dimensions: embeddingAdapter.getDimensions(),
        model: embeddingAdapter.getModel(),
        tokensUsed
      })
    }

    // Log successful request
    const responseTime = Date.now() - startTime
    await logEmbeddingRequest(
      user.id,
      true,
      responseTime,
      totalTokensUsed
    )

    // Return response
    const response = {
      success: true,
      embeddings: results,
      metadata: {
        model: embeddingAdapter.getModel(),
        dimensions: embeddingAdapter.getDimensions(),
        totalTokensUsed,
        responseTimeMs: responseTime,
        cached: results.filter(r => r.tokensUsed === 0).length,
        generated: results.filter(r => r.tokensUsed > 0).length
      }
    }

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Embedding endpoint error:', error)
    
    const responseTime = Date.now() - startTime
    
    // Try to log failed request if we have user context
    try {
      const authHeader = req.headers.get('Authorization')
      if (authHeader) {
        const { data: { user } } = await supabase.auth.getUser(
          authHeader.replace('Bearer ', '')
        )
        if (user) {
          await logEmbeddingRequest(
            user.id,
            false,
            responseTime,
            undefined,
            error instanceof Error ? error.message : 'Unknown error'
          )
        }
      }
    } catch (logError) {
      console.error('Failed to log embedding error:', logError)
    }

    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})