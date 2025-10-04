export function clampTarget(h: number): number {
  if (!Number.isFinite(h) || h < 0) return 0
  return Math.min(10000, Math.round(h * 100) / 100)
}

export function convertWeekToMonth(weekHours: number): number {
  return clampTarget(weekHours * 4)
}

export function convertMonthToWeek(monthHours: number): number {
  return clampTarget(monthHours / 4)
}

export function progressPercent(hours: number, target: number): number {
  if (!Number.isFinite(hours) || !Number.isFinite(target) || target <= 0) return 0
  const p = (hours / target) * 100
  return Math.max(0, Math.min(100, p))
}

