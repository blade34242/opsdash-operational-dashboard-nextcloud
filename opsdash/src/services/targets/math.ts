export const DAY_MS = 24 * 60 * 60 * 1000

export function clampNumber(value: any, min: number, max: number): number {
  const num = Number(value)
  if (!Number.isFinite(num)) return min
  return Math.min(max, Math.max(min, Math.round(num * 100) / 100))
}

export function clampInt(value: any, min: number, max: number): number {
  const num = Number(value)
  if (!Number.isFinite(num)) return min
  const rounded = Math.round(num)
  if (rounded < min) return min
  if (rounded > max) return max
  return rounded
}

export function round2(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Number(value.toFixed(2))
}

export function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(999, Number(value.toFixed(2))))
}

export function formatHours(value: number): string {
  if (!Number.isFinite(value)) return '0'
  const rounded = round2(Math.max(0, value))
  if (Math.abs(rounded - Math.round(rounded)) < 0.05) {
    return Math.round(rounded).toString()
  }
  return rounded.toFixed(1)
}
