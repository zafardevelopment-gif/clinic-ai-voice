import OpenAI from 'openai'

/**
 * OpenRouter LLM client.
 *
 * OpenRouter is OpenAI-API-compatible — we point the OpenAI SDK at its base
 * URL and use the same chat.completions interface. This lets us swap between
 * Claude Haiku, GPT-4o-mini, Llama, etc. by only changing the `model` field.
 *
 * Cost note: For voice agent intent + reply generation, claude-haiku-4-5
 * (~$1/M input, ~$5/M output) hits the right speed/cost/quality balance.
 * Fallback to gpt-4o-mini if Anthropic is degraded.
 */

let cachedClient: OpenAI | null = null

export function getOpenRouterClient(): OpenAI {
  if (cachedClient) return cachedClient

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set in environment')
  }

  cachedClient = new OpenAI({
    apiKey,
    baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      // OpenRouter uses these for analytics / rate-limit attribution.
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'ClinicAI Voice Agent',
    },
  })
  return cachedClient
}

export const DEFAULT_MODEL =
  process.env.OPENROUTER_DEFAULT_MODEL || 'anthropic/claude-haiku-4-5'
export const FALLBACK_MODEL =
  process.env.OPENROUTER_FALLBACK_MODEL || 'openai/gpt-4o-mini'

export interface LlmCallOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  /** If true, falls back to FALLBACK_MODEL on the first request error. */
  withFallback?: boolean
}

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LlmResult {
  content: string
  model: string
  inputTokens: number
  outputTokens: number
  latencyMs: number
}

/**
 * Run a chat completion. Returns the raw text + usage metrics so callers can
 * log per-turn latency and cost into call_messages.
 */
export async function chatCompletion(
  messages: LlmMessage[],
  options: LlmCallOptions = {},
): Promise<LlmResult> {
  const client = getOpenRouterClient()
  const primaryModel = options.model || DEFAULT_MODEL
  const start = Date.now()

  const run = async (model: string): Promise<LlmResult> => {
    const response = await client.chat.completions.create({
      model,
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 400,
    })
    const choice = response.choices[0]
    return {
      content: choice?.message?.content?.trim() || '',
      model,
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      latencyMs: Date.now() - start,
    }
  }

  try {
    return await run(primaryModel)
  } catch (err) {
    if (!options.withFallback) throw err
    console.warn(
      `[openrouter] primary model ${primaryModel} failed, falling back to ${FALLBACK_MODEL}:`,
      err instanceof Error ? err.message : err,
    )
    return await run(FALLBACK_MODEL)
  }
}

/**
 * Parse the model's response as JSON. Useful for tool-call-style structured
 * output (intent classification, slot extraction). Throws if the response
 * isn't valid JSON.
 */
export function parseJsonResponse<T>(content: string): T {
  // LLMs sometimes wrap JSON in ```json ... ``` fences. Strip them.
  const cleaned = content
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()
  return JSON.parse(cleaned) as T
}
