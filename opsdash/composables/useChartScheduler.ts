import { onBeforeUnmount } from 'vue'

export function useChartScheduler() {
  let rafId: number | null = null

  function scheduleDraw() {
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      return
    }
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId)
    }
    rafId = window.requestAnimationFrame(() => {
      rafId = null
      window.dispatchEvent(new Event('resize'))
    })
  }

  onBeforeUnmount(() => {
    if (rafId !== null && typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
      window.cancelAnimationFrame(rafId)
      rafId = null
    }
  })

  return {
    scheduleDraw,
  }
}
