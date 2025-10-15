import { createApp } from 'vue'
import App from './App.vue'

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
      installFaviconSync()
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

let faviconObserver: MutationObserver | null = null
let mqCleanup: (() => void) | null = null
let themeEventBound = false

function installFaviconSync(){
  if (typeof window === 'undefined') return
  try{
    updateFavicon()
    bindThemeWatchers()
  }catch(e){ /* ignore favicon errors */ }
}

function bindThemeWatchers(){
  if (faviconObserver || mqCleanup || themeEventBound) return

  const targets: Element[] = []
  if (document.documentElement) targets.push(document.documentElement)
  if (document.body && document.body !== document.documentElement) targets.push(document.body)

  if (targets.length){
    faviconObserver = new MutationObserver(() => updateFavicon())
    targets.forEach(target => {
      faviconObserver?.observe(target, { attributes: true, attributeFilter: ['data-theme', 'class'] })
    })
  }

  if (window.matchMedia){
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => updateFavicon()
    if (typeof mq.addEventListener === 'function'){
      mq.addEventListener('change', handler)
      mqCleanup = () => mq.removeEventListener('change', handler)
    } else if (typeof mq.addListener === 'function'){
      // @ts-ignore legacy addListener
      mq.addListener(handler)
      mqCleanup = () => {
        // @ts-ignore legacy removeListener
        mq.removeListener(handler)
      }
    }
  }

  const themeEvent = 'oc:theme:changed'
  window.addEventListener(themeEvent, updateFavicon)
  themeEventBound = true
}

function updateFavicon(){
  const path = resolveFaviconPath()
  if (!path) return
  const rels = ['icon','shortcut icon']
  rels.forEach(rel => {
    let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null
    if (!link){
      link = document.createElement('link')
      link.rel = rel
      document.head.appendChild(link)
    }
    link.type = 'image/svg+xml'
    link.href = path
  })
}

function resolveFaviconPath(): string {
  const w:any = window as any
  const theme = resolveCurrentTheme()
  const preferDark = theme === 'dark'
  const imagePath = (name:string) => (typeof w.OC?.imagePath === 'function') ? w.OC.imagePath('opsdash', name) : ''

  const direct = imagePath('favicon.svg')
  if (direct) return direct

  if (preferDark){
    const dark = imagePath('app-dark.svg')
    if (dark) return dark
  }

  const baseIcon = preferDark ? imagePath('app-dark.svg') : imagePath('app.svg')
  if (baseIcon) return baseIcon

  return '/apps-extra/opsdash/img/favicon.svg'
}

function resolveCurrentTheme(): 'dark' | 'light' {
  const themeAttr = document.documentElement?.getAttribute('data-theme')
  if (themeAttr === 'dark' || themeAttr === 'light') return themeAttr

  const bodyAttr = document.body?.getAttribute('data-theme')
  if (bodyAttr === 'dark' || bodyAttr === 'light') return bodyAttr

  if (document.body?.classList.contains('theme--dark')) return 'dark'
  if (document.body?.classList.contains('theme--light')) return 'light'

  const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
  return mq?.matches ? 'dark' : 'light'
}
