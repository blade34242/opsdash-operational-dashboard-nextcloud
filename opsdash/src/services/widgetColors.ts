export interface WidgetColorConfig {
  /**
   * Optional palette override (ordered list).
   */
  palette?: string[]
  /**
   * Explicit color mapping by id (e.g., category/calendar id).
   */
  byId?: Record<string, string>
  /**
   * Explicit color mapping by series key/name.
   */
  bySeries?: Record<string, string>
  /**
   * Optional card/chart background override.
   */
  background?: string | null
}

export interface ResolveColorsInput {
  options?: WidgetColorConfig | null
  defaults: {
    palette: string[]
    byId?: Record<string, string>
    bySeries?: Record<string, string>
    background?: string | null
  }
}

/**
 * Resolve widget colors by merging explicit mappings over palette defaults.
 */
export function resolveWidgetColors(input: ResolveColorsInput) {
  const opts = input.options || {}
  const palette = Array.isArray(opts.palette) && opts.palette.length ? opts.palette : input.defaults.palette
  const byId = { ...(input.defaults.byId || {}), ...(opts.byId || {}) }
  const bySeries = { ...(input.defaults.bySeries || {}), ...(opts.bySeries || {}) }
  const background = opts.background !== undefined ? opts.background : input.defaults.background ?? null

  return {
    palette,
    byId,
    bySeries,
    background,
  }
}
