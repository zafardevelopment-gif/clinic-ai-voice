import { describe, it, expect } from 'vitest'
import { detectRedFlags } from './guardrails'

describe('detectRedFlags', () => {
  it('detects chest pain in English', () => {
    expect(detectRedFlags({ text: 'I have severe chest pain since morning' })).toContain('chest_pain')
  })

  it('detects chest pain in Hindi/Hinglish', () => {
    expect(detectRedFlags({ text: 'seene mein dard ho raha hai' })).toContain('chest_pain')
  })

  it('detects breathing difficulty', () => {
    expect(detectRedFlags({ text: "I can't breathe properly" })).toContain('breathing_difficulty')
  })

  it('detects unconsciousness', () => {
    expect(detectRedFlags({ text: 'patient is unconscious' })).toContain('unconsciousness')
  })

  it('detects seizure', () => {
    expect(detectRedFlags({ text: 'having a seizure right now' })).toContain('seizure')
  })

  it('detects heavy bleeding', () => {
    expect(detectRedFlags({ text: 'heavy bleeding from the wound' })).toContain('heavy_bleeding')
  })

  it('detects stroke signs', () => {
    expect(detectRedFlags({ text: 'sudden face drooping and slurred speech' })).toContain('stroke_signs')
  })

  it('is case-insensitive', () => {
    expect(detectRedFlags({ text: 'CHEST PAIN' })).toContain('chest_pain')
  })

  it('returns empty array for routine symptoms', () => {
    expect(detectRedFlags({ text: 'mild headache and runny nose' })).toEqual([])
  })

  it('flags very high fever in vulnerable age groups', () => {
    expect(detectRedFlags({ text: 'fever', feverC: 40.5, ageGroup: 'infant' })).toContain('very_high_fever_vulnerable_patient')
    expect(detectRedFlags({ text: 'fever', feverC: 40.5, ageGroup: 'senior' })).toContain('very_high_fever_vulnerable_patient')
  })

  it('does not flag high fever for non-vulnerable age groups', () => {
    expect(detectRedFlags({ text: 'fever', feverC: 40.5, ageGroup: 'adult' })).not.toContain('very_high_fever_vulnerable_patient')
  })

  it('does not flag fever below threshold even for vulnerable patients', () => {
    expect(detectRedFlags({ text: 'fever', feverC: 38.5, ageGroup: 'infant' })).not.toContain('very_high_fever_vulnerable_patient')
  })

  it('can detect multiple red flags at once', () => {
    const flags = detectRedFlags({ text: 'chest pain and cant breathe' })
    expect(flags).toContain('chest_pain')
    expect(flags).toContain('breathing_difficulty')
    expect(flags.length).toBeGreaterThanOrEqual(2)
  })
})
