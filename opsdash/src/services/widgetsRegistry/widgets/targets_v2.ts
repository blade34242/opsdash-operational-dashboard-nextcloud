import { defineAsyncComponent } from 'vue'

const TimeTargetsCard = defineAsyncComponent(() =>
  import('../../../components/TimeTargetsCard.vue').then((m) => m.default),
)

import { attachUi, buildTitle, copyConfigForRange, safeBuildTargetsSummary } from '../helpers'
import { createDefaultTargetsConfig } from '../../targets'
import type { RegistryEntry } from '../types'

const baseTitle = 'Targets'

export const targetsV2Entry: RegistryEntry = {
  component: TimeTargetsCard,
  defaultLayout: { width: 'half', height: 'm', order: 18 },
  label: 'Targets',
  baseTitle,
  configurable: true,
  defaultOptions: {
    showForecast: true,
    showPace: true,
    useLocalConfig: false,
    localConfig: null,
  },
  controls: [
    { key: 'showHeader', label: 'Show header', type: 'toggle' },
    { key: 'showLegend', label: 'Show legend', type: 'toggle' },
    { key: 'showDelta', label: 'Show delta', type: 'toggle' },
    { key: 'showForecast', label: 'Show forecast', type: 'toggle' },
    { key: 'showPace', label: 'Show pace line', type: 'toggle' },
    { key: 'showToday', label: 'Show today overlay', type: 'toggle' },
    { key: 'useLocalConfig', label: 'Use custom targets for this widget', type: 'toggle' },
    { key: 'showTotalDelta', label: 'Show total delta', type: 'toggle' },
    { key: 'showNeedPerDay', label: 'Show need per day', type: 'toggle' },
    { key: 'showCategoryBlocks', label: 'Show categories', type: 'toggle' },
    { key: 'badges', label: 'Status badges', type: 'toggle' },
    { key: 'includeWeekendToggle', label: 'Weekend toggle', type: 'toggle' },
    { key: 'includeZeroDaysInStats', label: 'Include zero days in pace', type: 'toggle' },
    // footer removed
  ],
  buildProps: (def, ctx) => {
    const useLocal = !!def.options?.useLocalConfig
    const baseConfig =
      useLocal && def.options?.localConfig
        ? JSON.parse(JSON.stringify(def.options.localConfig))
        : ctx.targetsConfig
          ? JSON.parse(JSON.stringify(ctx.targetsConfig))
          : createDefaultTargetsConfig()
    const cfg = attachUi(copyConfigForRange(baseConfig, ctx.rangeMode))
    const applyBool = (key: string, setter: (val: boolean) => void) => {
      if (def.options?.[key] === undefined) return
      setter(!!def.options[key])
    }
    applyBool('showTotalDelta', (val) => { cfg.ui.showTotalDelta = val })
    applyBool('showNeedPerDay', (val) => { cfg.ui.showNeedPerDay = val })
    applyBool('showCategoryBlocks', (val) => { cfg.ui.showCategoryBlocks = val })
    applyBool('badges', (val) => { cfg.ui.badges = val })
    applyBool('includeWeekendToggle', (val) => { cfg.ui.includeWeekendToggle = val })
    applyBool('includeZeroDaysInStats', (val) => { cfg.includeZeroDaysInStats = val })

    const summary = useLocal && ctx.stats
      ? safeBuildTargetsSummary(cfg, ctx)
      : (ctx.targetsSummary ?? ctx.summary)
    const groups = useLocal ? null : (def.props?.groups ?? ctx.groups)

    return {
      summary,
      config: cfg,
      groups,
      showHeader: def.options?.showHeader !== false,
      showLegend: def.options?.showLegend !== false,
      showDelta: def.options?.showDelta !== false,
      showForecast: def.options?.showForecast !== false,
      showPace: def.options?.showPace !== false,
      showToday: def.options?.showToday !== false,
      title: buildTitle(baseTitle, def.options?.titlePrefix),
      cardBg: def.options?.cardBg,
    }
  },
}
