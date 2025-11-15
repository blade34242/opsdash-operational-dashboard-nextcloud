import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { resolveCurrentTheme } from '../src/services/theme'

export type ThemePreference = 'auto' | 'light' | 'dark'
export type ThemeMode = 'light' | 'dark'

const preference = ref<ThemePreference>('auto')
const systemTheme = ref<ThemeMode>('light')
const isBootstrapped = ref(false)

const effectiveTheme = computed<ThemeMode>(() => {
  return preference.value === 'auto' ? systemTheme.value : preference.value
})

function readBootstrapPreference(): ThemePreference | null {
  if (typeof document === 'undefined') {
    return null
  }
  const el = document.getElementById('app')
  if (!el) {
    return null
  }
  const attr = el.getAttribute('data-opsdash-theme-preference')
  if (attr === 'light' || attr === 'dark' || attr === 'auto') {
    return attr
  }
  return null
}

function readStoredPreference(): ThemePreference {
  const bootstrap = readBootstrapPreference()
  return bootstrap ?? 'auto'
}

function applyTheme(theme: ThemeMode) {
  if (typeof document === 'undefined') return
  const root = document.getElementById('opsdash')
  if (!root) return
  root.classList.remove('opsdash-theme-light', 'opsdash-theme-dark')
  if (theme === 'dark') {
    root.classList.add('opsdash-theme-dark')
  } else {
    root.classList.add('opsdash-theme-light')
  }
}

function handleThemeEvent() {
  systemTheme.value = resolveCurrentTheme()
}

let mq: MediaQueryList | null = null
let mqHandler: ((event: MediaQueryListEvent) => void) | null = null

function bindMediaQuery() {
  if (typeof window === 'undefined' || mq) return
  mq = window.matchMedia('(prefers-color-scheme: dark)')
  mqHandler = () => handleThemeEvent()
  if (typeof mq.addEventListener === 'function') {
    mq.addEventListener('change', mqHandler)
  } else if (typeof (mq as any).addListener === 'function') {
    ;(mq as any).addListener(mqHandler)
  }
}

function unbindMediaQuery() {
  if (!mq) return
  if (mqHandler) {
    if (typeof mq.removeEventListener === 'function') {
      mq.removeEventListener('change', mqHandler)
    } else if (typeof (mq as any).removeListener === 'function') {
      ;(mq as any).removeListener(mqHandler)
    }
  }
  mq = null
  mqHandler = null
}

export function useThemePreference() {
  if (!isBootstrapped.value) {
    preference.value = readStoredPreference()
    systemTheme.value = resolveCurrentTheme()
    applyTheme(effectiveTheme.value)
    isBootstrapped.value = true
  }

  onMounted(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('oc:theme:changed', handleThemeEvent as EventListener)
    }
    bindMediaQuery()
    applyTheme(effectiveTheme.value)
  })

  onBeforeUnmount(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('oc:theme:changed', handleThemeEvent as EventListener)
    }
    unbindMediaQuery()
  })

  watch(effectiveTheme, (theme) => {
    applyTheme(theme)
  })

  function setThemePreference(value: ThemePreference) {
    preference.value = value
    applyTheme(effectiveTheme.value)
  }

  return {
    preference,
    effectiveTheme,
    systemTheme,
    setThemePreference,
  }
}
