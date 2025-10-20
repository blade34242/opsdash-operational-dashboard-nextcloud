import { validateNumberField, type NumberConstraints } from '../../services/validators'

export type InputMessage = { text: string; tone: 'error' | 'warning' }

export function validateWithFeedback(
  value: string | number,
  constraints: NumberConstraints,
  fallback = 'Enter a valid number',
) {
  const result = validateNumberField(value, constraints)
  const errorIssue = result.issues.find((issue) => issue.severity === 'error')
  const warningIssue = result.issues.find((issue) => issue.severity === 'warning')

  let message: InputMessage | null = null
  if (errorIssue || result.value === null) {
    message = { text: errorIssue?.message ?? fallback, tone: 'error' }
  } else if (warningIssue) {
    message = { text: warningIssue.message, tone: 'warning' }
  }

  return {
    ok: !errorIssue && result.value !== null,
    value: result.value,
    message,
  }
}

export function applyNumericUpdate(
  input: string,
  constraints: NumberConstraints,
  setMessage: (message: InputMessage | null) => void,
  onValid: (value: number) => void,
  fallback?: string,
) {
  const { ok, value, message } = validateWithFeedback(input, constraints, fallback)
  setMessage(message)
  if (!ok || value === null) {
    return false
  }
  onValid(value)
  return true
}
