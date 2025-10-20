import { describe, it, expect } from 'vitest'
import { normalizeNumberInput, validateNumberField } from '../src/services/validators'

describe('normalizeNumberInput', () => {
  it('rejects non numeric input', () => {
    const res = normalizeNumberInput('abc', { min: 0, max: 10 })
    expect(res.value).toBeNull()
    expect(res.error).toBe('Enter a valid number')
  })

  it('allows empty when configured', () => {
    const res = normalizeNumberInput('', { allowEmpty: true })
    expect(res.value).toBeNull()
    expect(res.error).toBeUndefined()
  })

  it('clamps to range and rounds', () => {
    const res = normalizeNumberInput(12.345, { min: 0, max: 10, decimals: 2 })
    expect(res.value).toBe(10)
    expect(res.warning).toMatch(/Allowed range 0 – 10/)
  })

  it('rounds to step increments', () => {
    const res = normalizeNumberInput(2.37, { min: 0, max: 5, step: 0.25 })
    expect(res.value).toBeCloseTo(2.25)
    expect(res.warning).toMatch(/step 0.25/)
  })

  it('handles negative ranges', () => {
    const res = normalizeNumberInput(-105, { min: -100, max: 0, step: 0.1 })
    expect(res.value).toBe(-100)
    expect(res.warning).toMatch(/Allowed range -100 – 0/)
  })

  it('wraps results in validation issues', () => {
    const res = validateNumberField('abc', { min: 0, max: 10 })
    expect(res.value).toBeNull()
    expect(res.issues.some(issue => issue.severity === 'error')).toBe(true)
  })
})
