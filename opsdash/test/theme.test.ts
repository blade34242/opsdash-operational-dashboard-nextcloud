import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { resolveCurrentTheme, resolveFaviconPath, updateFavicon } from '../src/services/theme'

function resetDom() {
  document.documentElement.removeAttribute('data-theme')
  document.body.removeAttribute('data-theme')
  document.body.className = ''
  document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]').forEach((el) => el.remove())
}

describe('theme service', () => {
  beforeEach(() => {
    resetDom()
    ;(window as any).OC = undefined
    vi.restoreAllMocks()
  })

  afterEach(() => {
    resetDom()
    ;(window as any).OC = undefined
  })

  it('resolves current theme from data-theme attribute', () => {
    document.documentElement.setAttribute('data-theme', 'dark')
    expect(resolveCurrentTheme()).toBe('dark')

    document.documentElement.removeAttribute('data-theme')
    document.body.setAttribute('data-theme', 'light')
    expect(resolveCurrentTheme()).toBe('light')
  })

  it('falls back to theme classes and matchMedia preference', () => {
    document.body.classList.add('theme--dark')
    expect(resolveCurrentTheme()).toBe('dark')

    document.body.classList.remove('theme--dark')
    document.body.classList.add('theme--light')
    expect(resolveCurrentTheme()).toBe('light')
  })

  it('prefers favicon.svg when provided by Nextcloud imagePath', () => {
    ;(window as any).OC = {
      imagePath: vi.fn((_app: string, name: string) => (name === 'favicon.svg' ? '/nc/apps/opsdash/favicon.svg' : '')),
    }

    expect(resolveFaviconPath()).toBe('/nc/apps/opsdash/favicon.svg')
  })

  it('falls back to dark/light app icons based on theme', () => {
    document.documentElement.setAttribute('data-theme', 'dark')
    ;(window as any).OC = {
      imagePath: vi.fn((_app: string, name: string) => {
        if (name === 'app-dark.svg') return '/dark.svg'
        if (name === 'app.svg') return '/light.svg'
        return ''
      }),
    }

    expect(resolveFaviconPath()).toBe('/dark.svg')

    document.documentElement.setAttribute('data-theme', 'light')
    expect(resolveFaviconPath()).toBe('/light.svg')
  })

  it('creates favicon link elements when updating', () => {
    ;(window as any).OC = {
      imagePath: vi.fn((_app: string, name: string) => (name === 'favicon.svg' ? '/favicon.svg' : '')),
    }

    updateFavicon()

    const icon = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null
    const shortcut = document.querySelector('link[rel="shortcut icon"]') as HTMLLinkElement | null

    expect(icon).not.toBeNull()
    expect(shortcut).not.toBeNull()
    expect(icon?.href.endsWith('/favicon.svg')).toBe(true)
    expect(icon?.type).toBe('image/svg+xml')
    expect(shortcut?.href.endsWith('/favicon.svg')).toBe(true)
  })
})
