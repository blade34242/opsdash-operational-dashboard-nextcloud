export const ALLOWED_CONFIG_KEYS = [
  'cals',
  'groups',
  'targets_week',
  'targets_month',
  'targets_config',
  'theme_preference',
  'onboarding',
  'widgets',
] as const

export type SidebarConfigPayload = Partial<Record<typeof ALLOWED_CONFIG_KEYS[number], any>>

export type SanitiseResult = {
  cleaned: SidebarConfigPayload
  ignored: string[]
}

const THEME_VALUES = new Set(['auto', 'light', 'dark'])

export function sanitiseSidebarPayload(raw: unknown): SanitiseResult {
  if (!raw || typeof raw !== 'object') {
    return { cleaned: {}, ignored: ['<invalid-payload>'] }
  }
  const source = raw as Record<string, unknown>
  const cleaned: SidebarConfigPayload = {}
  const ignored: string[] = []

  ALLOWED_CONFIG_KEYS.forEach((key) => {
    if (source[key] !== undefined) {
      cleaned[key] = source[key]
    }
  })

  Object.keys(source).forEach((key) => {
    if (!ALLOWED_CONFIG_KEYS.includes(key as any)) {
      ignored.push(key)
    }
  })

  if (cleaned.cals && !Array.isArray(cleaned.cals)) {
    ignored.push('cals')
    delete cleaned.cals
  }
  if ('groups' in cleaned && (!cleaned.groups || typeof cleaned.groups !== 'object')) {
    ignored.push('groups')
    delete cleaned.groups
  }
  if ('targets_week' in cleaned && (!cleaned.targets_week || typeof cleaned.targets_week !== 'object')) {
    ignored.push('targets_week')
    delete cleaned.targets_week
  }
  if ('targets_month' in cleaned && (!cleaned.targets_month || typeof cleaned.targets_month !== 'object')) {
    ignored.push('targets_month')
    delete cleaned.targets_month
  }
  if ('targets_config' in cleaned && (!cleaned.targets_config || typeof cleaned.targets_config !== 'object')) {
    ignored.push('targets_config')
    delete cleaned.targets_config
  }
  if (cleaned.theme_preference && !THEME_VALUES.has(String(cleaned.theme_preference))) {
    ignored.push('theme_preference')
    delete cleaned.theme_preference
  }
  if ('onboarding' in cleaned && (cleaned.onboarding == null || typeof cleaned.onboarding !== 'object')) {
    ignored.push('onboarding')
    delete cleaned.onboarding
  }
  if ('widgets' in cleaned) {
    const val = cleaned.widgets as any
    const okArray = Array.isArray(val)
    const okTabs = val && typeof val === 'object' && Array.isArray(val.tabs)
    if (!okArray && !okTabs) {
      ignored.push('widgets')
      delete cleaned.widgets
    }
  }

  return { cleaned, ignored }
}

export function buildConfigEnvelope(payload: SidebarConfigPayload, version = '0.5.5') {
  return {
    version,
    generated: new Date().toISOString(),
    payload,
  }
}
