import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { hexToRgb, rgbToHex, tint, invert, heatColor, ctxFor } from '../src/services/charts'

describe('chart color helpers', () => {
  it('converts hex to rgb and back', () => {
    const rgb = hexToRgb('#1f74f2')
    expect(rgb).toEqual({ r: 31, g: 116, b: 242 })
    expect(rgbToHex(rgb!.r, rgb!.g, rgb!.b)).toBe('#1f74f2')
  })

  it('handles invalid hex strings gracefully', () => {
    expect(hexToRgb('not-a-color')).toBeNull()
    expect(rgbToHex(-50, 999, 128)).toBe('#00ff80')
  })

  describe('tint', () => {
    const originalMatchMedia = window.matchMedia

    beforeEach(() => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: false })
    })

    afterEach(() => {
      window.matchMedia = originalMatchMedia
      vi.restoreAllMocks()
    })

    it('lightens colors in light mode', () => {
      const result = tint('#204060')
      expect(result).not.toBe('#204060')
    })

    it('brightens colors in dark mode', () => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: true })
      const result = tint('#204060')
      expect(result).not.toBe('#204060')
    })
  })

  it('inverts colors', () => {
    expect(invert('#000000')).toBe('#ffffff')
    expect(invert('#ffffff')).toBe('#000000')
  })

  it('produces heat gradient values', () => {
    expect(heatColor(0)).toMatch(/^rgb\(/)
    expect(heatColor(1)).toMatch(/^rgb\(/)
    expect(heatColor(2)).toMatch(/^rgb\(/)
  })
})

describe('ctxFor', () => {
  const originalGetContext = HTMLCanvasElement.prototype.getContext

  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      setTransform: vi.fn(),
    })
  })

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext
    vi.restoreAllMocks()
  })

  it('returns null when canvas is missing or too small', () => {
    expect(ctxFor(null)).toBeNull()

    const canvas = document.createElement('canvas')
    canvas.getBoundingClientRect = () => ({ width: 1, height: 1, top: 0, left: 0, right: 1, bottom: 1, x: 0, y: 0, toJSON: () => ({}) })
    expect(ctxFor(canvas)).toBeNull()
  })

  it('sets backing size and transform', () => {
    const canvas = document.createElement('canvas')
    canvas.getBoundingClientRect = () => ({ width: 200, height: 100, top: 0, left: 0, right: 200, bottom: 100, x: 0, y: 0, toJSON: () => ({}) })
    const ctx = ctxFor(canvas)

    expect(canvas.width).toBeGreaterThan(0)
    expect(canvas.height).toBeGreaterThan(0)
    expect(ctx).not.toBeNull()
  })
})

