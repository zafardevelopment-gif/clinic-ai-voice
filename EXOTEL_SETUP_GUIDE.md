# Exotel Setup Guide — India ka Local Number (Follow-Along)

> **Yeh guide kaise use karein:** Is file ko Claude Code (ya Cursor) mein khol kar
> rakhein. Har step ek checkbox `[ ]` hai. Jab step poora ho jaaye, AI se bolein
> *"Step N ho gaya, agla batao"* — ya jahan ⚙️ **AI se bolo** likha hai, woh
> command AI ko de dein, woh aapke liye code/config kar dega.
>
> **Goal:** Twilio sirf USA number de raha hai. Exotel se India ka local number
> lekar usmein apna realtime Sarvam AI voice agent chalana.

---

## ⚠️ Sabse pehle yeh samjho (CRITICAL)

Aapka AI **realtime WebSocket audio** pe chalta hai (Twilio Media Streams → Sarvam
voice worker). Exotel pe iska equivalent **"Voicebot Streaming"** hai — yeh ek
**alag paid/enterprise plan** hai.

- ✅ **Voicebot Streaming MILA** → poora Hindi AI conversation India number pe chalega.
- ❌ **Nahi mila** → sirf keypad IVR menu chalega (full AI baat-cheet nahi).

👉 **Account banane se PEHLE Exotel sales se yeh 2 cheez confirm karo:**
1. "Voicebot Streaming (bidirectional WebSocket audio) available hai kya?"
2. Uska monthly price kitna hai?

Agar yeh bahut mehenga / enterprise-only hai → niche **Plan B (Forwarding)** dekho.

---

## Phase 1 — Exotel Account + KYC

