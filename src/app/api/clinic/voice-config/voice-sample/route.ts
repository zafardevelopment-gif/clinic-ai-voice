import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

/**
 * GET /api/clinic/voice-config/voice-sample?voice=<id>&lang=<code>
 *
 * Returns a short spoken MP3 sample for the given clinic voice so the user can
 * preview it on the AI Setup page before selecting it. Uses Sarvam TTS.
 */

// Clinic voice id → Sarvam speaker + sample language/line.
const VOICE_MAP: Record<string, { speaker: string; lang: string; line: string }> = {
  priya:  { speaker: 'anushka',  lang: 'hi-IN', line: 'नमस्ते! मैं आपकी एआई रिसेप्शनिस्ट हूँ। मैं आपकी कैसे मदद कर सकती हूँ?' },
  meera:  { speaker: 'vidya',    lang: 'hi-IN', line: 'नमस्ते! क्लिनिक में आपका स्वागत है। मैं आपकी सहायता के लिए हाज़िर हूँ।' },
  anjali: { speaker: 'manisha',  lang: 'hi-IN', line: 'नमस्ते! अपॉइंटमेंट बुक करने के लिए मैं आपकी मदद कर सकती हूँ।' },
  arjun:  { speaker: 'abhilash', lang: 'hi-IN', line: 'नमस्ते! मैं आपकी एआई रिसेप्शनिस्ट हूँ। मैं आपकी कैसे मदद कर सकता हूँ?' },
  rahul:  { speaker: 'karun',    lang: 'hi-IN', line: 'नमस्ते! क्लिनिक में आपका स्वागत है। बताइए मैं क्या मदद करूँ?' },
  vikram: { speaker: 'hitesh',   lang: 'hi-IN', line: 'नमस्ते! अपॉइंटमेंट के लिए मैं आपकी सहायता करूँगा।' },
  riya:   { speaker: 'anushka',  lang: 'en-IN', line: "Hello! I'm your AI receptionist. How may I help you today?" },
  david:  { speaker: 'karun',    lang: 'en-IN', line: "Hello! Welcome to the clinic. How can I assist you today?" },
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const voiceId = req.nextUrl.searchParams.get('voice') || 'priya'
  const v = VOICE_MAP[voiceId] || VOICE_MAP.priya

  const url = (process.env.SARVAM_API_URL || 'https://api.sarvam.ai') + '/text-to-speech'
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'api-subscription-key': process.env.SARVAM_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: v.line,
        target_language_code: v.lang,
        speaker: v.speaker,
        model: 'bulbul:v2',
        speech_sample_rate: 22050,
        output_audio_codec: 'mp3',
      }),
    })
    if (!res.ok) {
      const t = await res.text().catch(() => '')
      return NextResponse.json({ error: `Sarvam ${res.status}: ${t}` }, { status: 502 })
    }
    const data = await res.json()
    const b64 = data?.audios?.[0]
    if (!b64) return NextResponse.json({ error: 'No audio returned' }, { status: 502 })

    const buf = Buffer.from(b64, 'base64')
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400', // samples don't change
      },
    })
  } catch (err) {
    console.error('/voice-sample error:', err)
    return NextResponse.json({ error: 'Failed to generate sample' }, { status: 500 })
  }
}
