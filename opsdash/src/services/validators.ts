export interface NumberConstraints {
  min?: number
  max?: number
  step?: number
  decimals?: number
  allowEmpty?: boolean
}

export interface NumberValidationResult {
  value: number | null
  warning?: string
  error?: string
}

export type ValidationSeverity = 'error' | 'warning'

export interface ValidationIssue {
  severity: ValidationSeverity
  message: string
}

export interface ValidationResult<T> {
  value: T | null
  issues: ValidationIssue[]
}

export function normalizeNumberInput(
  raw: unknown,
  constraints: NumberConstraints,
): NumberValidationResult {
  const { allowEmpty = false } = constraints

  if (raw === '' || raw === null || raw === undefined) {
    return allowEmpty ? { value: null } : { value: null, error: 'Enter a number' }
  }

  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) {
    return { value: null, error: 'Enter a valid number' }
  }

  let value = parsed
  let warning: string | undefined

  if (typeof constraints.min === 'number' && value < constraints.min) {
    value = constraints.min
    warning = buildClampWarning(constraints)
  }
  if (typeof constraints.max === 'number' && value > constraints.max) {
    value = constraints.max
    warning = buildClampWarning(constraints)
  }

  if (typeof constraints.step === 'number' && constraints.step > 0) {
    const stepped = roundToStep(value, constraints.step)
    if (stepped !== value) {
      value = stepped
      warning = buildClampWarning(constraints)
    }
  }

  const decimals = resolveDecimals(constraints)
  if (typeof decimals === 'number') {
    value = Number(value.toFixed(decimals))
  }

  return { value, warning }
}

export function validateNumberField(
  raw: unknown,
  constraints: NumberConstraints,
): ValidationResult<number> {
  const base = normalizeNumberInput(raw, constraints)
  const issues: ValidationIssue[] = []
  if (base.error) {
    issues.push({ severity: 'error', message: base.error })
  }
  if (base.warning) {
    issues.push({ severity: 'warning', message: base.warning })
  }
  return { value: base.value, issues }
}

export function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return ''
  }
  return Number(value).toFixed(decimals).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')
}

function roundToStep(value: number, step: number): number {
  const decimals = resolveDecimals({ step })
  const rounded = Math.round(value / step) * step
  return typeof decimals === 'number' ? Number(rounded.toFixed(decimals)) : rounded
}

function resolveDecimals(constraints: NumberConstraints): number | undefined {
  if (typeof constraints.decimals === 'number') {
    return constraints.decimals
  }
  if (typeof constraints.step === 'number') {
    return countDecimals(constraints.step)
  }
  return undefined
}

function countDecimals(value: number): number {
  const str = value.toString()
  if (str.includes('e-')) {
    const [, exponent] = str.split('e-')
    return Number(exponent)
  }
  const [, frac = ''] = str.split('.')
  return frac.length
}

function buildClampWarning(constraints: NumberConstraints): string {
  const parts: string[] = []
  if (typeof constraints.min === 'number' && typeof constraints.max === 'number') {
    parts.push(`Allowed range ${constraints.min} – ${constraints.max}`)
  } else if (typeof constraints.min === 'number') {
    parts.push(`Minimum ${constraints.min}`)
  } else if (typeof constraints.max === 'number') {
    parts.push(`Maximum ${constraints.max}`)
  }
  if (typeof constraints.step === 'number' && constraints.step > 0) {
    parts.push(`step ${constraints.step}`)
  }
  return `Adjusted to allowed value (${parts.join(', ')})`
}
