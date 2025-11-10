import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'

import OnboardingWizard from '../src/components/OnboardingWizard.vue'

function mountWizard(overrides: Record<string, any> = {}) {
  return mount(OnboardingWizard, {
    props: {
      visible: true,
      calendars: [{ id: 'cal-1', displayname: 'Primary', color: '#ff0000' }],
      initialSelection: ['cal-1'],
      initialStrategy: 'total_only',
      onboardingVersion: 1,
      saving: false,
      closable: true,
      initialThemePreference: 'auto',
      systemTheme: 'light',
      initialAllDayHours: 8,
      initialTotalHours: 40,
      hasExistingConfig: true,
      snapshotSaving: false,
      snapshotNotice: null,
      ...overrides,
    },
  })
}

describe('OnboardingWizard', () => {
  it('disables the snapshot button while saving', async () => {
    const wrapper = mountWizard({ snapshotSaving: true })
    const button = wrapper.find('.config-warning button')
    expect(button.attributes('disabled')).toBeDefined()
  })

  it('renders snapshot notices when provided', () => {
    const wrapper = mountWizard({
      snapshotNotice: { type: 'success', message: 'Preset saved' },
    })
    const notice = wrapper.find('.snapshot-notice')
    expect(notice.exists()).toBe(true)
    expect(notice.text()).toContain('Preset saved')
  })
})
