import { onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'

type LayoutTab = { id: string; label: string }

type TabContextState = {
  open: boolean
  x: number
  y: number
  tabId: string | null
}

export function useLayoutTabsContext(input: {
  layoutTabs: Ref<LayoutTab[]>
  activeTabId: Ref<string>
  activeTabLabel: Ref<string>
  isLayoutEditing: Ref<boolean>
  setActiveTab: (id: string) => void
  setDefaultTab: (id: string) => void
  removeTab: (id: string) => void
  renameTab: (id: string, label: string) => void
}) {
  const tabLabelDraft = ref('')
  const tabEditingId = ref<string | null>(null)
  const tabContext = ref<TabContextState>({
    open: false,
    x: 0,
    y: 0,
    tabId: null,
  })
  const addOrderHint = ref<number | null>(null)

  const resetContext = () => {
    tabEditingId.value = null
    tabContext.value = { open: false, x: 0, y: 0, tabId: null }
    addOrderHint.value = null
  }

  watch(
    () => input.activeTabId.value,
    () => {
      if (!tabEditingId.value) {
        tabLabelDraft.value = input.activeTabLabel.value
      }
    },
    { immediate: true },
  )

  watch(
    () => input.isLayoutEditing.value,
    (next) => {
      if (!next) {
        resetContext()
      }
    },
  )

  function handleTabClick(id: string) {
    if (!input.isLayoutEditing.value) {
      input.setActiveTab(id)
      addOrderHint.value = null
      return
    }
    if (input.activeTabId.value !== id) {
      input.setActiveTab(id)
      tabEditingId.value = null
      addOrderHint.value = null
      return
    }
    tabEditingId.value = id
    const tab = input.layoutTabs.value.find((t) => t.id === id)
    tabLabelDraft.value = tab?.label || ''
  }

  function openTabContextMenuAt(x: number, y: number, tabId: string) {
    tabContext.value = { open: true, x, y, tabId }
  }

  function openTabContextMenu(evt: MouseEvent, tabId: string) {
    if (!input.isLayoutEditing.value) return
    openTabContextMenuAt(evt.clientX, evt.clientY, tabId)
  }

  function openTabContextMenuFromButton(evt: MouseEvent, tabId: string) {
    if (!input.isLayoutEditing.value) return
    const target = evt.currentTarget as HTMLElement | null
    if (!target) {
      openTabContextMenuAt(evt.clientX, evt.clientY, tabId)
      return
    }
    const rect = target.getBoundingClientRect()
    openTabContextMenuAt(rect.left, rect.bottom + 6, tabId)
  }

  function closeTabContextMenu() {
    tabContext.value = { open: false, x: 0, y: 0, tabId: null }
  }

  function setDefaultTabFromMenu() {
    if (!tabContext.value.tabId) return
    input.setDefaultTab(tabContext.value.tabId)
    closeTabContextMenu()
  }

  function removeTabFromMenu() {
    if (!tabContext.value.tabId) return
    input.removeTab(tabContext.value.tabId)
    closeTabContextMenu()
  }

  function renameTabFromMenu() {
    if (!tabContext.value.tabId) return
    tabEditingId.value = tabContext.value.tabId
    const tab = input.layoutTabs.value.find((t) => t.id === tabContext.value.tabId)
    tabLabelDraft.value = tab?.label || ''
    closeTabContextMenu()
  }

  function commitTabLabel() {
    if (!tabEditingId.value) return
    const label = tabLabelDraft.value.trim()
    const tab = input.layoutTabs.value.find((t) => t.id === tabEditingId.value)
    if (!tab) {
      tabEditingId.value = null
      return
    }
    if (!label) {
      tabLabelDraft.value = tab.label
      tabEditingId.value = null
      return
    }
    if (label !== tab.label) {
      input.renameTab(tab.id, label)
    }
    tabEditingId.value = null
  }

  function cancelTabLabel() {
    if (!tabEditingId.value) return
    const tab = input.layoutTabs.value.find((t) => t.id === tabEditingId.value)
    tabLabelDraft.value = tab?.label || ''
    tabEditingId.value = null
  }

  function setAddHint(orderHint?: number) {
    addOrderHint.value = Number.isFinite(orderHint ?? NaN) ? Number(orderHint) : null
  }

  function handleGlobalClick(event: MouseEvent) {
    if (!tabContext.value.open) return
    const target = event.target as HTMLElement | null
    if (!target) return
    if (target.closest('.tab-context-menu')) return
    if (target.closest('.tab-btn')) return
    if (target.closest('.tab-menu-btn')) return
    closeTabContextMenu()
  }

  onMounted(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('click', handleGlobalClick)
    }
  })

  onBeforeUnmount(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('click', handleGlobalClick)
    }
  })

  return {
    tabLabelDraft,
    tabEditingId,
    tabContext,
    addOrderHint,
    handleTabClick,
    openTabContextMenu,
    openTabContextMenuFromButton,
    setDefaultTabFromMenu,
    removeTabFromMenu,
    renameTabFromMenu,
    commitTabLabel,
    cancelTabLabel,
    setAddHint,
    resetContext,
  }
}
