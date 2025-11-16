export type ThemePreferenceValue = 'auto' | 'light' | 'dark'

let faviconObserver: MutationObserver | null = null
let mqCleanup: (() => void) | null = null
let themeEventBound = false

export function readBootstrapThemePreference(): ThemePreferenceValue | null {
  if (typeof document === 'undefined') {
    return null
  }
  const attr = document.getElementById('app')?.getAttribute('data-opsdash-theme-preference')
  if (attr === 'auto' || attr === 'light' || attr === 'dark') {
    return attr
  }
  return null
}

export function installThemeBootloader(): void {
  if (typeof window === 'undefined') {
    return
  }
  try {
    updateFavicon()
    bindThemeWatchers()
  } catch (error) {
    if (isDebug()) {
      console.warn('[opsdash] theme boot install failed', error)
    }
  }
}

export function teardownThemeBootloader(): void {
  try {
    faviconObserver?.disconnect()
    faviconObserver = null
    if (mqCleanup) {
      mqCleanup()
      mqCleanup = null
    }
    if (themeEventBound) {
      window.removeEventListener('oc:theme:changed', updateFavicon)
      themeEventBound = false
    }
  } catch (error) {
    if (isDebug()) {
      console.warn('[opsdash] theme boot teardown failed', error)
    }
  }
}

function bindThemeWatchers(): void {
  if (faviconObserver || mqCleanup || themeEventBound) {
    return
  }

  const targets: Element[] = []
  if (document.documentElement) targets.push(document.documentElement)
  if (document.body && document.body !== document.documentElement) targets.push(document.body)

  if (targets.length) {
    faviconObserver = new MutationObserver(() => updateFavicon())
    targets.forEach((target) => {
      faviconObserver?.observe(target, { attributes: true, attributeFilter: ['data-theme', 'class'] })
    })
  }

  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => updateFavicon()
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', handler)
      mqCleanup = () => mq.removeEventListener('change', handler)
    } else if (typeof mq.addListener === 'function') {
      // @ts-ignore legacy addListener
      mq.addListener(handler)
      mqCleanup = () => {
        // @ts-ignore legacy removeListener
        mq.removeListener(handler)
      }
    }
  }

  window.addEventListener('oc:theme:changed', updateFavicon)
  themeEventBound = true
}

export function updateFavicon(): void {
  const path = resolveFaviconPath()
  if (!path) return
  const rels = ['icon', 'shortcut icon']
  rels.forEach((rel) => {
    let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null
    if (!link) {
      link = document.createElement('link')
      link.rel = rel
      document.head.appendChild(link)
    }
    link.type = 'image/svg+xml'
    link.href = path
  })
}

export function resolveFaviconPath(): string {
  const preferDark = resolveCurrentTheme() === 'dark'
  const imagePath = createImagePathResolver()

  const direct = imagePath('favicon.svg')
  if (direct) return direct

  if (preferDark) {
    const dark = imagePath('app-dark.svg')
    if (dark) return dark
  }

  const baseIcon = preferDark ? imagePath('app-dark.svg') : imagePath('app.svg')
  if (baseIcon) return baseIcon

  return '/apps-extra/opsdash/img/favicon.svg'
}

export function resolveCurrentTheme(): 'dark' | 'light' {
  const themeAttr = document.documentElement?.getAttribute('data-theme')
  if (themeAttr === 'dark' || themeAttr === 'light') return themeAttr

  const bodyAttr = document.body?.getAttribute('data-theme')
  if (bodyAttr === 'dark' || bodyAttr === 'light') return bodyAttr

  if (document.body?.classList.contains('theme--dark')) return 'dark'
  if (document.body?.classList.contains('theme--light')) return 'light'

  const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
  return mq?.matches ? 'dark' : 'light'
}

function createImagePathResolver(): (name: string) => string {
  const w: any = window as any
  return (name: string) => (typeof w.OC?.imagePath === 'function') ? w.OC.imagePath('opsdash', name) : ''
}

function isDebug(): boolean {
  const w: any = window as any
  return Boolean(w?.OC?.debug || w?.__DEV__ || w?.__VUE_PROD_DEVTOOLS__)
}
