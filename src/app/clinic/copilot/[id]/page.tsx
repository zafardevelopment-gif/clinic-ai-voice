'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import PageCard from '@/components/ui/PageCard'
import AppBtn from '@/components/ui/AppBtn'
import { FormField, AppInput, AppTextarea } from '@/components/ui/FormField'
import CopilotMediaPanel from '@/components/clinic/CopilotMediaPanel'

interface QaLogEntry {
  question: string
  answer: string
  source: 'ai_suggested' | 'doctor_added'
  answered_at: string
}

interface SuggestedQuestion {
  question: string
  priority: 'red_flag' | 'routine'
}

type SuggestionStatus = 'pending' | 'accepted' | 'edited' | 'rejected'

interface SuggestedDiagnosis { condition: string; confidence_note: string; status: SuggestionStatus }
interface SuggestedTest { test_name: string; reason: string; status: SuggestionStatus }
interface SuggestedMedication { formulary_id: string; drug: string; dosage_range: string; source_reference: string; note: string; status: SuggestionStatus }

interface TriageResult {
  id: string
  ai_suggested_questions: SuggestedQuestion[]
  ai_suggested_diagnoses: SuggestedDiagnosis[]
  ai_suggested_tests: SuggestedTest[]
  ai_suggested_medications: SuggestedMedication[]
  doctor_final_diagnosis: string | null
  finalized_at: string | null
}

const DISCLAIMER = 'AI Suggestion — not a directive. Final clinical decision and legal responsibility rest with the treating physician.'

