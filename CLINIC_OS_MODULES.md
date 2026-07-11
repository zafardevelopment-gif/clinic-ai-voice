# AI Clinic OS — Module Reference

This document covers the five modules added on top of the existing ClinicPing
voice-booking/reminder platform: **(A)** no-show reduction & reminders,
**(B)** medicine adherence & follow-up, **(C)** symptom triage, **(D)** lab
report explanation, and **(E)** the clinic ledger (cashbook & P&L). All
clinical-support features (C, D) assist clinic operations and patient
communication — they never replace doctor judgment, never present a
diagnosis as final, and always carry a safety disclaimer.

## Setup

1. Run `supabase/migrations/0005_clinic_os_modules.sql` then
   `supabase/migrations/0006_clinic_ledger.sql` in the Supabase SQL editor
   (in that order — 0006 doesn't depend on 0005 but both assume `0002`-`0004`
   are already applied). Each is additive/idempotent; rollback scripts are
   provided alongside (`rollback_0005_...sql`, `rollback_0006_...sql`).
2. Optional: run `supabase/seed_clinic_os_demo.sql` against a clinic that
   already has at least one patient, to populate one example row per module
   for manual testing.
3. Env vars (all optional — sensible defaults apply):
   - `WHATSAPP_PROVIDER`, `SMS_PROVIDER` — set to a registered provider name
     once a real integration is added (see Notifications below). Unset/`console`
     uses the built-in logging stub.
4. `npm run test` runs the Vitest suite (guardrails, lab-marker flagging,
   notification templates).

## A — No-show reducer & reminder agent

Builds on the existing ClinicPing reminder engine (`appointment_reminders`,
`reminder_settings`, the `/api/cron/reminders` scheduler).

- **Channels**: each reminder type (24h/2h/post-visit/birthday) now has a
  configurable channel — voice, WhatsApp, or SMS — set per clinic in
  `/clinic/reminders`. Voice reminders still go through the existing
  Twilio/Exotel `placeReminderCall()` flow; WhatsApp/SMS go through the new
  `src/lib/notify/` provider abstraction (see Notifications below).
- **Booking confirmation**: every new appointment (counter or public website
  booking) automatically queues an immediate `booking_confirmation` reminder.
- **No-show tracking**: `appointments.no_show_marked_at`/`no_show_marked_by`
  record who marked a no-show and when, distinct from the `status='no_show'`
  value. Mark from the Appointments list ("Mark No-Show" action).
- **Communication timeline**: `GET /api/clinic/appointments/[id]/timeline`
  and the "Timeline" action on the Appointments page show every reminder
  attempt + its `reminder_events` (scheduled/sent/delivered/failed/responded)
  for one appointment.
- **Patient responses**: WhatsApp/SMS replies land on
  `POST /api/patient/reminder-response/[reminderId]` (token-based, the
  reminder UUID is the auth) — mirrors the existing voice DTMF handler at
  `POST /api/voice/reminder-response/[reminderId]`.
- **Analytics**: `GET /api/clinic/analytics/reminders` and the widgets on
  `/clinic/reminders` show total sent, confirmation rate, no-show rate,
  reschedule rate.

## B — Medicine adherence & follow-up bot

- **Follow-up Plan Creator** (`/clinic/follow-ups/new`): clinic_admin/doctor
  records prescribed medicines, reminder frequency, follow-up visit date,
  care instructions, escalation contact for a patient.
- Reminders are enqueued by the same cron scheduler
  (`enqueueFollowUps()` in `/api/cron/reminders`) as new `reminder_type`
  values `medication`/`follow_up_visit`, linked back to the plan via
  `appointment_reminders.metadata.follow_up_plan_id`.
- **Patient responses**: `POST /api/patient/adherence-response/[planId]`
  accepts `taken | missed | feeling_better | side_effects | call_me`.
  Alert rules are deterministic (not AI-dependent): 2 consecutive `missed`
  replies raises a `repeated_missed` alert; any `side_effects` or `call_me`
  raises an alert immediately.
