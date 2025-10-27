import { translate, translatePlural } from '@nextcloud/l10n'

const APP_ID = 'opsdash'

export function t(key: string, parameters?: Record<string, unknown> | Array<unknown> | string | number | boolean | null) {
  return translate(APP_ID, key, parameters as any)
}

export function n(
  singular: string,
  plural: string,
  count: number,
  parameters?: Record<string, unknown> | Array<unknown> | string | number | boolean | null,
) {
  return translatePlural(APP_ID, singular, plural, count, parameters as any)
}
