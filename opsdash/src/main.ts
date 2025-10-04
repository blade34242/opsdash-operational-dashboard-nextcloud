import { createApp } from 'vue'
import App from './App.vue'

function mountWhenReady(){
  const el = document.getElementById('app')
  if (el) {
    try {
      console.log('[opsdash] booting')
      createApp(App).mount(el)
      setFavicon()
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

function setFavicon(){
  try{
    const w:any = window as any
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    const pick = (dark:boolean)=>{
      if (w.OC && typeof w.OC.imagePath === 'function'){
        const fav = w.OC.imagePath('opsdash','favicon.svg')
        if (fav) return fav
        const svg = dark ? (w.OC.imagePath('opsdash','app-dark.svg') || w.OC.imagePath('opsdash','app.svg')) : w.OC.imagePath('opsdash','app.svg')
        return svg || ''
      }
      return '/apps-extra/opsdash/img/favicon.svg'
    }
    const iconPath = pick(prefersDark)
    if (!iconPath) return
    const rels = ['icon','shortcut icon']
    rels.forEach(rel => {
      let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null
      if (!link){ link = document.createElement('link'); link.rel = rel; document.head.appendChild(link) }
      link.type = 'image/svg+xml'
      link.href = iconPath
    })
    if (window.matchMedia){
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const onChange = ()=>{
        const p = pick(mq.matches)
        rels.forEach(rel => {
          const link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null
          if (link) link.href = p
        })
      }
      // Some browsers require addEventListener, others support addListener only
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange)
      // @ts-ignore legacy
      else if (typeof mq.addListener === 'function') mq.addListener(onChange)
    }
  }catch(e){ /* ignore favicon errors */ }
}
