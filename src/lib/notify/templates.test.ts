import { describe, it, expect } from 'vitest'
import { renderTemplate, getPatientMessageTemplate } from './templates'

describe('renderTemplate', () => {
  it('substitutes all placeholders', () => {
    const out = renderTemplate('Hi {patient_name}, see {doctor_name} at {clinic_name} on {date} {time}', {
      patient_name: 'Amit',
      doctor_name: 'Dr. Rao',
      clinic_name: 'City Clinic',
      date: '2026-07-15',
      time: '10:00',
    })
    expect(out).toBe('Hi Amit, see Dr. Rao at City Clinic on 2026-07-15 10:00')
  })

  it('leaves unknown placeholders untouched', () => {
    const out = renderTemplate('Hi {patient_name}, {unknown_var}', { patient_name: 'Amit', clinic_name: 'City Clinic' })
    expect(out).toBe('Hi Amit, {unknown_var}')
  })
})

describe('getPatientMessageTemplate', () => {
  it('returns a Hindi template for appointment_24h', () => {
    const t = getPatientMessageTemplate('appointment_24h', 'hi-IN')
    expect(t.length).toBeGreaterThan(0)
  })

  it('returns an English template for medication', () => {
    const t = getPatientMessageTemplate('medication', 'en-IN')
    expect(t).toContain('TAKEN')
  })

  it('falls back to en-IN for an unknown type', () => {
    const t = getPatientMessageTemplate('unknown_type' as Parameters<typeof getPatientMessageTemplate>[0], 'hi-IN')
    expect(t).toBe('')
  })
})
