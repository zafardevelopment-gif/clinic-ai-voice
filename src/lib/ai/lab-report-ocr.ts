import { chatCompletion, parseJsonResponse } from '@/lib/ai/openrouter'
import { deriveFlag } from '@/lib/ai/lab-explanation'
import type { LabMarkerFlag } from '@/types/database'

/**
 * Extracts individual test markers (name/value/unit/reference range) from a
 * photo of a lab report, using the same vision pipeline as
 * prescription-ocr.ts. This is what src/app/api/clinic/lab-reports/[id]/upload/route.ts's
 * comment calls the "V2 path" — used here for the patient app's self-upload
 * flow, where there's no staff member to manually enter markers.
 *
 * Like prescription OCR, this is extraction only — `flag` is always
 * recomputed deterministically via deriveFlag() rather than trusted from
 * the model, matching how explainLabReport() already treats 'critical' as
 * too safety-sensitive to leave to LLM judgment alone.
 */

export interface ExtractedMarker {
  marker_name: string
  value: string
  unit: string | null
  reference_range: string | null
  flag: LabMarkerFlag
}

export interface LabReportOcrResult {
  markers: ExtractedMarker[]
  warnings: string[]
  aiModel: string | null
}

const SYSTEM_PROMPT = `You extract individual test results from a photo of a lab/pathology report.

Rules:
- Extract ONLY rows you can legibly read. Never guess a value.
- Include the reference range exactly as printed if present (e.g. "70-110", "4.5-11.0 x10^9/L").
- Do not diagnose or interpret — extraction only.
- Output strict JSON only, no markdown fences, matching this shape:
{
  "markers": [
    { "marker_name": string, "value": string, "unit": string | null, "reference_range": string | null }
  ],
  "warnings": string[] (e.g. "Page 2 is not fully legible")
}
If nothing is legible, return an empty markers array and a warning explaining why.`

export async function extractLabMarkersFromImage(imageDataUrl: string): Promise<LabReportOcrResult> {
  try {
    const result = await chatCompletion(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract the test results from this lab report photo.' },
            { type: 'image_url', image_url: { url: imageDataUrl } },
          ],
        },
      ],
      { temperature: 0.1, maxTokens: 1500, withFallback: true },
    )

    const parsed = parseJsonResponse<{ markers?: unknown[]; warnings?: unknown[] }>(result.content)
    const markers = Array.isArray(parsed.markers) ? parsed.markers.map(normalizeMarker).filter((m): m is ExtractedMarker => m !== null) : []
    const warnings = Array.isArray(parsed.warnings) ? parsed.warnings.map(String) : []

    if (markers.length === 0 && warnings.length === 0) {
      warnings.push('No test results could be confidently read from this image.')
    }

    return { markers, warnings, aiModel: result.model }
  } catch (err) {
    console.warn('[lab-report-ocr] extraction failed:', err)
    return {
      markers: [],
      warnings: ['Could not process this image automatically. You can enter results manually instead.'],
      aiModel: null,
    }
  }
}

function normalizeMarker(raw: unknown): ExtractedMarker | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  const name = typeof r.marker_name === 'string' ? r.marker_name.trim() : ''
  const value = typeof r.value === 'string' ? r.value.trim() : ''
  if (!name || !value) return null

  const referenceRange = typeof r.reference_range === 'string' && r.reference_range.trim() ? r.reference_range.trim() : undefined
  return {
    marker_name: name,
    value,
    unit: typeof r.unit === 'string' && r.unit.trim() ? r.unit.trim() : null,
    reference_range: referenceRange || null,
    flag: deriveFlag(value, referenceRange),
  }
}
