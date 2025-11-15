export function translate(key: string, placeholders?: Record<string, string | number>): string {
  if (typeof window !== 'undefined') {
    const w: any = window
    try {
      if (typeof w?.t === 'function') {
        return w.t('opsdash', key, placeholders || {})
      }
      if (typeof w?.OC?.L10N?.translate === 'function') {
        return w.OC.L10N.translate('opsdash', key, placeholders || {})
      }
    } catch (error) {
      if ((w as any)?.console) {
        console.warn('[opsdash] translate failed', error)
      }
    }
  }
  let text = key
  if (placeholders) {
    Object.entries(placeholders).forEach(([name, value]) => {
      text = text.replace(new RegExp(`{${name}}`, 'g'), String(value))
    })
  }
  return text
}

export const t = translate
