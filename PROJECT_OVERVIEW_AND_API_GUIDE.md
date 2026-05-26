# ClinicPing — Project Overview & API Setup Guide

**Yeh ek single file hai jisme 2 cheezein hain:**
1. **Project Overview** — yeh app actually karti kya hai, end-to-end
2. **API Setup Guide** — har service ka account kaise banaye, key kahan se le, kahan paste kare

Read top-to-bottom. Total setup time: **3-4 hours** for the must-haves, rest optional.

---

# PART 1 — Project Overview

## Ek line mein
**ClinicPing** = Indian clinics ke liye AI-powered **automatic voice call reminder** system. Doctor ko patient ko khud call nahi karna padta — system khud kar deta hai, patient phone pe 1/2/3 dabake confirm/reschedule/cancel kar deta hai.

## Asal Business Problem
- India ke 6 lakh+ chote clinics mein **30-40% patients appointment bhool jaate hain** = direct revenue loss
- Receptionist roz subah 20-30 manual calls/WhatsApp karta hai = 1-2 ghante barbaad
- Post-visit follow-up koi nahi karta = patient dobara nahi aata (retention -40%)

## ClinicPing ka Solution
| Feature | Kaise kaam karta hai |
|---------|----------------------|
| **24h reminder** | Appointment se 24 ghante pehle automatic call: "Namaste, kal 5 baje Dr. Sharma ke saath aapka appointment hai. Confirm karne ke liye 1 dabayein, reschedule ke liye 2, cancel ke liye 3." |
| **2h reminder** | Same lekin 2 ghante pehle — last-minute reminder |
| **Post-visit follow-up** | Visit ke 3 din baad: "Aap kaisa feel kar rahe hain? Problem ho to 1 dabayein, theek hain to 2." |
| **Birthday wish** | Patient ke janamdin pe automatic wish + annual checkup reminder |
| **Custom broadcast** | Clinic admin mass message bhej sakta hai (e.g., "Diwali pe 3 din band hain") |
| **Monthly PDF report** | "47 reminders gaye, 38 confirm, 9 reschedule" — auto-generated |

## Business Model (Pricing)
| Plan | Price | Calls/month | Features |
|------|-------|-------------|----------|
| **Trial** | Free 14 days | 100 | Appointment 24h + 2h |
| **Basic** | ₹799/mo | 100 | Appointment reminders only |
| **Pro** ⭐ | ₹1,499/mo | 500 | + Post-visit + Birthday + PDF reports |
| **Premium** | ₹2,999/mo | Unlimited | + Broadcast + Annual checkup + Custom voice |

**Target**: 30 Pro clients × ₹1,499 = **₹45,000/month** revenue.

## Architecture (How it works under the hood)

```
[Patient's Appointment in DB]
        │
        ▼
[Vercel Cron — every 15 minutes]
        │  ENQUEUE: scan appointments 24h / 2h / 3-days-completed → insert reminder rows
        │  DISPATCH: pick due rows, filter by clinic call window (10am-7pm), call Twilio
        ▼
[Twilio dials the patient's number]
        │
        ▼
[Patient picks up]
        │
        ▼
[TwiML route plays the message + asks for DTMF]
        │  Uses Claude Haiku LLM (via OpenRouter) to generate
        │  personalized Hindi/English script
        ▼
[Patient presses 1 / 2 / 3]
        │
        ▼
[Response handler updates DB]
        │  1 = confirmed → appointment confirmed
        │  2 = reschedule → flagged for clinic callback
        │  3 = cancel → appointment auto-cancelled
        ▼
[Clinic dashboard shows results in real-time]
```

## Who uses the app?
1. **Super Admin** (you, Zafar) — manages all clinics, edits subscription plans, grants per-clinic feature overrides
2. **Clinic Admin** (doctor or receptionist) — manages own patients, appointments, reminder settings, sees monthly reports

## Tech Stack
| Layer | Tech |
|-------|------|
| Frontend | Next.js 14 (App Router) + Tailwind CSS v3 |
| Database | Supabase (PostgreSQL) |
| Auth | Custom (bcrypt + cookie session) — NOT Supabase Auth |
| AI | Claude Haiku via OpenRouter (script generation) |
| Telephony | Twilio (dev) / Exotel (India production) |
| Hosting | Vercel (Next.js) + Vercel Cron |
| Payments | Razorpay (when ready) |

