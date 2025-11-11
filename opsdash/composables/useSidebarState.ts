import { ref, computed, watch, nextTick } from 'vue'

const STORAGE_KEY = 'opsdash.sidebarOpen'

function readInitial(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw == null ? true : raw === '1'
  } catch {
    return true
  }
}

export function useSidebarState() {
  const navOpen = ref<boolean>(readInitial())

  const persistState = (open: boolean) => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, open ? '1' : '0')
    } catch {
      // ignore storage errors
    }
  }

  watch(
    navOpen,
    (open) => {
      persistState(open)
      if (typeof window !== 'undefined') {
        nextTick(() => {
          window.dispatchEvent(new Event('resize'))
        }).catch(() => {})
      }
    },
    { immediate: false },
  )

  const toggleNav = () => {
    navOpen.value = !navOpen.value
  }

  const navToggleLabel = computed(() => (navOpen.value ? 'Hide sidebar' : 'Show sidebar'))
  const navToggleIcon = computed(() => (navOpen.value ? '⟨' : '⟩'))

  return {
    navOpen,
    toggleNav,
    navToggleLabel,
    navToggleIcon,
  }
}
