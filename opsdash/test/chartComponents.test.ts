import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

import PieChart from '../src/components/charts/PieChart.vue'
import StackedBars from '../src/components/charts/StackedBars.vue'
import ChartStackedWidget from '../src/components/widgets/charts/ChartStackedWidget.vue'

type StubContext = ReturnType<typeof createStubContext>

const contexts: StubContext[] = []

const originalClientWidth = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'clientWidth')
const originalClientHeight = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'clientHeight')

let getContextSpy: ReturnType<typeof vi.spyOn>
let getRectSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  contexts.length = 0

  getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () {
    const ctx = createStubContext()
    contexts.push(ctx)
    return ctx as unknown as CanvasRenderingContext2D
  })

  getRectSpy = vi
    .spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect')
    .mockReturnValue({ width: 260, height: 160, top: 0, left: 0, right: 260, bottom: 160, toJSON: () => ({}) })

  Object.defineProperty(HTMLCanvasElement.prototype, 'clientWidth', {
    configurable: true,
    get() {
      return 260
    },
  })

  Object.defineProperty(HTMLCanvasElement.prototype, 'clientHeight', {
    configurable: true,
    get() {
      return 160
    },
  })
})

afterEach(() => {
  getContextSpy.mockRestore()
  getRectSpy.mockRestore()

  if (originalClientWidth) {
    Object.defineProperty(HTMLCanvasElement.prototype, 'clientWidth', originalClientWidth)
  } else {
    delete (HTMLCanvasElement.prototype as any).clientWidth
  }

  if (originalClientHeight) {
    Object.defineProperty(HTMLCanvasElement.prototype, 'clientHeight', originalClientHeight)
  } else {
    delete (HTMLCanvasElement.prototype as any).clientHeight
  }
})

describe('PieChart', () => {
  it('uses colorsById overrides for slice fill', async () => {
    const wrapper = mount(PieChart, {
      props: {
        data: {
          data: [5],
          labels: ['Deep Work'],
          ids: ['cal-1'],
          colors: ['#60a5fa'],
        },
        colorsById: { 'cal-1': '#123abc' },
        colorsByName: {},
      },
    })

    await nextTick()

    const ctx = contexts.at(-1)
    expect(ctx?.fills).toContain('#123abc')

    wrapper.unmount()
  })
})

describe('StackedBars', () => {
  it('uses colorsById for stacked series bars', async () => {
    const wrapper = mount(StackedBars, {
      props: {
        stacked: {
          labels: ['2025-10-20', '2025-10-21'],
          series: [{ id: 'cal-1', data: [2, 3] }],
        },
        colorsById: { 'cal-1': '#ff8800' },
      },
    })

    await nextTick()

    const ctx = contexts.at(-1)
    expect(ctx?.rectFills).toContain('#ff8800')

    wrapper.unmount()
  })

  it('renders forecast overlay slimmer with lower opacity when mixed with actual data', async () => {
    const wrapper = mount(StackedBars, {
      props: {
        stacked: {
          labels: ['2025-10-20'],
          series: [
            {
              id: 'cal-1',
              data: [2],
              forecast: [3],
            },
          ],
        },
        colorsById: { 'cal-1': '#ff8800' },
      },
    })

    await nextTick()

    const ctx = contexts.at(-1)
    const actualRect = ctx?.rects.find((rect) => rect.fill === '#ff8800')
    const overlayRect = ctx?.rects.find((rect) => rect.fill.startsWith('rgb('))

    expect(actualRect).toBeDefined()
    expect(overlayRect).toBeDefined()
    expect(overlayRect!.width).toBeLessThan(actualRect!.width)
    expect(overlayRect!.x).toBeGreaterThan(actualRect!.x)
    expect(overlayRect!.alpha).toBeLessThan(0.2)

    wrapper.unmount()
  })

  it('dims non-highlighted series when highlightId is set', async () => {
    const wrapper = mount(StackedBars, {
      props: {
        stacked: {
          labels: ['2025-10-20'],
          series: [
            { id: 'cal-1', data: [2] },
            { id: 'cal-2', data: [3] },
          ],
        },
        colorsById: { 'cal-1': '#ff8800', 'cal-2': '#22cc88' },
        highlightId: 'cal-1',
      },
    })

    await nextTick()

    const ctx = contexts.at(-1)
    const highlightRects = ctx?.rects.filter((rect) => rect.fill === '#ff8800') ?? []
    const dimRects = ctx?.rects.filter((rect) => rect.fill === '#22cc88') ?? []

    expect(highlightRects.length).toBeGreaterThan(0)
    expect(dimRects.length).toBeGreaterThan(0)
    expect(highlightRects.every((rect) => rect.alpha === 1)).toBe(true)
    expect(dimRects.every((rect) => rect.alpha < 1)).toBe(true)

    wrapper.unmount()
  })

  it('dims non-hovered series when hovering a bar', async () => {
    const wrapper = mount(StackedBars, {
      props: {
        stacked: {
          labels: ['2025-10-20'],
          series: [
            { id: 'cal-1', data: [2] },
            { id: 'cal-2', data: [3] },
          ],
        },
        colorsById: { 'cal-1': '#ff8800', 'cal-2': '#22cc88' },
      },
    })

    await nextTick()

    const canvas = wrapper.find('canvas')
    await canvas.trigger('mousemove', { clientX: 100, clientY: 110 })

    const ctx = contexts.at(-1)
    const highlighted = ctx?.rects.filter((rect) => rect.fill === '#ff8800') ?? []
    const dimmed = ctx?.rects.filter((rect) => rect.fill === '#22cc88') ?? []

    expect(highlighted.length).toBeGreaterThan(0)
    expect(dimmed.length).toBeGreaterThan(0)
    expect(dimmed.some((rect) => rect.alpha < 1)).toBe(true)

    wrapper.unmount()
  })

  it('renders labels for small segments outside the bar', async () => {
    const wrapper = mount(StackedBars, {
      props: {
        stacked: {
          labels: ['2025-10-20'],
          series: [
            { id: 'cal-1', data: [0.1] },
            { id: 'cal-2', data: [10] },
          ],
        },
        colorsById: { 'cal-1': '#ff8800', 'cal-2': '#22cc88' },
        showLabels: true,
      },
    })

    await nextTick()

    const ctx = contexts.at(-1)
    expect(ctx?.texts.some((entry) => entry.text === '0.1')).toBe(true)

    wrapper.unmount()
  })
})