- [x] **1.1** [exotel.com](https://exotel.com) pe **business account** banao. ✅ DONE
- [x] **1.2** KYC documents upload karo: ✅ DONE (sab "Not Verified" — normal hai)
  - [x] Company PAN Card
  - [x] Certificate of Incorporation
  - [x] Company Address Proof
  - [x] Passport Size Photo
- [ ] **1.3** ⏳ **ABHI YAHAN HAIN** — Exotel verification ka wait karo
      (**2 se 7 working days**). "Not Verified" → "Verified" hone ka intezaar.
      KYC Status "Incomplete" → "Complete" ho jaayega.
- [ ] **1.4** Sales/support se **Voicebot Streaming** confirm karo (upar wali baat) —
      yeh wait ke dauraan kar sakte ho.
- [ ] **1.5** Voicebot Streaming ka **WebSocket connect ka exact ExoML format**
      maang lo (har provider ka alag hota hai). Yeh AI ko code likhne ke liye chahiye.

> 💡 Registered business nahi hai? Clinic ke documents use karo. Bina business
> KYC ke India virtual number lena mushkil hai (regulation).

---

## Phase 2 — India ka Number (ExoPhone) lo

- [ ] **2.1** Account approve hone ke baad dashboard → **ExoPhone** khareedo
      (India ka local landline ya mobile virtual number).
- [ ] **2.2** Yeh number note kar lo — **yahi number patients dial karenge**.
      Example format: `+91 80XXXXXXXX`.

---

## Phase 3 — Webhooks Configure karo (Exotel dashboard)

Apni live app ka URL chahiye hoga. Vercel pe deployed app ka URL, jaise:
`https://clinic-ai-voice.vercel.app`

- [ ] **3.1** Exotel App Bazaar / ExoML applet mein **incoming call webhook** set karo:
  ```
  https://<aapka-vercel-app>/api/voice/incoming-call
  ```
- [ ] **3.2** **Call status callback** set karo (abhi Twilio wala route reuse hoga,
      ya AI naya bana dega):
  ```
  https://<aapka-vercel-app>/api/webhooks/twilio/status
  ```
- [ ] **3.3** Exotel dashboard se **webhook source IPs** copy karo (security ke liye).
      Yeh IPs AI ko code mein daalne honge.

---

## Phase 4 — Code Changes (yeh sab AI karega)

Abhi `src/lib/telephony/exotel-adapter.ts` mein **3 gaps** hain. Niche wali commands
ek-ek karke AI ko do:

- [ ] **4.1 — Webhook IP verification**
  ⚙️ **AI se bolo:**
  > "Exotel ke webhook source IPs `[yahan apne IPs paste karo]` hmain. Inko
  > `EXOTEL_ALLOWED_IPS` mein daal do `exotel-adapter.ts` ke andar."

- [ ] **4.2 — Voicebot Streaming (realtime AI ka connect)**
  ⚙️ **AI se bolo:**
  > "Yeh Exotel ka Voicebot Streaming ExoML format hai: `[Exotel se mila format
  > paste karo]`. Iske hisaab se `exotel-adapter.ts` mein `connectStream` case
  > implement kar do, taaki call ko hamare voice worker (`VOICE_WORKER_URL`) ke
  > WebSocket pe connect kare — Twilio jaisa."

- [ ] **4.3 — Outbound reminder calls (optional, abhi skip kar sakte ho)**
  ⚙️ **AI se bolo (jab reminders chahiye):**
  > "Exotel ke outbound call API se `exotel-adapter.ts` ka `placeOutboundCall`
  > implement kar do. Abhi woh sirf error throw karta hai."

---

## Phase 5 — Environment Variables set karo

Yeh dono jagah set karne hain: **Vercel** (app) aur **Render** (voice worker).

- [ ] **5.1 — Vercel** (Project → Settings → Environment Variables):
  ```
  TELEPHONY_PROVIDER=exotel
  EXOTEL_SID=<your-sid>
  EXOTEL_API_KEY=<key>
  EXOTEL_API_TOKEN=<token>
  EXOTEL_SUBDOMAIN=<e.g. api.exotel.com>
  ```
- [ ] **5.2 — Render** (voice-worker service → Environment): wahi Exotel vars +
      pehle se mojood Sarvam/OpenRouter/Supabase vars.
- [ ] **5.3** Dono services redeploy karo taaki naye env vars load ho.

> ⚙️ **AI se bolo:** "Exotel ke saare env vars `.env.example` aur voice-worker ke
> `.env.example` dono mein add kar do, taaki documented rahein."

---

## Phase 6 — Clinic ka Number DB mein update karo

Aapke code mein clinic apne number se match hoti hai (`twilio_number` column).

- [ ] **6.1** Supabase mein us clinic ki row mein `twilio_number` ko apne naye
      **ExoPhone** se update karo (E.164 format mein, jaise `+9180XXXXXXXX`).

> ⚙️ **AI se bolo (agar confused ho):** "Mujhe Supabase mein clinic ka
> `twilio_number` update karne ka exact SQL ya steps batao mere ExoPhone ke liye."

---

## Phase 7 — Test karo

- [ ] **7.1** Apne India ExoPhone pe call karo.
- [ ] **7.2** Render logs dekho — `[ws] stream start` aana chahiye (matlab streaming
      connect ho gaya), phir greeting `speaking ... bytes`.
- [ ] **7.3** Ek booking try karo end-to-end.
- [ ] **7.4** Agar greeting nahi aaya ya `[ws]` connect nahi hua →
  ⚙️ **AI se bolo:** "Render logs yeh dikha rahe hain: `[logs paste karo]`. Exotel
  streaming connect kyun fail ho raha hai, debug karo."

---

## Plan B — Agar Voicebot Streaming na mile (sasta interim)

Jab tak KYC chal rahi hai, ya streaming mehenga ho, **number forwarding** se kaam
chala sakte ho (code mein `forwarded_from_number` ka support already hai):

- [ ] Aapka koi bhi India SIM/number ko Twilio/Exotel number pe **call forwarding**
      laga do.
- [ ] Supabase mein clinic ki row ka `forwarded_from_number` apne India number se
      set karo.
- [ ] ⚙️ **AI se bolo:** "Main forwarding (Mode 1) use kar raha hoon, mera India
      number `[number]` hai. Setup verify kar do aur batao kya test karun."

> ⚠️ Forwarding mein call quality forwarding chain pe depend karti hai, aur ho
> sakta hai caller ID theek se na aaye. Production ke liye proper ExoPhone behtar hai.

---

## Quick Reference — Aapke code ke important points

| Cheez | File / Value |
|---|---|
| Provider switch | env var `TELEPHONY_PROVIDER=exotel` |
| Incoming call webhook | `/api/voice/incoming-call` |
| Status webhook | `/api/webhooks/twilio/status` |
| Realtime AI connect | `VOICE_WORKER_URL` → `connectStream` (Voicebot Streaming) |
| Exotel adapter (edit yahan) | `src/lib/telephony/exotel-adapter.ts` |
| Clinic match column | `twilio_number` (DB) — ExoPhone yahan daalo |
| Forwarding match column | `forwarded_from_number` (DB) — Plan B |

---

## Aaj ka next action (recommended order)

1. Exotel sales ko email/call → **Voicebot Streaming availability + price** poocho.
2. Saath-saath KYC documents ready karo.
3. Jab account + number + streaming confirm ho → is guide ke **Phase 4** wali
   commands AI ko do, woh code complete kar dega.
