type TelemetryPayload = Record<string, unknown>

function isDebug(): boolean {
  if (typeof window === 'undefined') return false
  const w: any = window
  return Boolean(w?.OC?.debug || w?.__DEV__ || w?.__VUE_PROD_DEVTOOLS__)
}

export function trackTelemetry(event: string, payload: TelemetryPayload = {}): void {
  if (typeof window === 'undefined') return
  const w: any = window
  try {
    if (w?.OCA?.Analytics?.trackEvent) {
      w.OCA.Analytics.trackEvent('opsdash', event, payload)
      return
    }
    if (w?.OCA?.Analytics?.track) {
      w.OCA.Analytics.track('opsdash', event, payload)
      return
    }
    if (w?.OC?.eventBus?.emit) {
      w.OC.eventBus.emit('opsdash:telemetry', { app: 'opsdash', event, payload })
      return
    }
  } catch (error) {
    if (isDebug()) {
      console.warn('[opsdash] telemetry emit failed', event, error)
    }
    return
  }

  if (isDebug()) {
    console.debug('[opsdash] telemetry (noop)', event, payload)
  }
}
