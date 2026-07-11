import { describe, it, expect } from 'vitest'
import { deriveFlag } from './lab-explanation'

describe('deriveFlag', () => {
  it('flags a value within range as normal', () => {
    expect(deriveFlag('95', '70-110')).toBe('normal')
  })

  it('flags a value below range as low', () => {
    expect(deriveFlag('11.2', '13-17')).toBe('low')
  })

  it('flags a value above range as high', () => {
    expect(deriveFlag('120', '70-110')).toBe('high')
  })

  it('flags a wildly low value as critical', () => {
    expect(deriveFlag('5', '13-17')).toBe('critical')
  })

  it('flags a wildly high value as critical', () => {
    expect(deriveFlag('300', '70-110')).toBe('critical')
  })

  it('returns normal when no reference range is given', () => {
    expect(deriveFlag('95')).toBe('normal')
  })

  it('returns normal when the range is unparseable', () => {
    expect(deriveFlag('95', 'see notes')).toBe('normal')
  })

  it('returns normal when the value is not numeric', () => {
    expect(deriveFlag('positive', '70-110')).toBe('normal')
  })
})
