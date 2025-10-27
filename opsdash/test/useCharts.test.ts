import { ref } from 'vue'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { useCharts } from '../composables/useCharts'
import {
  createDefaultActivityCardConfig,
  createDefaultTargetsConfig,
  type ActivityForecastMode,
  type TargetsConfig,
} from '../src/services/targets'

type HarnessResult = ReturnType<typeof createHarness>

describe('useCharts forecast integration', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-05-20T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('computes total-mode forecast using remaining overall target', () => {
    const harness = createHarness('total', {
      configureTargets(cfg) {
        cfg.totalHours = 10
      },
      currentTargets: { calA: 6, calB: 4 },
    })

    const series = harness.calendarChartData.value.stacked!.series
    expect(series).toHaveLength(2)
    expect(series[0].forecast).toEqual([0, 0, 4.5])
    expect(series[1].forecast).toEqual([0, 0, 1.5])
  })

  it('respects per-calendar targets in calendar mode', () => {
    const harness = createHarness('calendar', {
      configureTargets(cfg) {
        cfg.totalHours = 12
      },
      currentTargets: { calA: 8, calB: 4 },
    })

    const series = harness.calendarChartData.value.stacked!.series
    expect(series[0].forecast).toEqual([0, 0, 5])
    expect(series[1].forecast).toEqual([0, 0, 3])
  })

  it('allocates by category targets and falls back per calendar', () => {
    const harness = createHarness('category', {
      configureTargets(cfg) {
        cfg.categories = [
          { id: 'work', label: 'Work', targetHours: 6, includeWeekend: false, paceMode: 'days_only', groupIds: [1] },
          { id: 'hobby', label: 'Hobby', targetHours: 4, includeWeekend: true, paceMode: 'days_only', groupIds: [2] },
        ]
      },
      currentTargets: { calA: 6, calB: 4 },
    })

    const series = harness.calendarChartData.value.stacked!.series
    expect(series[0].forecast).toEqual([0, 0, 3])
    expect(series[1].forecast).toEqual([0, 0, 3])
  })

  it('disables forecast when mode is off', () => {
    const harness = createHarness('off', {})
    const series = harness.calendarChartData.value.stacked!.series
    expect(series[0].forecast).toBeUndefined()
    expect(series[1].forecast).toBeUndefined()
  })
})

function createHarness(
  mode: ActivityForecastMode,
  options: {
    configureTargets?: (cfg: TargetsConfig) => void
    currentTargets?: Record<string, number>
  },
) {
  const charts = ref<any>({
    perDaySeries: {
      labels: ['2025-05-18', '2025-05-19', '2025-05-21'],
      series: [
        { id: 'calA', name: 'Calendar A', color: '#2563eb', data: [2, 1, 0] },
        { id: 'calB', name: 'Calendar B', color: '#f97316', data: [1, 0, 0] },
      ],
    },
  })
  const colorsById = ref<Record<string, string>>({ calA: '#2563eb', calB: '#f97316' })
  const colorsByName = ref<Record<string, string>>({})
  const calendarGroups = ref<any[]>([])
  const calendarCategoryMap = ref<Record<string, string>>({ calA: 'work', calB: 'hobby' })

  const targetsConfig = ref(createTargetsConfig(options.configureTargets))
  const currentTargets = ref<Record<string, number>>(options.currentTargets ?? { calA: 5, calB: 5 })

  const activityCardConfig = ref({
    ...createDefaultActivityCardConfig(),
    forecastMode: mode,
  })

  const harness = useCharts({
    charts,
    colorsById,
    colorsByName,
    calendarGroups,
    calendarCategoryMap,
    targetsConfig,
    currentTargets,
    activityCardConfig,
  })

  return {
    calendarChartData: harness.calendarChartData,
  }
}

function createTargetsConfig(configure?: (cfg: TargetsConfig) => void): TargetsConfig {
  const cfg = createDefaultTargetsConfig()
  cfg.totalHours = 8
  cfg.categories = [
    { id: 'work', label: 'Work', targetHours: 5, includeWeekend: false, paceMode: 'days_only', groupIds: [1] },
    { id: 'hobby', label: 'Hobby', targetHours: 3, includeWeekend: true, paceMode: 'days_only', groupIds: [2] },
  ]
  configure?.(cfg)
  return cfg
}
