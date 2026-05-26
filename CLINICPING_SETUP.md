# ClinicPing — Today's Changes & Setup Guide

This document covers everything added in the ClinicPing pivot session.
Read top-to-bottom, then run the 3 setup steps at the end.

---

## What was built today

### Backend (Option 1)
- **Outbound call support** in the provider-agnostic telephony layer
  ([src/lib/telephony/types.ts](src/lib/telephony/types.ts), Twilio adapter
  implements it; Exotel scaffolded).
- **Script generator** ([src/lib/reminders/script-generator.ts](src/lib/reminders/script-generator.ts))
  — uses clinic templates if set, else asks the LLM, falls back to hardcoded
  scripts if LLM fails.
- **Feature gate** ([src/lib/billing/feature-gate.ts](src/lib/billing/feature-gate.ts))
  — checks plan + override + clinic toggle + quota before allowing a call.
- **Place-call orchestrator**
  ([src/lib/reminders/place-call.ts](src/lib/reminders/place-call.ts))
  — feature gate → generate script → dial → persist sid → tick quota.
- **Routes:**
  - `POST /api/voice/outbound-reminder` — fire one reminder
  - `POST /api/voice/reminder-twiml/[reminderId]` — TwiML the carrier hits
  - `POST /api/voice/reminder-response/[reminderId]` — DTMF handler
  - `GET  /api/cron/reminders` — scheduler (enqueue 24h+2h, dispatch due)
- **vercel.json** — runs the scheduler every 15 minutes.

### Admin UI (Option 2)
- **`/admin/plans`** — edit pricing, call limits, included features per plan
  (sidebar: Billing → Plans).
- **`/admin/clinics/[id]/subscription`** — per-clinic panel:
  change plan / status / limit, override individual features, audit log of
  all changes (linked from each row on `/admin/clinics`).
- **`/clinic/reminders`** — clinic admin toggles each reminder type, picks
  call window + language, sets custom templates, retry policy.
- **`/clinic/reminders/logs`** — table of past reminder calls with status
  filter (sidebar: Reminders → Reminder Logs).

### Database (Option 3 → consolidated)
One file to run: **`supabase/RUN_ME_ALL_CHANGES.sql`**
- 5 enums, 5 tables, 1 helper function, all indexes/triggers, seed data.
- Idempotent (safe to re-run).
- Rollback: `supabase/ROLLBACK_ALL_CHANGES.sql`.

---

## How the 3-level feature control works

When a call is about to be placed, the system asks: *is this feature on for
this clinic right now?* The answer comes from three layers, highest wins:

1. **Clinic admin toggle** (`reminder_settings.<feature>_enabled`)
   The clinic can turn things off for themselves even if they're entitled.
