/**
 * Maps the clinic-selected voice_type (shown in AI Setup) to a concrete
 * Amazon Polly voice that Twilio's <Say> supports, plus the matching language
 * tag. Keep these IDs in sync with the VOICES list in the voice-config page.
 *
 * Note: Polly's Indian-language catalogue is limited. Hindi has one female
 * voice (Aditi); "male Hindi" falls back to an Indian-English male voice.
 */
export interface VoiceProfile {
  /** Twilio <Say voice="..."> value. */
  polly: string
  /** Default language tag for this voice. */
  language: string
}

const VOICE_MAP: Record<string, VoiceProfile> = {
  priya:  { polly: 'Polly.Aditi',   language: 'hi-IN' }, // Hindi female
  arjun:  { polly: 'Polly.Aditi',   language: 'hi-IN' }, // Hindi male (no Polly Hindi male — keep female)
  riya:   { polly: 'Polly.Raveena', language: 'en-IN' }, // Indian English female
  rahul:  { polly: 'Polly.Brian',   language: 'en-GB' }, // English male
  savita: { polly: 'Polly.Aditi',   language: 'hi-IN' }, // Urdu female → closest is Hindi female
  suresh: { polly: 'Polly.Brian',   language: 'en-GB' }, // Urdu male → English male fallback
}

const DEFAULT: VoiceProfile = { polly: 'Polly.Aditi', language: 'hi-IN' }

/** Resolve a clinic voice_type to a Polly voice + language. */
export function resolveVoice(voiceType?: string | null): VoiceProfile {
  if (!voiceType) return DEFAULT
  return VOICE_MAP[voiceType] || DEFAULT
}