describe('ChartStackedWidget', () => {
  it('adds hovered class on legend hover', async () => {
    const wrapper = mount(ChartStackedWidget, {
      props: {
        showLegend: true,
        stacked: {
          labels: ['2025-10-20'],
          series: [
            { id: 'cal-1', name: 'Alpha', data: [2] },
            { id: 'cal-2', name: 'Beta', data: [1] },
          ],
        },
        colorsById: { 'cal-1': '#ff8800', 'cal-2': '#22cc88' },
      },
    })

    await nextTick()

    const items = wrapper.findAll('.chart-widget__legend li')
    expect(items.length).toBe(2)
    expect(items[0].classes()).not.toContain('hovered')
    await items[0].trigger('mouseenter')
    expect(items[0].classes()).toContain('hovered')
    await items[0].trigger('mouseleave')
    expect(items[0].classes()).not.toContain('hovered')

    wrapper.unmount()
  })
})

function createStubContext() {
  let fillStyle = '#000000'
  let strokeStyle = '#000000'
  let lineWidth = 1
  let globalAlpha = 1
  const stateStack: Array<{ fillStyle: string; strokeStyle: string; lineWidth: number; globalAlpha: number }> = []

  const fills: string[] = []
  const rectFills: string[] = []
  const rects: Array<{ x: number; y: number; width: number; height: number; fill: string; alpha: number }> = []
  const strokeRects: Array<{ x: number; y: number; width: number; height: number; stroke: string; alpha: number; lineWidth: number }> = []
  const texts: Array<{ text: string; x: number; y: number; fill: string; alpha: number }> = []

  return {
    fills,
    rectFills,
    rects,
    strokeRects,
    texts,
    set fillStyle(value: string) {
      fillStyle = value
    },
    get fillStyle(): string {
      return fillStyle
    },
    set strokeStyle(value: string) {
      strokeStyle = value
    },
    get strokeStyle(): string {
      return strokeStyle
    },
    set lineWidth(value: number) {
      lineWidth = value
    },
    get lineWidth(): number {
      return lineWidth
    },
    set globalAlpha(value: number) {
      globalAlpha = value
    },
    get globalAlpha(): number {
      return globalAlpha
    },
    textAlign: 'center' as CanvasTextAlign,
    textBaseline: 'middle' as CanvasTextBaseline,
    font: '12px sans-serif',
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(() => {
      fills.push(fillStyle)
    }),
    stroke: vi.fn(),
    save: vi.fn(() => {
      stateStack.push({ fillStyle, strokeStyle, lineWidth, globalAlpha })
    }),
    restore: vi.fn(() => {
      const state = stateStack.pop()
      if (state) {
        fillStyle = state.fillStyle
        strokeStyle = state.strokeStyle
        lineWidth = state.lineWidth
        globalAlpha = state.globalAlpha
      }
    }),
    fillText: vi.fn((text: string, x: number, y: number) => {
      texts.push({ text, x, y, fill: fillStyle, alpha: globalAlpha })
    }),
    strokeText: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 6 })),
    fillRect: vi.fn((x: number, y: number, width: number, height: number) => {
      rectFills.push(fillStyle)
      rects.push({ x, y, width, height, fill: fillStyle, alpha: globalAlpha })
    }),
    strokeRect: vi.fn((x: number, y: number, width: number, height: number) => {
      strokeRects.push({ x, y, width, height, stroke: strokeStyle, alpha: globalAlpha, lineWidth })
    }),
    setLineDash: vi.fn(),
  }
}
