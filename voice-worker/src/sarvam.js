// Sarvam STT + TTS helpers. Both use the REST API (api.sarvam.ai) with the
// `api-subscription-key` header. Audio for Twilio is mulaw @ 8000 Hz.

const SARVAM_URL = process.env.SARVAM_API_URL || 'https://api.sarvam.ai'
const KEY = process.env.SARVAM_API_KEY

/**
 * Transcribe mulaw/8k audio to text.
 * We wrap the raw mulaw bytes in a WAV container (mulaw codec) so Sarvam can
 * decode it, and send as multipart/form-data.
 *
 * @param {Buffer} mulawBuffer raw 8-bit mulaw samples @ 8000 Hz
 * @param {string} languageCode e.g. 'hi-IN', or 'unknown' for auto-detect
 * @returns {Promise<string>} transcript text
 */
export async function transcribe(mulawBuffer, languageCode = 'unknown') {
  const wav = mulawToWav(mulawBuffer, 8000)
  const form = new FormData()
  form.append('file', new Blob([wav], { type: 'audio/wav' }), 'audio.wav')
  // saaras:v3 covers the most Indian languages incl. Maithili (mai-IN), Urdu.
  form.append('model', 'saaras:v3')
  if (languageCode && languageCode !== 'unknown') {
    form.append('language_code', languageCode)
  }

  const res = await fetch(`${SARVAM_URL}/speech-to-text`, {
    method: 'POST',
    headers: { 'api-subscription-key': KEY },
    body: form,
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Sarvam STT ${res.status}: ${txt}`)
  }
  const data = await res.json()
  return (data.transcript || '').trim()
}

/**
 * Synthesize text to mulaw/8k audio (base64), ready to stream back to Twilio.
 *
 * @param {string} text
 * @param {string} targetLanguage e.g. 'hi-IN'
 * @param {string} speaker Sarvam voice id (e.g. 'anushka', 'abhilash')
 * @returns {Promise<Buffer>} raw mulaw bytes @ 8000 Hz
 */
export async function synthesize(text, targetLanguage = 'hi-IN', speaker = 'anushka') {
  const res = await fetch(`${SARVAM_URL}/text-to-speech`, {
    method: 'POST',
    headers: {
      'api-subscription-key': KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: text.slice(0, 1500),
      target_language_code: targetLanguage,
      speaker,
      model: 'bulbul:v2',
      speech_sample_rate: 8000,
      output_audio_codec: 'mulaw',
    }),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Sarvam TTS ${res.status}: ${txt}`)
  }
  const data = await res.json()
  const b64 = (data.audios && data.audios[0]) || ''
  return Buffer.from(b64, 'base64')
}

// Languages Sarvam TTS can actually speak. Anything else falls back to Hindi
// (e.g. Maithili/Bhojpuri have no TTS voice — we still answer, just in Hindi).
const TTS_LANGS = ['hi-IN', 'en-IN', 'bn-IN', 'gu-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'od-IN', 'pa-IN', 'ta-IN', 'te-IN']

/**
 * Best-effort detect of the language to speak, based on the Unicode script of
 * the reply text. Returns a Sarvam-supported target_language_code.
 */
export function detectTtsLanguage(text, fallback = 'hi-IN') {
  if (!text) return fallback
  const has = re => re.test(text)
  if (has(/[ঀ-৿]/)) return 'bn-IN' // Bengali
  if (has(/[઀-૿]/)) return 'gu-IN' // Gujarati
  if (has(/[ಀ-೿]/)) return 'kn-IN' // Kannada
  if (has(/[ഀ-ൿ]/)) return 'ml-IN' // Malayalam
  if (has(/[଀-୿]/)) return 'od-IN' // Odia
  if (has(/[਀-੿]/)) return 'pa-IN' // Gurmukhi (Punjabi)
  if (has(/[஀-௿]/)) return 'ta-IN' // Tamil
  if (has(/[ఀ-౿]/)) return 'te-IN' // Telugu
  // Devanagari covers Hindi/Marathi/Maithili/Bhojpuri — speak as Hindi.
  if (has(/[ऀ-ॿ]/)) return 'hi-IN'
  // Mostly Latin letters → English.
  if (has(/[A-Za-z]/)) return 'en-IN'
  return TTS_LANGS.includes(fallback) ? fallback : 'hi-IN'
}

/** Wrap raw mulaw samples in a minimal WAV (format 7 = mulaw) container. */
function mulawToWav(pcmMulaw, sampleRate) {
  const dataSize = pcmMulaw.length
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + dataSize, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16) // fmt chunk size
  header.writeUInt16LE(7, 20) // audio format 7 = mulaw
  header.writeUInt16LE(1, 22) // channels
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate, 28) // byte rate (1 byte/sample)
  header.writeUInt16LE(1, 32) // block align
  header.writeUInt16LE(8, 34) // bits per sample
  header.write('data', 36)
  header.writeUInt32LE(dataSize, 40)
  return Buffer.concat([header, pcmMulaw])
}
