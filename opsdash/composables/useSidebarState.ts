import { ref, computed, watch, nextTick } from 'vue'

function readInitial(): boolean {
  return true
}

export function useSidebarState() {
  const navOpen = ref<boolean>(readInitial())

  watch(
    navOpen,
    (open) => {
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
