export interface PrescriptionData {
  clinic: { name: string; address: string | null; city: string | null; phone: string | null; email: string | null }
  doctor: { full_name: string; specialization: string | null; qualifications: string | null } | null
  patient: { full_name: string; phone: string | null } | null
  presenting_complaint: string
  final_diagnosis: string
  prescription: { drug: string; dosage: string; frequency: string; duration_days: number | null }[]
  finalized_at: string
}

/**
 * Render a finalized Doctor Co-Pilot consultation as a self-contained,
 * print-friendly HTML prescription — same "browser Save as PDF" pattern as
 * lib/billing/invoice-html.ts, no server-side PDF library needed.
 */
export function renderPrescriptionHtml(data: PrescriptionData): string {
  const { clinic, doctor, patient, presenting_complaint, final_diagnosis, prescription, finalized_at } = data

  const rows = prescription
    .map((item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(item.drug)}</td>
        <td>${escapeHtml(item.dosage)}</td>
        <td>${escapeHtml(item.frequency)}</td>
        <td>${item.duration_days != null ? `${item.duration_days} day(s)` : '—'}</td>
      </tr>`)
    .join('')

  return `<!doctype html>
<html><head>
<meta charset="utf-8" />
<title>Prescription — ${escapeHtml(patient?.full_name || 'Patient')}</title>
<style>
  :root { --acc: #10b981; --txt: #0f1f17; --txt2: #4b5d54; --b: #e4ebe7; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: var(--txt); margin: 0; padding: 32px; background: #fff; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid var(--acc); padding-bottom: 16px; margin-bottom: 20px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .sub { color: var(--txt2); font-size: 12.5px; }
  .doctor-line { text-align: right; font-size: 13px; }
  .doctor-line .name { font-weight: 700; font-size: 15px; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
  .party { border: 1px solid var(--b); border-radius: 10px; padding: 12px 14px; }
  .party .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; color: var(--txt2); margin-bottom: 4px; }
  .party .name { font-weight: 700; font-size: 14px; }
  .section-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; color: var(--txt2); margin: 18px 0 6px; }
  .box { border: 1px solid var(--b); border-radius: 10px; padding: 12px 14px; font-size: 13.5px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 6px; }
  th, td { padding: 8px 10px; border-bottom: 1px solid var(--b); text-align: left; }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; color: var(--txt2); }
  .disclaimer { margin-top: 20px; font-size: 11.5px; color: var(--txt2); border-top: 1px solid var(--b); padding-top: 12px; font-style: italic; }
  .footer { margin-top: 24px; font-size: 11px; color: var(--txt2); display: flex; justify-content: space-between; }
  @media print { body { padding: 16px; } .no-print { display: none; } }
  .actions button { background: var(--acc); color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 13px; }
</style>
</head><body>

<div class="actions no-print" style="margin-bottom:16px;">
  <button onclick="window.print()">Print / Save as PDF</button>
</div>

<div class="header">
  <div>
    <h1>${escapeHtml(clinic.name)}</h1>
    <div class="sub">
      ${[clinic.address, clinic.city].filter(Boolean).join(', ')}<br/>
      ${[clinic.phone, clinic.email].filter(Boolean).join(' · ')}
    </div>
  </div>
  <div class="doctor-line">
    ${doctor ? `<div class="name">${escapeHtml(doctor.full_name)}</div>` : ''}
    ${doctor?.qualifications ? `<div class="sub">${escapeHtml(doctor.qualifications)}</div>` : ''}
    ${doctor?.specialization ? `<div class="sub">${escapeHtml(doctor.specialization)}</div>` : ''}
  </div>
</div>

<div class="parties">
  <div class="party">
    <div class="label">Patient</div>
    <div class="name">${escapeHtml(patient?.full_name || 'Walk-in Patient')}</div>
    ${patient?.phone ? `<div class="sub">${escapeHtml(patient.phone)}</div>` : ''}
  </div>
  <div class="party">
    <div class="label">Date</div>
    <div class="sub">${new Date(finalized_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
  </div>
</div>

<div class="section-label">Presenting Complaint</div>
<div class="box">${escapeHtml(presenting_complaint || '—')}</div>

<div class="section-label">Diagnosis</div>
<div class="box">${escapeHtml(final_diagnosis)}</div>

<div class="section-label">Rx — Prescription</div>
${prescription.length > 0 ? `
<table>
  <thead>
    <tr><th>#</th><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr>
  </thead>
  <tbody>${rows}</tbody>
</table>` : `<div class="box" style="color:var(--txt2)">No medications prescribed.</div>`}

<div class="disclaimer">
  This prescription was prepared with AI-assisted clinical decision support (ClinicAI Co-Pilot). All suggestions were reviewed, edited as needed, and finally approved by the treating physician named above, who bears full clinical and legal responsibility for this prescription.
</div>

<div class="footer">
  <span>Generated by ClinicAI</span>
  <span>${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
</div>

</body></html>`
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}
