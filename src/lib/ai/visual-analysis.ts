import { chatCompletion, parseJsonResponse } from '@/lib/ai/openrouter'

/**
 * Describes a photo/video frame of a visible complaint area (skin, wound,
 * swelling, etc.) in neutral clinical language. This is the most
 * regulation-sensitive part of the module (spec §6B-ii) — closest to an
 * actual SaMD use case in both India's CDSCO framework and Saudi's SFDA
 * MDS-G010 — so it is kept deliberately restrictive:
 *
 * - Output is descriptive-only by default (color/shape/size/texture/
 *   location), never a named condition.
 * - Differential considerations are only generated when a DOCTOR explicitly
 *   requests them (includeDifferential = true) — never for a patient/ASHA
 *   pre-visit upload. Callers must enforce that distinction; this function
 *   trusts the flag it's given rather than inferring uploader role itself,
 *   so the enforcement point is the route handler (see
 *   /api/clinic/copilot/[id]/media and /api/patient/media).
 */

export interface VisualAnalysisResult {
  description: string
  differentialConsiderations: string[] | null
  confidenceNote: string | null
  warnings: string[]
  aiModel: string | null
}

const DESCRIPTIVE_ONLY_PROMPT = `You are a medical image reading assistant describing a photo/video frame of a visible complaint area (e.g. skin, wound, swelling) for a clinic record.

Rules:
- Describe ONLY observable visual features: color, shape, size estimate, texture, location. Use neutral clinical language.
- Do NOT name a specific disease or condition as fact. Do NOT suggest a diagnosis.
- Output strict JSON only, no markdown fences: { "description": string, "warnings": string[] }
- If the image is unclear or the complaint area isn't visible, say so in warnings and give the best neutral description you still can.`

const WITH_DIFFERENTIAL_PROMPT = `You are a clinical decision-support assistant describing a photo/video frame of a visible complaint area (e.g. skin, wound, swelling) for a DOCTOR during a live consultation. The doctor remains fully responsible for all decisions.

Rules:
- First describe ONLY observable visual features: color, shape, size estimate, texture, location. Neutral clinical language, no diagnosis stated as fact.
- Then, since a doctor has explicitly requested it, add a short list of possible differential considerations tied to those visual features — each one clearly a possibility requiring physician confirmation, never a directive or confirmed fact.
- Output strict JSON only, no markdown fences: { "description": string, "differentialConsiderations": string[], "confidenceNote": string, "warnings": string[] }`

export async function analyzeConditionImage(
  imageDataUrl: string,
  options: { includeDifferential: boolean },
): Promise<VisualAnalysisResult> {
  try {
    const result = await chatCompletion(
      [
        { role: 'system', content: options.includeDifferential ? WITH_DIFFERENTIAL_PROMPT : DESCRIPTIVE_ONLY_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Describe the visible complaint area in this image.' },
            { type: 'image_url', image_url: { url: imageDataUrl } },
          ],
        },
      ],
      { temperature: 0.1, maxTokens: 600, withFallback: true },
    )

    const parsed = parseJsonResponse<{
      description?: string
      differentialConsiderations?: unknown[]
      confidenceNote?: string
      warnings?: unknown[]
    }>(result.content)

    return {
      description: typeof parsed.description === 'string' ? parsed.description : 'Description unavailable — please review the image directly.',
      differentialConsiderations: options.includeDifferential && Array.isArray(parsed.differentialConsiderations)
        ? parsed.differentialConsiderations.map(String)
        : null,
      confidenceNote: options.includeDifferential && typeof parsed.confidenceNote === 'string' ? parsed.confidenceNote : null,
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings.map(String) : [],
      aiModel: result.model,
    }
  } catch (err) {
    console.warn('[visual-analysis] analysis failed:', err)
    return {
      description: 'Could not process this image automatically. A doctor will need to review it directly.',
      differentialConsiderations: null,
      confidenceNote: null,
      warnings: ['AI analysis unavailable'],
      aiModel: null,
    }
  }
}
