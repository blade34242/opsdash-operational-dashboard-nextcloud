import { createApp } from 'vue'
import App from './App.vue'
import { installThemeBootloader } from './services/theme'

function mountWhenReady(){
  const el = document.getElementById('app')
  if (el) {
    try {
      console.log('[opsdash] booting')
      const app = createApp(App)
      app.config.errorHandler = (err, instance, info) => {
        const name = instance?.type && (instance.type as any).name ? (instance.type as any).name : ''
        const payload = { err, info, name, stack: err instanceof Error ? err.stack : undefined }
        const w:any = window as any
        if (!Array.isArray(w.__opsdashErrors)) {
          w.__opsdashErrors = []
        }
        w.__opsdashErrors.push(payload)
        console.error('[opsdash] Vue error', payload)
      }
      const root = app.mount(el)
      const w:any = window as any
      w.__opsdashApp = app
      w.__opsdashRoot = root
      installThemeBootloader()
      console.log('[opsdash] mounted')
    } catch (e) {
      console.error('Mount failed', e)
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
