import { ref } from 'vue'

export function useDetailsToggle(initial: number | null = null) {
  const detailsIndex = ref<number | null>(initial)

  function toggle(idx: number) {
    detailsIndex.value = detailsIndex.value === idx ? null : idx
  }

  return {
    detailsIndex,
    toggle,
  }
}