export default function CopilotSessionPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const sessionId = params.id

  const [complaint, setComplaint] = useState('')
  const [qaLog, setQaLog] = useState<QaLogEntry[]>([])
  const [questions, setQuestions] = useState<SuggestedQuestion[]>([])
  const [result, setResult] = useState<TriageResult | null>(null)
  const [answerDraft, setAnswerDraft] = useState<Record<number, string>>({})
  const [manualQuestion, setManualQuestion] = useState('')
  const [manualAnswer, setManualAnswer] = useState('')
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState('')

  // Decisions keyed by index for each suggestion array.
  const [diagnosisDecisions, setDiagnosisDecisions] = useState<Record<number, { status: SuggestionStatus; edited?: string }>>({})
  const [testDecisions, setTestDecisions] = useState<Record<number, { status: SuggestionStatus; edited?: string }>>({})
  const [medicationDecisions, setMedicationDecisions] = useState<Record<number, { status: SuggestionStatus; edited?: string }>>({})
  const [finalDiagnosis, setFinalDiagnosis] = useState('')
  const [password, setPassword] = useState('')
  const [finalizing, setFinalizing] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/clinic/copilot/${sessionId}`)
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Failed to load'); return }
    setComplaint(data.answers?.chief_complaint || '')
    setQaLog(data.answers?.qa_log || [])
    setResult(data.result)
    setQuestions(data.result?.ai_suggested_questions || [])
  }, [sessionId])

  useEffect(() => { load() }, [load])

  async function fetchQuestions() {
    setLoadingQuestions(true)
    try {
      const res = await fetch(`/api/clinic/copilot/${sessionId}/questions`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) setQuestions(data.questions)
    } finally {
      setLoadingQuestions(false)
    }
  }

  async function submitAnswer(question: string, answer: string, source: 'ai_suggested' | 'doctor_added') {
    if (!answer.trim()) return
    const res = await fetch(`/api/clinic/copilot/${sessionId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, answer: answer.trim(), source }),
    })
    const data = await res.json()
    if (res.ok) setQaLog(data.qaLog)
  }

  async function markComplete() {
    setCompleting(true)
    setError('')
    try {
      const res = await fetch(`/api/clinic/copilot/${sessionId}/complete`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to generate suggestions'); return }
      setResult(data)
    } finally {
      setCompleting(false)
    }
  }

  function decide(
    kind: 'diagnosis' | 'test' | 'medication',
    index: number,
    status: SuggestionStatus,
    edited?: string,
  ) {
    const setter = kind === 'diagnosis' ? setDiagnosisDecisions : kind === 'test' ? setTestDecisions : setMedicationDecisions
    setter(prev => ({ ...prev, [index]: { status, edited } }))
  }

  async function finalize() {
    if (!password) { setError('Enter your password to sign and finalize'); return }
    if (!finalDiagnosis.trim()) { setError('Enter the final diagnosis'); return }
    setFinalizing(true)
    setError('')
    try {
      const res = await fetch(`/api/clinic/copilot/${sessionId}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          finalDiagnosis: finalDiagnosis.trim(),
          diagnosisDecisions: Object.entries(diagnosisDecisions).map(([i, d]) => ({ index: Number(i), status: d.status, editedCondition: d.edited })),
          testDecisions: Object.entries(testDecisions).map(([i, d]) => ({ index: Number(i), status: d.status, editedTestName: d.edited })),
          medicationDecisions: Object.entries(medicationDecisions).map(([i, d]) => ({ index: Number(i), status: d.status, editedDosage: d.edited })),
          finalPrescription: (result?.ai_suggested_medications || [])
            .filter((_, i) => medicationDecisions[i]?.status === 'accepted' || medicationDecisions[i]?.status === 'edited')
            .map((m, i) => ({
              drug: m.drug,
              dosage: medicationDecisions[i]?.edited || m.dosage_range,
              frequency: '',
              formularyId: m.formulary_id,
            })),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to finalize'); return }
      setResult(data)
    } finally {
      setFinalizing(false)
    }
  }

  if (!result) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar title="AI Clinical Co-Pilot" />
        <div className="p-6 text-sm" style={{ color: 'var(--txt3)' }}>Loading…</div>
      </div>
    )
  }

  const isFinalized = !!result.finalized_at

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="AI Clinical Co-Pilot" subtitle={complaint} actions={<AppBtn variant="secondary" onClick={() => router.push('/clinic/copilot')}>Back</AppBtn>} />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="rounded-lg px-4 py-2.5 text-sm mb-4" style={{ background: 'var(--amber-dim)', color: 'var(--amber)', border: '1px solid rgba(255,180,0,0.2)' }}>
          {DISCLAIMER}
        </div>
        {error && (
          <div className="rounded-lg px-4 py-2.5 text-sm mb-4" style={{ background: 'var(--rose-dim)', color: 'var(--rose)' }}>{error}</div>
        )}

        {isFinalized ? (
          <PageCard title="Finalized Consultation">
            <div className="text-sm mb-2" style={{ color: 'var(--txt)' }}><strong>Final diagnosis:</strong> {result.doctor_final_diagnosis}</div>
            <div className="text-xs" style={{ color: 'var(--txt3)' }}>Signed and finalized at {new Date(result.finalized_at!).toLocaleString()}</div>
          </PageCard>
        ) : (
          <>
            <PageCard
              title="Suggested Follow-up Questions"
              actions={<AppBtn size="sm" variant="secondary" onClick={fetchQuestions} disabled={loadingQuestions}>{loadingQuestions ? 'Thinking…' : 'Suggest Questions'}</AppBtn>}
            >
              {questions.length === 0 ? (
                <div className="text-xs" style={{ color: 'var(--txt3)' }}>No suggestions yet — click &ldquo;Suggest Questions&rdquo; to begin.</div>
              ) : (
                <div className="space-y-3">
                  {questions.map((q, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <div className="flex-1">
                        <div className="text-sm mb-1" style={{ color: q.priority === 'red_flag' ? 'var(--rose)' : 'var(--txt)' }}>
                          {q.priority === 'red_flag' ? '🚩 ' : ''}{q.question}
                        </div>
                        <div className="flex gap-2">
                          <AppInput
                            placeholder="Doctor's recorded answer…"
                            value={answerDraft[i] || ''}
                            onChange={e => setAnswerDraft(prev => ({ ...prev, [i]: e.target.value }))}
                          />
                          <AppBtn
                            size="sm"
                            variant="secondary"
                            onClick={() => { submitAnswer(q.question, answerDraft[i] || '', 'ai_suggested'); setAnswerDraft(prev => ({ ...prev, [i]: '' })) }}
                          >
                            Record
                          </AppBtn>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </PageCard>

            <PageCard title="Add Your Own Question">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <AppInput placeholder="Question" value={manualQuestion} onChange={e => setManualQuestion(e.target.value)} />
                <AppInput placeholder="Answer" value={manualAnswer} onChange={e => setManualAnswer(e.target.value)} />
              </div>
              <AppBtn
                size="sm"
                variant="secondary"
                onClick={() => { submitAnswer(manualQuestion, manualAnswer, 'doctor_added'); setManualQuestion(''); setManualAnswer('') }}
              >
                Add to Record
              </AppBtn>
            </PageCard>

            <PageCard title="Consultation Q&A Log" noPad>
              {qaLog.length === 0 ? (
                <div className="p-5 text-xs" style={{ color: 'var(--txt3)' }}>No answers recorded yet.</div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--b1)' }}>
                  {qaLog.map((qa, i) => (
                    <div key={i} className="px-5 py-3">
                      <div className="text-xs font-semibold" style={{ color: 'var(--txt2)' }}>{qa.question}</div>
                      <div className="text-sm" style={{ color: 'var(--txt)' }}>{qa.answer}</div>
                    </div>
                  ))}
                </div>
              )}
            </PageCard>

            <CopilotMediaPanel sessionId={sessionId} />

            {result.ai_suggested_diagnoses.length === 0 && result.ai_suggested_tests.length === 0 ? (
              <div className="flex justify-end mb-6">
                <AppBtn onClick={markComplete} disabled={completing}>{completing ? 'Generating…' : 'Mark Consultation Complete'}</AppBtn>
              </div>
            ) : (
              <>
                <PageCard title="Possible Differential Considerations" subtitle="AI-suggested possibilities, not a diagnosis">
                  <div className="space-y-3">
                    {result.ai_suggested_diagnoses.map((d, i) => (
                      <SuggestionRow
                        key={i}
                        primaryText={d.condition}
                        secondaryText={d.confidence_note}
                        decision={diagnosisDecisions[i]}
                        onDecide={(status, edited) => decide('diagnosis', i, status, edited)}
                      />
                    ))}
                  </div>
                </PageCard>

                <PageCard title="Suggested Tests / Investigations">
                  <div className="space-y-3">
                    {result.ai_suggested_tests.map((t, i) => (
                      <SuggestionRow
                        key={i}
                        primaryText={t.test_name}
                        secondaryText={t.reason}
                        decision={testDecisions[i]}
                        onDecide={(status, edited) => decide('test', i, status, edited)}
                      />
                    ))}
                  </div>
                </PageCard>

                <PageCard title="Suggested Medications" subtitle="Sourced only from the clinic's curated formulary reference">
                  <div className="space-y-3">
                    {result.ai_suggested_medications.map((m, i) => (
                      <SuggestionRow
                        key={i}
                        primaryText={`${m.drug} — ${m.dosage_range}`}
                        secondaryText={`${m.note} (source: ${m.source_reference})`}
                        decision={medicationDecisions[i]}
                        onDecide={(status, edited) => decide('medication', i, status, edited)}
                      />
                    ))}
                    {result.ai_suggested_medications.length === 0 && (
                      <div className="text-xs" style={{ color: 'var(--txt3)' }}>No formulary medication matched this complaint — use clinical judgment.</div>
                    )}
                  </div>
                </PageCard>

                <PageCard title="Finalize & Sign">
                  <div className="space-y-3">
                    <FormField label="Final diagnosis" required>
                      <AppTextarea value={finalDiagnosis} onChange={e => setFinalDiagnosis(e.target.value)} rows={2} />
                    </FormField>
                    <FormField label="Re-enter your password to sign" required hint="This confirms you, the treating doctor, take responsibility for the final decision">
                      <AppInput type="password" value={password} onChange={e => setPassword(e.target.value)} />
                    </FormField>
                    <div className="flex justify-end">
                      <AppBtn onClick={finalize} disabled={finalizing}>{finalizing ? 'Signing…' : 'Sign & Finalize Prescription'}</AppBtn>
                    </div>
                  </div>
                </PageCard>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function SuggestionRow({
  primaryText,
  secondaryText,
  decision,
  onDecide,
}: {
  primaryText: string
  secondaryText: string
  decision?: { status: SuggestionStatus; edited?: string }
  onDecide: (status: SuggestionStatus, edited?: string) => void
}) {
  const [editValue, setEditValue] = useState(primaryText)
  const [editing, setEditing] = useState(false)

  return (
    <div className="rounded-lg p-3" style={{ border: '1px solid var(--b1)', background: 'var(--s1)' }}>
      <div className="text-sm font-semibold" style={{ color: 'var(--txt)' }}>{primaryText}</div>
      <div className="text-xs mb-2" style={{ color: 'var(--txt3)' }}>{secondaryText}</div>
      {editing ? (
        <div className="flex gap-2 mb-2">
          <AppInput value={editValue} onChange={e => setEditValue(e.target.value)} />
          <AppBtn size="sm" onClick={() => { onDecide('edited', editValue); setEditing(false) }}>Save Edit</AppBtn>
        </div>
      ) : null}
      <div className="flex gap-2">
        <AppBtn size="sm" variant={decision?.status === 'accepted' ? 'primary' : 'secondary'} onClick={() => onDecide('accepted')}>Accept</AppBtn>
        <AppBtn size="sm" variant="secondary" onClick={() => setEditing(true)}>Edit</AppBtn>
        <AppBtn size="sm" variant={decision?.status === 'rejected' ? 'danger' : 'secondary'} onClick={() => onDecide('rejected')}>Reject</AppBtn>
        {decision && <span className="text-[11px] self-center capitalize" style={{ color: 'var(--txt3)' }}>{decision.status}</span>}
      </div>
    </div>
  )
}
