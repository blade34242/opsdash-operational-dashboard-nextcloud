import { createApp } from 'vue'
import App from './App.vue'

function mountWhenReady(){
  const el = document.getElementById('app')
  if (el) {
    try {
      console.log('[aaacalstatsdashxyz] booting')
      createApp(App).mount(el)
      setFavicon()
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

function setFavicon(){
  try{
    const w:any = window as any
    // Prefer app.svg or favicon.svg from this app
    const iconPath = (w.OC && w.OC.imagePath) ? (w.OC.imagePath('aaacalstatsdashxyz','app.svg') || w.OC.imagePath('aaacalstatsdashxyz','favicon.svg')) : '/apps-extra/aaacalstatsdashxyz/img/app.svg'
    if (!iconPath) return
    const rels = ['icon','shortcut icon']
    rels.forEach(rel => {
      let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null
      if (!link){ link = document.createElement('link'); link.rel = rel; document.head.appendChild(link) }
      link.type = 'image/svg+xml'
      link.href = iconPath
    })
  }catch(e){ /* ignore favicon errors */ }
}