---

# PART 2 — API Setup Guide

**Setup priority levels:**
- 🔴 **MUST HAVE** — app won't work without these
- 🟡 **NEED FOR REAL CALLS** — without these, you can only test UI
- 🟢 **OPTIONAL / LATER** — add when scaling

---

## 🔴 1. Supabase (Database) — MUST HAVE

**Kya hai**: Aapka database + storage. Free tier 500MB tak free.
**Cost**: Free for first ~10 clinics. ₹2,000/mo after.
**Time**: 10 minutes

### Step-by-step:

1. **Account banayein**:
   - Go to https://supabase.com
   - Click "Start your project" → Sign up with GitHub (recommended) or email

2. **Naya project banayein**:
   - Click "+ New project"
   - **Organization**: Personal (default)
   - **Project name**: `clinicping`
   - **Database password**: Generate strong one (save it!)
   - **Region**: `Mumbai (ap-south-1)` ← important for India latency
   - **Pricing plan**: Free
   - Click "Create new project" → wait ~2 minutes for provisioning

3. **Keys nikalein**:
   - Left sidebar → **Settings** (gear icon) → **API**
   - Aapko 3 cheezein chahiye:

   | Field | Where to find |
   |-------|---------------|
   | **Project URL** | Top of page: `https://abcdefgh.supabase.co` |
   | **anon / public key** | "Project API keys" section, `anon` row, click "Reveal" |
   | **service_role key** | Same section, `service_role` row, click "Reveal" ⚠️ **SECRET** |

