# Real-Time Streaming Voice — Implementation Plan

Goal: bring per-turn latency from ~3–4s (current `<Gather>` model) down to
~0.5–1s, like ChatGPT voice mode / a real receptionist.

## Why the current model is slow (and can't be fixed in place)

The current flow is **turn-by-turn (half-duplex)**:

```
caller speaks → Twilio records the WHOLE utterance → STT → our LLM → TTS → speak
               └─ Twilio waits for silence (~1.5s) ─┘        └ Twilio TTS (~0.7s)
```

Twilio only sends us the text **after** the caller finishes and a silence
timeout fires. We can't start thinking earlier. STT + TTS happen on Twilio's
side — outside our control. So ~3–4s is the floor for this architecture.

## The streaming model (full-duplex)

```
caller audio  ─stream─►  Voice Worker ─►  streaming STT (partial transcripts)
                                          │
                                          ▼  (as soon as caller pauses ~300ms)
                                       LLM (streamed tokens)
                                          │
                                          ▼  (first sentence as it arrives)
caller hears  ◄─stream─  Voice Worker ◄─  streaming TTS
```

Audio flows continuously over a WebSocket. We get **partial** transcripts while
the caller is still talking, start the LLM the instant they pause, and start
speaking the first sentence before the LLM has finished. That overlap is what
gets us to sub-second.

## Components needed

1. **Voice Worker (new service)** — a long-running Node WebSocket server.
   - Receives Twilio Media Streams (μ-law 8kHz audio frames over WS).
   - Cannot run on Vercel (serverless = no persistent WebSocket). Host on:
     **Railway, Render, Fly.io, or a small VPS**. ~$5–10/mo.
   - This is the core of the project.

2. **Streaming STT** — converts audio→text incrementally.
   - **Deepgram** (best latency, supports Hindi/Indian English), or
   - **Sarvam** (you already have `SARVAM_API_KEY`; strong Indian languages).
   - Sends interim + final transcripts.

3. **Streaming LLM** — already have OpenRouter; switch to `stream: true` so we
   get tokens as they generate and can start TTS on the first sentence.

4. **Streaming TTS** — text→audio incrementally.
   - **Sarvam TTS** (Indian voices, you have the key) or Deepgram Aura/
     ElevenLabs. Must support streaming + μ-law 8kHz output for Twilio.

5. **Twilio change** — instead of `<Gather>`, return:
   ```xml
   <Connect><Stream url="wss://worker.example.com/ws/<callId>"/></Connect>
   ```
   The `connectStream` instruction + adapter skeleton already exist in this repo
   (`src/lib/telephony/twilio-adapter.ts`), and `incoming-call/route.ts` already
   switches to it when `VOICE_WORKER_URL` is set. So the Next.js side is ~80%
   ready; the worker is the new build.

## What stays the same (reused from current work)

- All business logic: clinic lookup, doctor matching, the booking flow, patient
  creation, call finalize, knowledge base, personality, language handling.
- The worker calls the SAME Supabase tables and can reuse the booking/finalize
  helpers (extract them from `turn/route.ts` into a shared `lib/voice-agent`).
- AI Setup page, voice selection, transcripts — unchanged.

## Build phases

- **Phase 1 — Worker skeleton**: WS server, accept Twilio Media Stream, echo a
  fixed greeting via TTS. Proves audio in/out works. (~1–2 days)
- **Phase 2 — STT + LLM + TTS pipeline**: wire streaming STT → LLM → TTS with
  barge-in (caller can interrupt). (~2–4 days)
- **Phase 3 — Business logic**: port booking/knowledge/finalize from
  `turn/route.ts`; persist transcripts + duration + outcome. (~1–2 days)
- **Phase 4 — Deploy + tune**: host the worker, set `VOICE_WORKER_URL`, latency
  tuning, fallbacks. (~1–2 days)

## Costs / trade-offs

- New always-on hosting (~$5–10/mo) — Vercel alone can't do this.
- STT/TTS per-minute usage costs (Deepgram/Sarvam).
- More moving parts to monitor than the current single Next.js app.
- Bigger upfront effort, but the only path to truly fast conversational voice.

## Decision points for you

1. **Hosting** for the worker: Railway (easiest) / Render / Fly.io / VPS?
2. **STT + TTS vendor**: Sarvam (you have the key, great for Hindi/Indian
   languages) vs Deepgram (lowest latency, strong English)?
3. **Scope now**: build the full worker, or start with Phase 1 as a proof?
