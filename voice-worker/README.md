# Clinic Voice Worker

Real-time AI receptionist worker. Twilio Media Streams ⇄ Sarvam STT/TTS ⇄
OpenRouter LLM. Replaces the slow `<Gather>` turn loop with a low-latency
WebSocket conversation.

## Flow

```
Caller ──audio──► Twilio ──Media Stream (WS)──► this worker
                                                  │  buffer + silence detect
                                                  ▼
                                          Sarvam STT (audio→text)
                                                  ▼
                                          agent.js (LLM + booking)
                                                  ▼
                                          Sarvam TTS (text→mulaw)
Caller ◄──audio── Twilio ◄──media frames─────────┘
```

## Local run

```bash
cd voice-worker
npm install
cp .env.example .env   # fill in the keys
npm run dev
```

Health check: open http://localhost:8080 → "clinic-voice-worker ok".

To test the WS end-to-end you need Twilio to reach it, so use a tunnel
(ngrok) or deploy to Render.

## Deploy on Render (free tier)

1. Push this `voice-worker/` folder to its own GitHub repo (or a subdir repo).
2. Render → New → **Web Service** → connect the repo.
3. Settings:
   - Build command: `npm install`
   - Start command: `npm start`
   - Instance type: **Free**
4. Add all env vars from `.env.example` (real values).
5. Deploy. Render gives a URL like `https://clinic-voice-worker.onrender.com`.
   The WebSocket URL is the same host with `wss://`.

> Free tier sleeps after ~15 min idle; the first call after sleep waits
> ~30–50s for cold start. Fine for dev/testing. Upgrade for production.

## Connect Twilio (in the Next.js app)

Set in the Next.js app's environment (Vercel):

```
VOICE_WORKER_URL=wss://clinic-voice-worker.onrender.com
```

`incoming-call/route.ts` already switches to `<Connect><Stream>` when this is
set, passing `callId` as a stream parameter. No Twilio console change needed
beyond the existing incoming-call webhook.

## Notes / tuning

- Turn detection is energy-based VAD in `server.js` (SILENCE_MS, ENERGY_THRESHOLD).
  Tune if it cuts callers off or waits too long.
- STT/TTS are REST calls (Sarvam has no public WS STT documented); latency is
  far better than `<Gather>` but not literally instant. Biggest win is no
  Twilio STT/TTS round-trips and our own short silence window.
- Business logic (booking, knowledge base, finalize) mirrors the Next.js
  turn route so behaviour stays consistent.
