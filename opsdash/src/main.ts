import { createApp } from 'vue'
import App from './App.vue'
import { installThemeBootloader } from './services/theme'
import { setWidgetPresets } from './services/widgetDefaults'

function isDebugMode(): boolean {
  const w: any = typeof window !== 'undefined' ? window : {}
  return Boolean(w?.OC?.debug || w?.__DEV__ || w?.__VUE_PROD_DEVTOOLS__)
}

function debugLog(...args: any[]) {
  if (isDebugMode()) {
    console.log(...args)
  }
}

function debugWarn(...args: any[]) {
  if (isDebugMode()) {
    console.warn(...args)
  }
}

function mountWhenReady(){
  const el = document.getElementById('app')
  if (el) {
    try {
      debugLog('[opsdash] booting')
      const bootstrapWidgets = (el as HTMLElement).dataset?.opsdashDefaultWidgets
      if (bootstrapWidgets) {
        try {
          setWidgetPresets(JSON.parse(bootstrapWidgets))
        } catch (err) {
          debugWarn('[opsdash] failed to parse bootstrap widgets', err)
        }
      }
      const app = createApp(App)
      app.config.errorHandler = (err, instance, info) => {
        const name = instance?.type && (instance.type as any).name ? (instance.type as any).name : ''
        if (isDebugMode()) {
          const payload = { err, info, name, stack: err instanceof Error ? err.stack : undefined }
          const w:any = window as any
          if (!Array.isArray(w.__opsdashErrors)) {
            w.__opsdashErrors = []
          }
          w.__opsdashErrors.push(payload)
          console.error('[opsdash] Vue error', payload)
          return
        }
        console.error('[opsdash] Vue error')
      }
      const root = app.mount(el)
      const w:any = window as any
      w.__opsdashApp = app
      w.__opsdashRoot = root
      installThemeBootloader()
      debugLog('[opsdash] mounted')
    } catch (e) {
      if (isDebugMode()) {
        console.error('Mount failed', e)
      } else {
        console.error('Mount failed')
      }
    }
    return
  }
  // Try again shortly until DOM is ready
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(mountWhenReady, 50)
  } else {
    window.addEventListener('DOMContentLoaded', mountWhenReady, { once: true })
  }
}

// Kick off mounting
mountWhenReady()
