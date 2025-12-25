import { defineAsyncComponent } from 'vue'

const TextBlockWidget = defineAsyncComponent(() =>
  import('../../../components/TextBlockWidget.vue').then((m) => m.default),
)

import { buildTitle, collectPresetItems, resolvePreset } from '../helpers'
import type { RegistryEntry, TextPresetKey } from '../types'

export const textBlockEntry: RegistryEntry = {
  component: TextBlockWidget,
  defaultLayout: { width: 'quarter', height: 's', order: 65 },
  label: 'Text label',
  configurable: true,
  controls: [
    {
      key: 'preset',
      label: 'Source',
      type: 'select',
      options: [
        { value: '', label: 'Custom' },
        { value: 'targets', label: 'Targets' },
        { value: 'activity', label: 'Activity & Schedule' },
        { value: 'balance', label: 'Balance' },
        { value: 'mix', label: 'Category mix' },
        { value: 'dayoff', label: 'Days off trend' },
        { value: 'deck', label: 'Deck' },
        { value: 'notes', label: 'Notes' },
      ],
    },
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'body', label: 'Body', type: 'textarea' },
    { key: 'include', label: 'Include all labels', type: 'toggle' },
  ],
  buildProps: (def, ctx) => ({
    title: buildTitle(resolvePreset(def.options?.preset as TextPresetKey).title ?? 'Text', def.options?.titlePrefix),
    body: resolvePreset(def.options?.preset as TextPresetKey).body ?? def.options?.body ?? '',
    items: collectPresetItems(def.options?.preset as TextPresetKey, def.options || {}, ctx),
    cardBg: def.options?.cardBg,
    showHeader: def.options?.showHeader !== false,
  }),
  dynamicControls: (options: Record<string, any>) => {
    if (options?.preset !== 'activity') return []
    return [
      { key: 'weekendShare', label: 'Weekend share', type: 'toggle' },
      { key: 'eveningShare', label: 'Evening share', type: 'toggle' },
      { key: 'earliestLatest', label: 'Earliest/Late times', type: 'toggle' },
      { key: 'overlaps', label: 'Overlaps', type: 'toggle' },
      { key: 'longest', label: 'Longest session', type: 'toggle' },
      { key: 'lastDayOff', label: 'Last day off', type: 'toggle' },
    ]
  },
}
