import { defineAsyncComponent } from 'vue'

const TimeSummaryCard = defineAsyncComponent(() =>
  import('../../../components/TimeSummaryCard.vue').then((m) => m.default),
)

import { buildTitle } from '../helpers'
import { createDefaultTargetsConfig } from '../../targets'
import type { TargetsConfig } from '../../targets'
import type { RegistryEntry } from '../types'

const baseTitle = 'Time Summary'

export const timeSummaryV2Entry: RegistryEntry = {
  component: TimeSummaryCard,
  defaultLayout: { width: 'half', height: 's', order: 9 },
  label: 'Time Summary',
  baseTitle,
  configurable: true,
  defaultOptions: (() => {
    const defaults = createDefaultTargetsConfig().timeSummary
    return {
      ...defaults,
      mode: 'active',
    }
  })(),
  controls: [
    {
      key: 'mode',
      label: 'Average mode',
      type: 'select',
      options: [
        { value: 'active', label: 'Active days' },
        { value: 'all', label: 'All days' },
      ],
    },
    { key: 'showTotal', label: 'Total hours', type: 'toggle' },
    { key: 'showAverage', label: 'Average per day', type: 'toggle' },
    { key: 'showMedian', label: 'Median per day', type: 'toggle' },
    { key: 'showBusiest', label: 'Busiest day', type: 'toggle' },
    { key: 'showWorkday', label: 'Workdays row', type: 'toggle' },
    { key: 'showWeekend', label: 'Weekend row', type: 'toggle' },
    { key: 'showWeekendShare', label: 'Weekend share', type: 'toggle' },
    { key: 'showCalendarSummary', label: 'Top calendars', type: 'toggle' },
    { key: 'showTopCategory', label: 'Top category', type: 'toggle' },
    { key: 'showBalance', label: 'Balance index', type: 'toggle' },
  ],
  buildProps: (def, ctx) => {
    const baseConfig: TargetsConfig = ctx.targetsConfig ? JSON.parse(JSON.stringify(ctx.targetsConfig)) : createDefaultTargetsConfig()
    const cfg = {
      ...baseConfig,
      timeSummary: { ...baseConfig.timeSummary },
    }
    const applyToggle = (key: keyof TargetsConfig['timeSummary']) => {
      if (def.options?.[key] === undefined) return
      cfg.timeSummary[key] = !!def.options[key]
    }
    ;(['showTotal','showAverage','showMedian','showBusiest','showWorkday','showWeekend','showWeekendShare','showCalendarSummary','showTopCategory','showBalance'] as Array<keyof TargetsConfig['timeSummary']>).forEach(applyToggle)

    return {
      summary: ctx.summary,
      activitySummary: ctx.activitySummary,
      mode: (def.options?.mode as 'active' | 'all' | undefined) ?? ctx.activeDayMode ?? 'active',
      config: cfg.timeSummary,
      todayGroups: def.props?.todayGroups ?? ctx.groups,
      title: buildTitle(baseTitle, def.options?.titlePrefix),
      cardBg: def.options?.cardBg,
      rangeMode: ctx.rangeMode,
      rangeStart: ctx.from,
      rangeEnd: ctx.to,
      offset: ctx.offset,
    }
  },
}