- **Follow-up Dashboard** (`/clinic/follow-ups`): pending follow-ups,
  adherence-risk patients (open alerts), callback requests — resolve alerts
  from here.

## C — Symptom triage agent

- **Red-flag detection is always deterministic**, never LLM-dependent
  (`src/lib/ai/guardrails.ts` → `detectRedFlags()`). Chest pain, breathing
  difficulty, unconsciousness, seizure, heavy bleeding, stroke signs, and
  very-high-fever-in-a-vulnerable-patient short-circuit straight to the
  `emergency` category with a fixed warning message — the LLM is never asked
  to judge an emergency and can't suppress one by erroring or hallucinating
  reassurance.
- **Entry points**: public website form (`/c/[slug]/triage`, no login),
  counter-desk staff entry (`/clinic/triage/new`), or programmatically via
  `POST /api/clinic/triage` (for a future voice-booking follow-up flow).
- **Categories**: `emergency | urgent_same_day | routine | follow_up`.
  Non-emergency categories are LLM-classified (`src/lib/ai/triage.ts`) with a
  safe `routine` fallback if the LLM call fails.
- **Triage queue** (`/clinic/triage`): staff review AI summaries before the
  visit, with a red-flag banner when applicable. `TriageSummaryPanel` lets a
  doctor/clinic_admin edit the AI-drafted summary — edits set
  `triage_results.is_ai_edited = true` and `reviewed_by`/`reviewed_at`.
- Every patient-facing view carries: *"This is not a diagnosis. Final
  medical advice must come from a doctor."*

## D — Lab report explanation assistant

- **V1 = manual entry**: staff enter lab markers (name, value, unit,
  reference range) via `/clinic/lab-reports/new`. An optional PDF/image
  upload is stored (reusing the `clinic-media` bucket) but **not parsed** —
  `lab_reports.uploaded_file_url` is separate from `lab_report_markers` by
  design so a future OCR step can populate markers automatically without
  changing the explanation pipeline (see V2 path below).
- `deriveFlag()` (`src/lib/ai/lab-explanation.ts`) computes low/high/normal/
  critical deterministically from value vs. reference range — the "critical"
  flag forces `next_action_category = 'urgent_review'` regardless of what
  the LLM says, same never-rely-solely-on-the-LLM-for-urgency principle as
  triage.
- **Explanation** (`POST /api/clinic/lab-reports/[id]/explain`): generates a
  bilingual (English + Hindi) patient-safe summary, an abnormal-markers
  summary, and doctor discussion points. Each run **appends** a new
  `lab_explanations` row — history is never overwritten, per spec.
- **Views**: `/clinic/lab-reports/[id]` toggles between patient-friendly
  (plain language, EN/HI) and doctor/staff (abnormal markers + discussion
  points) — both carry the informational-only disclaimer.

## E — Clinic ledger (cashbook & P&L)

A simple cash-basis money-in/money-out log — not a full accounting system
(no double-entry, no GST/tax handling, no multi-currency).

- **Categories**: `patient_collection` (+), `patient_refund` (-),
  `staff_expense` (-), `clinic_expense` (-), `other` (sign set by the entry
  form). A refund entry can optionally reference the original collection via
  `related_entry_id`.
- **Linkage**: patient collection/refund entries can optionally reference a
  patient (searchable picker) and, in the schema, an appointment
  (`appointment_id` — not yet surfaced in the entry form UI; the column
  exists for a future "bill this visit" quick-action from the Appointments
  page). Expense entries are standalone.
- **Access**: `clinic_admin` and `receptionist` can record entries; all
  clinic roles (`clinic_admin`, `doctor`, `receptionist`) can view the log
  and summary. Only `clinic_admin` can delete a mistaken entry
  (`DELETE /api/clinic/ledger/[id]`).
- **Ledger view** (`/clinic/ledger`): filterable entry log + month-to-date
  summary cards (collected, refunded, staff expense, clinic expense, net).
- **P&L view**: same page, "Profit & Loss" tab —
  `GET /api/clinic/ledger/pnl?months=6` returns a trailing-N-month
  breakdown (income vs. expense vs. profit, cash-basis) with a per-category
  breakdown per month.

