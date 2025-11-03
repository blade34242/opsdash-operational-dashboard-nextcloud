import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

import PieChart from '../src/components/PieChart.vue'
import StackedBars from '../src/components/StackedBars.vue'

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

  return {
    fills,
    rectFills,
    rects,
    strokeRects,
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
    fillText: vi.fn(),
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