2. **Super-admin per-clinic override** (`clinic_subscriptions.feature_overrides`)
   Useful for one-off goodwill grants ("give Dr Sharma broadcast for free
   this month").
3. **Plan default** (`subscription_plans.features`)
   The base entitlement that ships with each tier.

Both the SQL function `clinic_has_feature()` and the TS helper
`checkFeature()` implement this priority identically, so you can call
whichever is convenient.

---

## Setup steps (one-time)

### 1. Apply the database changes
1. Open Supabase Dashboard → SQL Editor → "+ New query"
2. Paste contents of [supabase/RUN_ME_ALL_CHANGES.sql](supabase/RUN_ME_ALL_CHANGES.sql)
3. Click **Run**.
4. Verify:
   ```sql
   SELECT COUNT(*) FROM subscription_plans;     -- = 4
   SELECT COUNT(*) FROM clinic_subscriptions;   -- = number of your clinics
   SELECT COUNT(*) FROM reminder_settings;      -- = number of your clinics
   ```

### 2. Add new env vars to `.env.local`
Diff against [.env.example](.env.example). The new keys are:
```env
TWILIO_OUTBOUND_FROM=+1xxxxxxxxxx     # Twilio number for reminder calls
CRON_SECRET=<openssl rand -hex 32>    # Protects /api/cron/reminders
# Razorpay vars (Phase D — leave blank for now)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

### 3. Wire up the scheduler
- **Local dev:** trigger manually:
  ```bash
  curl -H "x-cron-secret: $CRON_SECRET" \
       http://localhost:3000/api/cron/reminders
  ```
- **Production (Vercel):** [vercel.json](vercel.json) already declares the
  cron. After deploy, Vercel auto-invokes it every 15 min using your
  `CRON_SECRET` as a Bearer token.

---

## How a reminder flows, end-to-end

```
[cron tick every 15 min]
        │
        ▼
GET /api/cron/reminders
   │  enqueue: scan appointments 24h / 2h away → insert appointment_reminders
   │  dispatch: pick due rows, filter by clinic call window, call placeReminderCall()
        │
        ▼
placeReminderCall(reminderId)
   │  checkFeature() — plan/override/toggle/quota
   │  generateReminderScript() — template or LLM
   │  twilioAdapter.placeOutboundCall()
   │  persist provider_call_sid + flip status → in_progress
   │  recordCallUsage(+1)
        │
        ▼
[Twilio dials the patient — when they answer:]
        │
        ▼
POST /api/voice/reminder-twiml/[reminderId]
   │  verify Twilio signature
   │  read spoken_script from DB
   │  if AnsweredBy=machine → speak + hang up
   │  else → <Say> + <Gather action=reminder-response>
        │
        ▼
[Patient presses 1 / 2 / 3]
        │
        ▼
POST /api/voice/reminder-response/[reminderId]
   │  map digit → confirmed / reschedule / cancel
   │  persist response + dtmf_received
   │  if cancel → also update appointments.status = 'cancelled'
   │  speak short confirmation + hang up
        │
        ▼
[Twilio also fires /api/webhooks/twilio/status with final duration]
```

---

## Testing the flow without Twilio

You can dry-run everything except the actual dial:

1. Apply migrations (step 1 above).
2. Insert a fake appointment 2h from now for a real (your own) phone number.
3. Call the scheduler endpoint manually (step 3 above).
4. Inspect `appointment_reminders` — you should see a row with
   `status='scheduled'` → moves to `failed` (no Twilio creds) or
   `in_progress` (with creds + a real number).
5. Visit `/clinic/reminders/logs` to see it in the dashboard.

---

## Files added today

```
clinic-ai-voice/
├── .env.example                       ← updated
├── vercel.json                        ← NEW (cron config)
├── CLINICPING_SETUP.md                ← NEW (this file)
├── supabase/
│   ├── RUN_ME_ALL_CHANGES.sql         ← NEW (run this once)
│   ├── ROLLBACK_ALL_CHANGES.sql       ← NEW (undo button)
│   └── migrations/
│       ├── 0002_clinicping_reminders.sql            ← NEW
│       ├── 0003_admin_plan_overrides.sql            ← NEW
│       ├── rollback_0002_clinicping_reminders.sql   ← NEW
│       └── rollback_0003_admin_plan_overrides.sql   ← NEW
└── src/
    ├── lib/
    │   ├── ai/
    │   │   ├── openrouter.ts          ← (from earlier session)
    │   │   └── intent-classifier.ts   ← (from earlier session)
    │   ├── billing/
    │   │   └── feature-gate.ts        ← NEW
    │   ├── reminders/
    │   │   ├── script-generator.ts    ← NEW
    │   │   └── place-call.ts          ← NEW
    │   └── telephony/                 ← updated (outbound support)
    ├── components/layout/
    │   └── Sidebar.tsx                ← updated (Plans + Reminders entries)
    └── app/
        ├── admin/
        │   ├── plans/page.tsx                              ← NEW
        │   └── clinics/[id]/subscription/page.tsx          ← NEW
        ├── clinic/
        │   └── reminders/
        │       ├── page.tsx                                ← NEW
        │       └── logs/page.tsx                           ← NEW
        └── api/
            ├── admin/
            │   ├── plans/route.ts                          ← NEW
            │   └── clinics/[id]/subscription/route.ts      ← NEW
            ├── clinic/
            │   └── reminder-settings/route.ts              ← NEW
            ├── voice/
            │   ├── outbound-reminder/route.ts              ← NEW
            │   ├── reminder-twiml/[reminderId]/route.ts    ← NEW
            │   └── reminder-response/[reminderId]/route.ts ← NEW
            └── cron/
                └── reminders/route.ts                      ← NEW
```

---

## Phase 2 — what was added in the follow-up session

These came after the initial pivot — all already shipped:

### Scheduler upgrades
- **Post-visit reminders** auto-enqueued for appointments with
  `status='completed'` exactly 3 days ago (IST), scheduled for 11 AM IST.
- **Feature-gated enqueue**: the scheduler now skips clinics that have the
  type turned off in `reminder_settings`. Saves DB writes that would just
  be cancelled later by the feature gate.

### Monthly reports
- **[`src/lib/reports/monthly-report.ts`](src/lib/reports/monthly-report.ts)** —
  aggregates a clinic's reminders for one IST month: totals, by-type
  breakdown, daily activity, answer/confirmation rates.
- **`GET /api/clinic/reports/monthly?month=YYYY-MM`** — returns HTML
  (default, with built-in "Print / Save as PDF" button) or JSON.
- **`/clinic/reports`** — UI page with month picker + iframe preview.
  Sidebar entry under "Reminders → Monthly Reports".

### Razorpay scaffolding (placeholder — not wired)
Code paths exist but each function throws a clear error until you wire it:
- [`src/lib/billing/razorpay.ts`](src/lib/billing/razorpay.ts) — customer / subscription / cancel stubs
- [`/api/webhooks/razorpay`](src/app/api/webhooks/razorpay/route.ts) — signature verification + status mapping ready
- [`/api/clinic/billing/subscribe`](src/app/api/clinic/billing/subscribe/route.ts) — returns 503 with helpful message until keys are set

When Razorpay account is live:
1. Add `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` + `RAZORPAY_WEBHOOK_SECRET` to `.env.local`.
2. Create matching plans in Razorpay dashboard; add a `razorpay_plan_id` column to `subscription_plans` and fill it.
3. Implement the TODO sections in `razorpay.ts` using the official Razorpay Node SDK.
4. Point the dashboard webhook URL at `/api/webhooks/razorpay`.

### Misc
- Pre-existing `voice-config` TS error fixed.
- Full type-check now passes clean (`npx tsc --noEmit` → zero errors).

---

## Still TODO

- **Exotel outbound** not implemented (placeholder throws on call). Activate
  when Exotel KYC + Voicebot Streaming approved.
- **Birthday / annual_checkup** reminder types: schema + UI ready, scheduler
  enqueue logic skipped — requires `patients.date_of_birth` data first.
- **Razorpay real integration**: see scaffolding section above.
- **Email reports** (auto-send monthly PDF via Resend + QStash): currently
  the report is download-only.
- **Database types regen**: backend uses `as any` casts in places. Run
  `npx supabase gen types typescript --project-id <id> > src/types/database.ts`
  to refresh, then strip casts as a cleanup pass.
