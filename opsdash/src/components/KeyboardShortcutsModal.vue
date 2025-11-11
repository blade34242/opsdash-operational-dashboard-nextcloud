<template>
  <div
    v-if="visible"
    class="shortcuts-overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="opsdash-shortcuts-title"
    @click.self="emitClose"
  >
    <div
      ref="panelRef"
      class="shortcuts-panel"
      tabindex="-1"
      @keydown.esc.prevent="emitClose"
    >
      <header class="shortcuts-header">
        <div class="shortcuts-title">
          <h2 id="opsdash-shortcuts-title">Keyboard Shortcuts</h2>
          <p class="shortcuts-hint">Press Esc to close or ? to reopen.</p>
        </div>
        <button
          type="button"
          class="shortcuts-close"
          aria-label="Close shortcuts overlay"
          @click="emitClose"
        >
          ×
        </button>
      </header>
      <div class="shortcuts-body">
        <section
          v-for="group in groups"
          :key="group.id"
          class="shortcuts-group"
        >
          <h3>{{ group.title }}</h3>
          <ul>
            <li v-for="item in group.items" :key="item.id">
              <span class="shortcut-label">
                {{ item.label }}
                <small v-if="item.description">{{ item.description }}</small>
              </span>
              <span class="shortcut-combo" aria-hidden="true">
                <kbd v-for="(part, idx) in item.combo" :key="idx">{{ part }}</kbd>
              </span>
            </li>
          </ul>
        </section>
      </div>
      <footer class="shortcuts-footer">
        <NcButton type="primary" size="small" @click="emitClose">
          Close
        </NcButton>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NcButton } from '@nextcloud/vue'
import { ref, watch, nextTick } from 'vue'

import type { ShortcutGroup } from '../services/shortcuts'

const props = defineProps<{
  visible: boolean
  groups: ShortcutGroup[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const panelRef = ref<HTMLDivElement | null>(null)

function emitClose() {
  emit('close')
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      nextTick(() => {
        panelRef.value?.focus()
      }).catch(() => {})
    }
  },
)
</script>

<style scoped>
.shortcuts-overlay {
  position: fixed;
  inset: 0;
  background: color-mix(in srgb, var(--color-background-dark-default, rgba(0, 0, 0, 0.85)) 90%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 9999;
}

.shortcuts-panel {
  width: min(720px, 100%);
  max-height: 90vh;
  overflow: auto;
  background: var(--color-main-background, #fff);
  border-radius: 16px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.35);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  outline: none;
}

.shortcuts-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.shortcuts-title h2 {
  margin: 0;
  font-size: 20px;
}

.shortcuts-hint {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-color-tertiary);
}

.shortcuts-close {
  border: none;
  background: transparent;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  color: var(--text-color-primary, #111);
}

.shortcuts-body {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.shortcuts-group h3 {
  margin: 0 0 8px;
  font-size: 14px;
  text-transform: uppercase;
  color: var(--text-color-tertiary);
  letter-spacing: 0.06em;
}

.shortcuts-group ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.shortcuts-group li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--color-border, rgba(0, 0, 0, 0.1)) 60%, transparent);
}

.shortcuts-group li:last-child {
  border-bottom: none;
}

.shortcut-label {
  font-weight: 600;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.shortcut-label small {
  font-weight: 400;
  font-size: 12px;
  color: var(--text-color-tertiary);
}

.shortcut-combo {
  display: inline-flex;
  gap: 6px;
}

kbd {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--color-border, rgba(0, 0, 0, 0.2)) 80%, transparent);
  background: color-mix(in srgb, var(--color-main-background, #fff) 80%, rgba(0, 0, 0, 0.05));
  color: var(--text-color-primary, #111);
  box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.6);
}

.shortcuts-footer {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 600px) {
  .shortcuts-panel {
    padding: 16px;
  }
  .shortcuts-body {
    grid-template-columns: 1fr;
  }
}
</style>
