export function translate(_app: string, text: string, vars?: any): string {
  if (Array.isArray(vars)) {
    let output = text
    vars.forEach((value) => {
      output = output.replace('%s', String(value))
    })
    return output
  }

  if (vars && typeof vars === 'object') {
    let output = text
    Object.entries(vars).forEach(([key, value]) => {
      output = output.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value))
    })
    return output
  }

  if (typeof vars !== 'undefined') {
    return text.replace('%s', String(vars))
  }

  return text
}

export const t = translate

export function translatePlural(
  app: string,
  singular: string,
  plural: string,
  count: number,
  vars?: any,
): string {
  return translate(app, count === 1 ? singular : plural, vars)
}

export const n = translatePlural
