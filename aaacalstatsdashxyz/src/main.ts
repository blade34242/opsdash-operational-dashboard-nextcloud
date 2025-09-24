import { createApp } from 'vue'
import App from './App.vue'

function mountWhenReady(){
  const el = document.getElementById('app')
  if (el) {
    try {
      console.log('[aaacalstatsdashxyz] booting')
      createApp(App).mount(el)
      console.log('[aaacalstatsdashxyz] mounted')
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