## Cross-cutting

### Roles

`user_role` now has four values: `admin` (Super Admin), `clinic_admin`
(unchanged, full access within their clinic), `doctor`, `receptionist`. The
latter two are new — `src/lib/authz.ts`'s `requireRole()` gates specific
routes (e.g. only `clinic_admin`/`doctor` can create a follow-up plan or edit
a triage result; `receptionist` can create/view but not edit clinical
content). `clinic_admin` is always a superset. There is currently no UI to
*create* doctor/receptionist logins — use `/api/admin/invite-user` or a
direct DB insert with the desired `role` and (for doctor) `users.doctor_id`
linking to their `doctors` row. **Assumption flagged**: a self-serve
"invite staff with role" UI is a natural fast-follow, not built in this pass.

### Notifications (WhatsApp/SMS)

`src/lib/notify/` mirrors the existing `src/lib/telephony/` provider
pattern. Today, WhatsApp and SMS both resolve to a console/log stub
(`src/lib/notify/console-provider.ts`) that marks messages `delivered`
immediately — every code path, DB status row, and dashboard number works
end-to-end, but no message actually leaves the server. **To go live**: add a
real adapter (e.g. Gupshup/MSG91/Meta Cloud API) implementing the
`NotificationProvider` interface, register it in
`src/lib/notify/index.ts`, and set `WHATSAPP_PROVIDER`/`SMS_PROVIDER` — no
other code changes required.

### AI guardrails

`src/lib/ai/guardrails.ts` is the single place prompt wording and red-flag
keywords live. All three AI-touched modules (triage, lab explanation,
adherence message drafting) route through it and through
`src/lib/ai/openrouter.ts` (existing OpenRouter/Claude-Haiku client, unchanged).
Every AI-generated field has an `is_ai_edited` sibling so staff edits are
distinguishable from raw model output.

## Assumptions & V2 path

- **WhatsApp/SMS**: console stub only (see above) — real provider is a
  drop-in fast-follow, no schema/API changes needed.
- **Lab PDF/image parsing (OCR)**: V1 stores the file; V2 would add an OCR
  step that populates `lab_report_markers` automatically. The schema already
  decouples the two.
- **Reminder channel selection is per-type, not per-attempt fan-out**: a
  clinic picks one channel per reminder type (e.g. "24h reminder → WhatsApp"),
  not "try WhatsApp then fall back to SMS then voice." Multi-channel
  fallback chains are a reasonable V2 if delivery data shows it's needed.
- **Medication reminder cadence**: V1 sends at most one check-in per
  follow-up plan per calendar day regardless of `reminder_frequency`
  (`daily`/`twice_daily`/`weekly` are stored but twice_daily doesn't yet
  fire twice) — a V2 refinement once real usage data shows demand.
- **Role management UI**: no self-serve "create doctor/receptionist login"
  screen yet (see Roles above).
- **Ledger**: no appointment-linked "bill this visit" quick action yet
  (column exists, UI doesn't surface it); no GST/tax fields; no multi-user
  audit trail beyond `created_by`.
- **Public triage rate limiting**: the public `/api/public/clinic/[slug]/triage`
  endpoint has no explicit rate limiting yet — same posture as the existing
  public booking endpoint it mirrors; add IP/phone throttling before high-traffic
  production use if abuse becomes a concern.

## Testing

- `npm run test` — Vitest unit tests for `detectRedFlags()` (guardrails),
  `deriveFlag()` (lab marker flagging), and notification template rendering.
- Manual verification: place a reminder through the cron dispatcher (console
  provider logs the message), create a follow-up plan and POST two `missed`
  adherence responses to confirm the alert fires, submit the public triage
  form with a red-flag phrase (e.g. "chest pain") to confirm the emergency
  path bypasses the LLM, enter lab markers outside their reference range and
  confirm both patient/doctor explanation views render with the disclaimer,
  record a ledger entry and confirm it appears in both the log and the P&L
  totals for the current month.
