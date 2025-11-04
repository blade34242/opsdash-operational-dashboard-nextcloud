import { describe, it, expect } from 'vitest'
import { sanitiseSidebarPayload, ALLOWED_CONFIG_KEYS } from '../src/utils/sidebarConfig'

describe('sidebar config sanitiser', () => {
  it('keeps only allowed keys', () => {
    const { cleaned, ignored } = sanitiseSidebarPayload({
      cals: ['cal-1'],
      groups: { 'cal-1': 0 },
      targets_week: { 'cal-1': 12 },
      targets_month: { 'cal-1': 48 },
      targets_config: { foo: 'bar' },
      theme_preference: 'dark',
      onboarding: { completed: true },
      extra: 'ignore-me',
    })
    expect(Object.keys(cleaned).sort()).toEqual([...ALLOWED_CONFIG_KEYS].sort())
    expect(ignored).toContain('extra')
  })

  it('drops invalid types', () => {
    const { cleaned, ignored } = sanitiseSidebarPayload({
      groups: 'oops',
      targets_week: null,
      cals: 'not-array',
    })
    expect(cleaned).toEqual({})
    expect(ignored.sort()).toEqual(['groups', 'targets_week', 'cals'].sort())
  })
})
