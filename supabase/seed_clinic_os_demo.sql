-- ═══════════════════════════════════════════════════════════════════════════
-- Clinic OS — Demo/Seed Data
-- Optional. Run AFTER 0005_clinic_os_modules.sql, against a clinic that
-- already has at least one patient and one doctor (e.g. from onboarding).
--
-- Usage: replace the two placeholder UUIDs below with a real clinic_id and
-- patient_id from your database, then run the whole file in the Supabase
-- SQL editor. Safe to re-run — every insert is a fresh demo row, not
-- upserted, so re-running creates additional demo rows (delete manually if
-- you want a clean slate).
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_clinic_id  UUID := (SELECT id FROM clinics ORDER BY created_at LIMIT 1);
  v_patient_id UUID := (SELECT id FROM patients WHERE clinic_id = v_clinic_id ORDER BY created_at LIMIT 1);
  v_plan_id    UUID;
  v_session_id UUID;
  v_report_id  UUID;
BEGIN
  IF v_clinic_id IS NULL OR v_patient_id IS NULL THEN
    RAISE NOTICE 'No clinic/patient found — create a clinic and at least one patient first, then re-run this seed.';
    RETURN;
  END IF;

  -- ── Module B: follow-up plan + adherence logs + one alert ─────────────────
  INSERT INTO follow_up_plans (clinic_id, patient_id, medicines, reminder_frequency, follow_up_date, care_instructions, escalation_contact)
  VALUES (
    v_clinic_id, v_patient_id,
    '[{"name":"Amoxicillin","dosage":"500mg","frequency":"3x/day","duration_days":5},{"name":"Paracetamol","dosage":"650mg","frequency":"as needed","duration_days":3}]'::jsonb,
    'daily', CURRENT_DATE + INTERVAL '5 days', 'Rest, plenty of fluids, avoid spicy food', '+919800000000'
  )
  RETURNING id INTO v_plan_id;

  INSERT INTO adherence_logs (follow_up_plan_id, patient_id, channel, response, created_via)
  VALUES
    (v_plan_id, v_patient_id, 'whatsapp', 'taken', 'patient_reply'),
    (v_plan_id, v_patient_id, 'whatsapp', 'missed', 'patient_reply'),
    (v_plan_id, v_patient_id, 'whatsapp', 'missed', 'patient_reply');

  INSERT INTO adherence_alerts (clinic_id, follow_up_plan_id, patient_id, alert_type)
  VALUES (v_clinic_id, v_plan_id, v_patient_id, 'repeated_missed');

  -- ── Module C: a routine triage session ─────────────────────────────────────
  INSERT INTO symptom_triage_sessions (clinic_id, patient_id, source, age_group, status)
  VALUES (v_clinic_id, v_patient_id, 'counter', 'adult', 'submitted')
  RETURNING id INTO v_session_id;

  INSERT INTO triage_answers (session_id, chief_complaint, duration, fever, pain_severity, existing_conditions, current_medicines, red_flags)
  VALUES (v_session_id, 'Mild fever and sore throat', '2 days', true, 3, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[]);

  INSERT INTO triage_results (session_id, category, summary, doctor_notes, ai_model)
  VALUES (
    v_session_id, 'routine',
    'Guidance: symptoms suggest a common mild viral infection. Possible urgency: low. Doctor review recommended at next available slot. This is guidance, not a diagnosis.',
    'Mild fever + sore throat, 2 days, no red flags. Consider routine viral URI workup.',
    'demo-seed'
  );

  -- ── Module D: a lab report with markers + explanation ──────────────────────
  INSERT INTO lab_reports (clinic_id, patient_id, report_date, lab_name, status)
  VALUES (v_clinic_id, v_patient_id, CURRENT_DATE, 'City Diagnostics (demo)', 'explained')
  RETURNING id INTO v_report_id;

  INSERT INTO lab_report_markers (lab_report_id, marker_name, value, unit, reference_range, is_abnormal, flag, sort_order)
  VALUES
    (v_report_id, 'Hemoglobin', '11.2', 'g/dL', '13-17', true, 'low', 0),
    (v_report_id, 'Fasting Glucose', '95', 'mg/dL', '70-110', false, 'normal', 1),
    (v_report_id, 'WBC Count', '7.5', 'x10^3/uL', '4-11', false, 'normal', 2);

  INSERT INTO lab_explanations (lab_report_id, patient_summary_en, patient_summary_hi, abnormal_markers_summary, doctor_discussion_points, next_action_category, ai_model)
  VALUES (
    v_report_id,
    'Your hemoglobin is slightly below the usual range, which can be a sign of mild anemia. Your blood sugar and white blood cell count are normal. This is guidance, not a diagnosis. Final medical advice must come from a doctor.',
    'Aapka hemoglobin thoda kam hai, jo mild anemia ka sanket ho sakta hai. Blood sugar aur WBC normal hain. Yeh guidance hai, diagnosis nahi. Final medical advice ke liye doctor se milna zaroori hai.',
    'Hemoglobin: 11.2 g/dL (low, reference 13-17)',
    'Mild anemia pattern — consider iron studies, dietary history, and menstrual history if applicable.',
    'discuss_soon',
    'demo-seed'
  );

  RAISE NOTICE 'Clinic OS demo data seeded for clinic_id=%, patient_id=%', v_clinic_id, v_patient_id;
END $$;
