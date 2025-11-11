import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'

import { useConfigExportImport } from '../composables/useConfigExportImport'
import { createDefaultTargetsConfig } from '../src/services/targets'
import presetFixture from './fixtures/preset-export.json'
import onboardingFixture from './fixtures/onboarding-export.json'

function setup(overrides: Record<string, any> = {}) {
  const selected = ref<string[]>(['personal'])
  const groupsById = ref<Record<string, number>>({ personal: 0 })
  const targetsWeek = ref<Record<string, number>>({ personal: 5 })
  const targetsMonth = ref<Record<string, number>>({ personal: 20 })
  const targetsConfig = ref(createDefaultTargetsConfig())
  const themePreference = ref<'auto' | 'light' | 'dark'>('auto')
  const onboardingState = ref<any>(null)

  const setThemePreference = vi.fn()
  const postJson = vi.fn().mockResolvedValue({})
  const route = vi.fn().mockReturnValue('/persist')
  const performLoad = vi.fn()
  const notifySuccess = vi.fn()
  const notifyError = vi.fn()
  const createDownload = overrides.createDownload ?? vi.fn()

  const helpers = useConfigExportImport({
    selected,
    groupsById,
    targetsWeek,
    targetsMonth,
    targetsConfig,
    themePreference,
    onboardingState,
    setThemePreference,
    postJson,
    route,
    performLoad,
    notifySuccess,
    notifyError,
    createDownload,
  })

  return {
    selected,
    groupsById,
    targetsWeek,
    targetsMonth,
    targetsConfig,
    themePreference,
    onboardingState,
    setThemePreference,
    postJson,
    route,
    performLoad,
    notifySuccess,
    notifyError,
    createDownload,
    ...helpers,
  }
}

describe('useConfigExportImport', () => {
  it('exports configuration envelope via custom downloader', () => {
    const ctx = setup({ createDownload: vi.fn() })
    ctx.exportSidebarConfig()

    expect(ctx.createDownload).toHaveBeenCalledTimes(1)
    const [filename, envelope] = ctx.createDownload.mock.calls[0]
    expect(filename).toMatch(/opsdash-config-/)
    expect(envelope).toHaveProperty('payload')
  })

  it('applies onboarding export payload without warnings', async () => {
    const ctx = setup()

    await ctx.applyConfigSource(onboardingFixture.payload)

    expect(ctx.selected.value).toEqual(onboardingFixture.payload.cals)
    expect(ctx.groupsById.value).toEqual(onboardingFixture.payload.groups)
    expect(ctx.targetsWeek.value).toEqual(onboardingFixture.payload.targets_week)
    expect(ctx.targetsMonth.value).toEqual(onboardingFixture.payload.targets_month)
    expect(ctx.targetsConfig.value.totalHours).toBe(onboardingFixture.payload.targets_config.totalHours)
    expect(ctx.setThemePreference).toHaveBeenCalledWith('dark', { persist: false })
    expect(ctx.postJson).toHaveBeenCalledWith('/persist', expect.any(Object))
    expect(ctx.performLoad).toHaveBeenCalledTimes(1)
    expect(ctx.notifySuccess).toHaveBeenCalledWith('Configuration imported')
    expect(ctx.notifyError).not.toHaveBeenCalled()
  })

  it('sanitises preset export payloads', async () => {
    const ctx = setup()
    await ctx.applyConfigSource(presetFixture.payload)

    expect(ctx.selected.value).toEqual(presetFixture.payload.cals)
    expect(ctx.targetsWeek.value).toEqual(presetFixture.payload.targets_week)
    expect(ctx.notifySuccess).toHaveBeenCalled()
  })
})