4. **Paste in `.env.local`**:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...    (long string)
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...         (long string, different)
   ```

5. **Database schema apply karein**:
   - Left sidebar → **SQL Editor** → "+ New query"
   - Open `supabase/schema.sql` from project, copy-paste entire content, Run
   - Then open `supabase/RUN_ME_ALL_CHANGES.sql`, copy-paste, Run
   - Verify: `SELECT COUNT(*) FROM subscription_plans;` → should be 4

---

## 🔴 2. OpenRouter (AI Brain) — MUST HAVE

**Kya hai**: LLM gateway jo Claude/GPT use karta hai. Reminder script generate karta hai.
**Cost**: ~$5 (₹420) free credit on signup. After that ~₹0.05 per reminder call (very cheap).
**Time**: 5 minutes

### Step-by-step:

1. **Account banayein**:
   - Go to https://openrouter.ai
   - Click "Sign in" → use Google/GitHub

2. **Credit add karein**:
   - Top right → click your avatar → **Credits**
   - You get $1 free trial credit (~200 calls). Add $5-10 later via card.

3. **API key banayein**:
   - Top right → avatar → **Keys**
   - Click "Create Key"
   - Name: `clinicping-prod`
   - Credit limit: $10 (safety cap)
   - Click "Create" → **copy the key immediately** (shown only once)

4. **Paste in `.env.local`**:
   ```env
   OPENROUTER_API_KEY=sk-or-v1-abc123...
   OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
   OPENROUTER_DEFAULT_MODEL=anthropic/claude-haiku-4-5
   OPENROUTER_FALLBACK_MODEL=openai/gpt-4o-mini
   ```

---

## 🔴 3. App Secrets — MUST HAVE (instant)

**Kya hai**: Random secrets jo aap khud generate karte hain. No account needed.
**Cost**: Free
**Time**: 1 minute

### Step-by-step:

1. **Generate 2 random strings** (Windows PowerShell):
   ```powershell
   # Open PowerShell, run twice:
   -join ((48..57) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
   ```

   Or use online: https://generate-secret.vercel.app/32

2. **Paste in `.env.local`**:
   ```env
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   WORKER_SECRET=<paste first random string>
   CRON_SECRET=<paste second random string>
   ```

   **For production** later: change `NEXT_PUBLIC_APP_URL` to your deployed URL (e.g., `https://clinicping.vercel.app`).

---

## 🟡 4. Twilio (Voice Calls — DEV) — NEED FOR REAL CALLS

**Kya hai**: International telephony API. Use this for development/testing.
**Cost**: $15 free trial credit on signup (~750 minutes). Then ₹3-4/minute.
**Time**: 20 minutes

⚠️ **Note**: Production India ke liye Exotel use karenge (sasta). Twilio sirf dev/testing ke liye.

### Step-by-step:

1. **Account banayein**:
   - Go to https://www.twilio.com/try-twilio
   - Sign up with email
   - Verify your personal phone number (OTP)
   - Skip the "What do you want to build" survey (or pick "Voice")

2. **Trial number lein**:
   - Console → **Phone Numbers** → **Manage** → **Buy a number**
   - Filter: Country = United States (trial mein India number nahi milta)
   - Capabilities: ✓ Voice
   - Pick any number → "Buy" (free with trial credit)
   - Copy the number (e.g., `+14155551234`)

3. **Verify your test number** (trial mein sirf verified numbers ko call kar sakte hain):
   - Console → **Phone Numbers** → **Manage** → **Verified Caller IDs**
   - Click "+ Add a new Caller ID"
   - Enter your Indian phone (`+919xxxxxxxxx`)
   - Twilio will call you with a 6-digit code → enter it

4. **Get API keys**:
   - Console → top of homepage → "Account Info" panel
   - Copy these 2:

   | Field | Label in Twilio |
   |-------|-----------------|
   | **Account SID** | `Account SID` (starts with `AC...`) |
   | **Auth Token** | `Auth Token` (click "Show") |

5. **Paste in `.env.local`**:
   ```env
   TELEPHONY_PROVIDER=twilio
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your-auth-token-here
   TWILIO_OUTBOUND_FROM=+14155551234   # the number you bought in step 2
   ```

6. **For local testing (ngrok)** — Twilio needs a public URL to hit webhooks:
   - Install ngrok: https://ngrok.com/download
   - Sign up free → get authtoken
   - Run: `ngrok config add-authtoken <your-token>`
   - Then: `ngrok http 3000`
   - Copy the `https://xxx.ngrok-free.app` URL
   - Update `.env.local`: `NEXT_PUBLIC_APP_URL=https://xxx.ngrok-free.app`
   - Restart `npm run dev`

---

## 🟢 5. Exotel (India Voice — PRODUCTION) — LATER

**Kya hai**: Indian telephony provider. Sasta (~₹0.50/min vs Twilio ₹3-4/min), DLT compliant.
**Cost**: ₹2,500/month plan + per-minute usage
**Time**: 2-7 days (KYC required)

### Step-by-step:

1. **Sales se contact karein** (no self-serve signup):
   - Go to https://exotel.com → "Talk to sales"
   - Or call: +91 89711 89711
   - Tell them: "Outbound calls for healthcare clinic reminders, need API access + Voicebot Streaming"

2. **KYC documents submit karein**:
   - Company GST certificate (or Sole Proprietorship registration)
   - PAN card
   - Cancelled cheque / bank statement
   - Aadhaar of authorized signatory
   - **Use case description** (template):
     > "We send automated appointment reminder calls to patients of registered clinics. Calls are transactional (consent obtained via clinic registration). DLT template pre-registered."

3. **DLT template registration** (TRAI requirement):
   - Go to your telecom operator's DLT portal (Airtel/Jio/Vi)
   - Register sender ID + content templates
   - Exotel sales team will guide you through this

4. **Once approved, get credentials**:
   - Exotel dashboard → Settings → API Settings
   - Note: **API Key**, **API Token**, **SID**, **Subdomain**

5. **Paste in `.env.local`** (only when ready to switch from Twilio):
   ```env
   TELEPHONY_PROVIDER=exotel
   EXOTEL_API_KEY=your-api-key
   EXOTEL_API_TOKEN=your-api-token
   EXOTEL_SID=your-sid
   EXOTEL_SUBDOMAIN=api.exotel.com
   ```

⚠️ **Code abhi mein Exotel outbound stub hai** — production switch karne se pehle developer ko `src/lib/telephony/exotel-adapter.ts` ke `placeOutboundCall()` ko implement karna padega.

---

## 🟢 6. Razorpay (Subscription Billing) — LATER

**Kya hai**: Indian payments aur recurring subscriptions. Tab chahiye jab clinic apne aap subscribe karna chahein.
**Cost**: 2% per transaction. No setup fee.
**Time**: 2-3 days (KYC required)

⚠️ **Abhi NAHI chahiye** — aap manually Super Admin se kisi clinic ka plan upgrade kar sakte hain `/admin/clinics/[id]/subscription` se. Razorpay tab chahiye jab self-serve subscription launch karna ho.

### Step-by-step (when ready):

1. **Account banayein**:
   - Go to https://razorpay.com → Sign up
   - Verify email + phone

2. **KYC complete karein**:
   - Dashboard → Account & Settings → KYC
   - Submit: PAN, GST (if applicable), bank account, business proof
   - Activation takes 1-3 business days

3. **Test mode keys lein** (development ke liye):
   - Dashboard → Settings → API Keys → "Generate Test Key"
   - Save **Key ID** (starts with `rzp_test_`) and **Key Secret**

4. **Live mode keys** (production ke liye, after KYC):
   - Same place, "Generate Live Key"
   - Save **Key ID** (starts with `rzp_live_`) and **Key Secret**

5. **Webhook secret banayein**:
   - Dashboard → Settings → Webhooks → "+ Add New Webhook"
   - URL: `https://your-app.vercel.app/api/webhooks/razorpay`
   - Active events: `subscription.activated`, `subscription.charged`, `subscription.cancelled`, `subscription.paused`, `subscription.resumed`
   - Set secret (any random string, save it)

6. **Razorpay Plans banayein** (one per ClinicPing plan):
   - Dashboard → Subscriptions → Plans → "+ New Plan"
   - Create 3 plans matching our tiers:
     - Basic: ₹799/month
     - Pro: ₹1,499/month
     - Premium: ₹2,999/month
   - Save each `plan_id` (looks like `plan_xxx`)

7. **Paste in `.env.local`**:
   ```env
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxx
   RAZORPAY_KEY_SECRET=your-secret-here
   RAZORPAY_WEBHOOK_SECRET=your-webhook-secret
   ```

8. **Add Razorpay plan IDs to database**:
   - Supabase SQL Editor → run:
   ```sql
   ALTER TABLE subscription_plans ADD COLUMN razorpay_plan_id TEXT;
   UPDATE subscription_plans SET razorpay_plan_id = 'plan_xxx_basic' WHERE plan_code = 'basic';
   UPDATE subscription_plans SET razorpay_plan_id = 'plan_xxx_pro' WHERE plan_code = 'pro';
   UPDATE subscription_plans SET razorpay_plan_id = 'plan_xxx_premium' WHERE plan_code = 'premium';
   ```

9. **Developer ko bolein**: `src/lib/billing/razorpay.ts` ke TODO sections implement karein.

---

## 🟢 7. Sarvam AI (Hindi TTS) — LATER (only if voice quality issue)

**Kya hai**: Hindi/Indic languages ke liye natural-sounding Text-to-Speech. Twilio's default Hindi voice (Polly) thik hai but Sarvam zyada natural sounds.
**Cost**: $5 free credit
**Time**: 5 minutes (when needed)

**Pehle dekhein**: Default Twilio Polly.Aditi (Hindi female) try karein — agar acceptable lage to Sarvam skip karein. Sarvam tab chahiye jab clinic feedback aaye ke "voice robotic sounds".

### Steps (when needed):
1. Go to https://www.sarvam.ai → Sign up
2. Dashboard → API Keys → Create key
3. Paste:
   ```env
   SARVAM_API_KEY=your-key
   SARVAM_API_URL=https://api.sarvam.ai
   ```

---

## 🟢 8. ElevenLabs (English Premium TTS) — OPTIONAL

**Kya hai**: Best-in-class English voices (very natural). Only needed if you serve premium English-speaking clinics.
**Cost**: Free tier 10,000 chars/month
**Time**: 5 minutes (when needed)

### Steps:
1. Go to https://elevenlabs.io → Sign up
2. Profile → API Keys → Copy
3. Paste:
   ```env
   ELEVENLABS_API_KEY=your-key
   ```

---

# PART 3 — Setup Sequence (Recommended Order)

## Day 1 (1 hour) — Get app running locally
1. ✅ Supabase account + project + run SQL files
2. ✅ OpenRouter account + key
3. ✅ Generate WORKER_SECRET + CRON_SECRET
4. ✅ `npm install` → `npm run dev`
5. ✅ Login at http://localhost:3000/login with seed admin: `admin@clinicai.com` / `Admin@1234`
6. ✅ Browse `/admin/plans`, `/admin/clinics`, `/clinic/reminders` — UI should work, no real calls yet

## Day 2 (1 hour) — Twilio for real call testing
1. ✅ Twilio account + trial number + verify your Indian phone
2. ✅ ngrok setup for local webhook testing
3. ✅ Add Twilio keys to `.env.local`
4. ✅ Create a test appointment 24h away for a patient with YOUR phone number
5. ✅ Manually trigger cron:
   ```bash
   curl -H "x-cron-secret: $CRON_SECRET" http://localhost:3000/api/cron/reminders
   ```
6. ✅ Wait 24h or change appointment time — get the call on your phone
7. ✅ Press 1/2/3, see DB update at `/clinic/reminders/logs`

## Week 1-2 (production prep)
- Deploy to Vercel (point `NEXT_PUBLIC_APP_URL` to Vercel URL)
- Vercel Cron will auto-run scheduler every 15 min
- Apply for Exotel KYC in parallel (takes 2-7 days)

## Month 2 (when first paying customer)
- Razorpay account + KYC
- Self-serve subscription page
- Email notifications via Resend

---

# PART 4 — Quick Reference: All `.env.local` Keys

Copy this entire block to `.env.local`, fill in real values:

```env
# ── MUST HAVE (Day 1) ────────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENROUTER_API_KEY=
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_DEFAULT_MODEL=anthropic/claude-haiku-4-5
OPENROUTER_FALLBACK_MODEL=openai/gpt-4o-mini

NEXT_PUBLIC_APP_URL=http://localhost:3000
WORKER_SECRET=
CRON_SECRET=

# ── NEED FOR REAL CALLS (Day 2) ──────────────────────────────────────────────
TELEPHONY_PROVIDER=twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_OUTBOUND_FROM=

# ── LATER (when ready) ───────────────────────────────────────────────────────
EXOTEL_API_KEY=
EXOTEL_API_TOKEN=
EXOTEL_SID=
EXOTEL_SUBDOMAIN=api.exotel.com

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

SARVAM_API_KEY=
SARVAM_API_URL=https://api.sarvam.ai

ELEVENLABS_API_KEY=

VOICE_WORKER_URL=
```

---

# PART 5 — Useful Links Summary

| Service | Signup URL | Docs |
|---------|-----------|------|
| Supabase | https://supabase.com | https://supabase.com/docs |
| OpenRouter | https://openrouter.ai | https://openrouter.ai/docs |
| Twilio | https://twilio.com/try-twilio | https://www.twilio.com/docs/voice |
| Exotel | https://exotel.com (call sales) | https://developer.exotel.com |
| Razorpay | https://razorpay.com | https://razorpay.com/docs |
| Sarvam AI | https://sarvam.ai | https://docs.sarvam.ai |
| ElevenLabs | https://elevenlabs.io | https://elevenlabs.io/docs |
| ngrok (local tunnel) | https://ngrok.com | https://ngrok.com/docs |
| Vercel (hosting) | https://vercel.com | https://vercel.com/docs |

---

# PART 6 — Cost Estimate at Scale

**At 30 paying clients (₹45,000/mo revenue):**

| Cost | Amount/month |
|------|------|
| Supabase Pro (after free tier) | ₹2,000 |
| Vercel Pro (after free tier) | ₹1,800 |
| OpenRouter (script generation) | ₹500 |
| Twilio outbound (if not yet on Exotel) | ₹15,000 |
| OR Exotel outbound | ₹3,000 |
| Razorpay 2% fees | ₹900 |
| **Total monthly cost** | **~₹6,200 (Exotel) / ₹18,200 (Twilio)** |
| **Net profit** | **~₹38,800 (Exotel) / ~₹26,800 (Twilio)** |

**Why Exotel switch is critical**: 5x cheaper at scale.

---

# PART 7 — Need Help?

If anything in this guide is unclear or doesn't work:
1. Check the specific service's "Get Started" docs (link in PART 5)
2. Check `CLINICPING_SETUP.md` in the same folder for technical setup details
3. Ask developer to walk through the failing step

**Default login** (after running SQL):
- Super Admin: `admin@clinicai.com` / `Admin@1234`
- Demo Clinic Admin: `clinic@demo.com` / `Clinic@1234`

To change these: `npm run reset-password admin@clinicai.com YourNewPassword`
