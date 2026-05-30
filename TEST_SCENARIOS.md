# ClinicAI — Test Scenarios

End-to-end test plan for the platform: admin panel, clinic panel, and the AI
voice agent (call flow). Use this to verify everything works before a demo or
production rollout.

## Test environment

| Item | Value |
|------|-------|
| App (web) | https://clinic-ai-voice.vercel.app |
| Voice worker | https://clinic-voice-worker.onrender.com (Render free tier — sleeps after 15 min idle) |
| Twilio number (call this) | **+1 269 280 0645** |
| Test clinic | Test Clinic |
| Doctor | Wahaj (Cardiologist) |
| Department | Cardiology |
| Clinic login | testclinic1@gmail.com |
| Admin login | admin@clinicai.com |

> **Before any call test:** open the worker URL once in a browser to wake it
> (free tier cold-start ~30–50s), then call within a couple of minutes.

> **Voice engine:** `VOICE_ENGINE=sarvam` (current, best Indian voice, ~4–5s
> pause) or `VOICE_ENGINE=openai` (production, ~1s, needs direct OpenAI key).

---

## 1. Admin panel (login: admin@clinicai.com)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| A1 | Login | Open /login, enter admin creds | Redirects to /admin/dashboard |
| A2 | Clinics list | Go to Clinics | Test Clinic + any others show |
| A3 | Create clinic | + New Clinic → fill form → Create | Appears in list immediately (no refresh) |
| A4 | Edit clinic | Clinics → Edit → change city → Save | Change saved + visible immediately |
| A5 | Create clinic user | Users → Invite User → role Clinic Admin, assign a clinic, set password → Send | User appears in list; can log in |
| A6 | All calls | All Calls | Recent calls listed with clinic/phone |
| A7 | Analytics | Analytics / Dashboard | Counts load (total calls, booked, etc.) |

---

## 2. Clinic panel (login: testclinic1@gmail.com)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| C1 | Login routing | Login as clinic user | Lands on /clinic/dashboard, sees only own clinic |
| C2 | Add doctor | Doctors → add (name + department) | Saved, shows in list |
| C3 | Add department | Departments → add | Saved |
| C4 | Availability | Availability → set doctor timings → Save | Saved |
| C5 | Voice Config — greeting | AI Setup → edit Hindi/English greeting → Save | Saved; used on next call |
| C6 | Voice Config — working hours | AI Setup → **🕐 All Day (24/7)** → Save Configuration | Hours become 00:00–23:59 all days |
| C7 | Voice Config — office hours | AI Setup → **🏢 Mon–Sat 9–6** → Save | Sunday off, Mon–Sat 09:00–18:00 |
| C8 | Voice Config — personality | AI Setup → set Tone + Custom Instructions → Save | AI follows them on calls/test |
| C9 | Voice Config — knowledge base | AI Setup → fill Specialties / Symptom map / FAQs → Save | AI uses them to answer |
| C10 | Voice Config — voice select | AI Dashboard → pick a voice → Save | Call uses that voice |
| C11 | **Test AI chat** | AI Setup → 🧪 Test AI → type "mujhe appointment chahiye" | AI replies in chat using saved config (no call needed) |
| C12 | Appointments | Appointments | AI-booked appointments listed (VIA = AI Voice) |
| C13 | Call Logs → transcript | Call Logs → View Chat | Full conversation + duration + outcome |
| C14 | Reminder logs | Reminders → Logs | Loads (empty if none) |

---

## 3. AI voice call — happy path (call +1 269 280 0645)

> Pre-req: clinic hours include "now" (use All Day 24/7 for testing), voice
> agent enabled, at least one doctor exists.

| # | Scenario | What you say | Expected AI behaviour |
|---|----------|--------------|-----------------------|
| V1 | Greeting | (just call) | Trial msg (Twilio) → greeting "नमस्ते / Hello, Test Clinic…" |
| V2 | Ask doctors | "कौन से डॉक्टर हैं?" | Lists Dr. Wahaj (Cardiologist) |
| V3 | Symptom routing | "सीने में दर्द है" | Suggests Cardiology / Dr. Wahaj |
| V4 | Full booking | "appointment book karni hai" → doctor Wahaj → naam → date → time → "haan" | Asks one thing at a time, then "हो गया! appointment book हो गया" |
| V5 | Verify booking | After V4, check clinic → Appointments | New row: patient, Wahaj, date/time, AI Voice, Scheduled |
| V6 | Fees question | "doctor ki fees kitni hai?" | Answers from knowledge base OR "front desk confirm karega" — does NOT book |
| V7 | Clinic location | "clinic kahan hai?" | Reads address/city from clinic details |
| V8 | End call | "bas, dhanyavaad" | Polite close, call ends |

---

## 4. AI voice call — edge cases

| # | Scenario | What you do | Expected |
|---|----------|-------------|----------|
| E1 | **Slot conflict** | Book the SAME doctor + date + time already booked | AI: "उस समय पहले से अपॉइंटमेंट है, कोई और समय बताइए" — no duplicate created |
| E2 | Out of hours | Set office hours, call outside them | "We are closed, please call between …" then hangs up |
| E3 | Agent disabled | AI Setup → disable agent → Save → call | Fallback message / front-desk transfer (no AI) |
| E4 | Language switch | Start Hindi, then "English please" / another language | AI continues in that language |
| E5 | Silence | Stay quiet after greeting | AI re-prompts "could you say that again?" (doesn't hang up immediately) |
| E6 | Unknown number | Call from a number with no patient record | Books as a new patient using the caller's number |
| E7 | Past/invalid date | Ask for a date in the past | AI should ask for a valid upcoming date |
| E8 | No doctor match | Ask for a doctor not in the list | AI suggests an available doctor or says front desk will confirm |

---

## 5. What to watch in Render logs (during a call)

Open Render → clinic-voice-worker → Logs (Live tail). For a healthy call you
should see, in order:

```
[ws] stream start, callId=...
caller: <your words>                    ← Sarvam STT worked
ai: <reply>                              ← LLM replied
speaking NNNN bytes (hi-IN)              ← TTS sent (language matches reply)
conflict check Wahaj <date> <time>: ...  ← only on a booking attempt
[ws] stream stop / closed
```

Red flags:
- No `caller:` line → STT/VAD issue (speak louder, or tune thresholds)
- `speaking ... (en-IN)` for a Hindi reply → AI replied in Roman letters
- `clash=true` but a duplicate still appears → conflict-check regression

---

## 6. Known limitations (expected, not bugs)

- **Speed (Sarvam):** ~4–5s pause per turn. This is the Sarvam REST pipeline;
  production should use `VOICE_ENGINE=openai` for ~1s, natural turn-taking.
- **Maithili/Bhojpuri voice:** understood (STT) but spoken in a Hindi voice —
  Sarvam TTS has no voice for these. Major languages (Hindi, Bengali, Tamil,
  Telugu, Gujarati, Punjabi, Kannada, Malayalam, Marathi, Odia, English) speak
  in their own voice.
- **Render free tier:** sleeps after 15 min idle → first call after sleep waits
  ~30–50s. Wake the worker URL before testing, or upgrade for production.
- **Trial Twilio message:** the "trial account" intro plays before the greeting
  until the Twilio account is upgraded.

---

## 7. Reset / cleanup helpers

- **Working hours for testing:** AI Setup → 🕐 All Day (24/7) → Save.
- **Remove test appointments:** Clinic → Appointments → Update/cancel rows.
- **Switch voice engine:** Render → Environment → `VOICE_ENGINE` = `sarvam` or
  `openai` (+ `OPENAI_API_KEY`) → redeploy.
