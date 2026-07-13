import { chatCompletion, parseJsonResponse } from '@/lib/ai/openrouter'

/**
 * Extracts a draft medicine list from a photo of a prescription using a
 * vision-capable OpenRouter model. This is a DRAFT ONLY — the patient app
 * must always show the extracted list for the patient to confirm/edit
 * before it's saved as a `patient_medicines` row (see
 * POST /api/patient/prescriptions/ocr and POST /api/patient/medicines).
 * Never auto-save unconfirmed OCR output, regardless of how confident the
 * extraction looks — matches the guardrails.ts philosophy of never
 * asserting unverified medical claims.
 */

export interface OcrMedicineDraft {
  medicine_name: string
  dosage: string | null
  frequency: string | null
  duration_days: number | null
  times_of_day: string[]
  /** Model's own confidence note — surfaced to the patient, not used for any automated decision. */
  raw_text_matched: string
}

export interface PrescriptionOcrResult {
  medicines: OcrMedicineDraft[]
  warnings: string[]
  aiModel: string | null
}

const SYSTEM_PROMPT = `You extract medicine information from a photo of a doctor's prescription for a patient-facing app.

Rules:
- Extract ONLY what is legibly written. Never guess, complete, or infer a medicine name, dosage, or frequency you cannot actually read.
- If handwriting is unclear for a field, leave it null rather than guessing.
- Do not add medical advice, dosage corrections, or commentary — extraction only.
- Output strict JSON only, no markdown fences, matching this shape:
{
  "medicines": [
    {
      "medicine_name": string,
      "dosage": string | null,
      "frequency": string | null,
      "duration_days": number | null,
      "times_of_day": string[] (24h "HH:MM" format, empty array if not determinable from frequency text),
      "raw_text_matched": string (the exact text segment you read this from)
    }
  ],
  "warnings": string[] (e.g. "Handwriting for item 2 dosage is unclear", "Image quality is low")
}
If no medicines are legible at all, return an empty medicines array and a warning explaining why.`

export async function extractPrescriptionFromImage(imageDataUrl: string): Promise<PrescriptionOcrResult> {
  try {
    const result = await chatCompletion(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract the medicines from this prescription photo.' },
            { type: 'image_url', image_url: { url: imageDataUrl } },
          ],
        },
      ],
      { temperature: 0.1, maxTokens: 1200, withFallback: true },
    )

    const parsed = parseJsonResponse<{ medicines?: unknown[]; warnings?: unknown[] }>(result.content)
    const medicines = Array.isArray(parsed.medicines) ? parsed.medicines.map(normalizeMedicine).filter((m): m is OcrMedicineDraft => m !== null) : []
    const warnings = Array.isArray(parsed.warnings) ? parsed.warnings.map(String) : []

    if (medicines.length === 0 && warnings.length === 0) {
      warnings.push('No medicines could be confidently read from this image.')
    }

    return { medicines, warnings, aiModel: result.model }
  } catch (err) {
    console.warn('[prescription-ocr] extraction failed:', err)
    return {
      medicines: [],
      warnings: ['Could not process this image automatically. Please add medicines manually instead.'],
      aiModel: null,
    }
  }
}

function normalizeMedicine(raw: unknown): OcrMedicineDraft | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  const name = typeof r.medicine_name === 'string' ? r.medicine_name.trim() : ''
  if (!name) return null

  const timesOfDay = Array.isArray(r.times_of_day)
    ? r.times_of_day.filter((t): t is string => typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t))
    : []

  return {
    medicine_name: name,
    dosage: typeof r.dosage === 'string' && r.dosage.trim() ? r.dosage.trim() : null,
    frequency: typeof r.frequency === 'string' && r.frequency.trim() ? r.frequency.trim() : null,
    duration_days: typeof r.duration_days === 'number' && Number.isFinite(r.duration_days) ? r.duration_days : null,
    times_of_day: timesOfDay,
    raw_text_matched: typeof r.raw_text_matched === 'string' ? r.raw_text_matched : '',
  }
}
