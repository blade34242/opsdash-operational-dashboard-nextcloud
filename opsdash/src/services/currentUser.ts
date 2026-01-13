export function readCurrentUserId(): string {
  const w: any = typeof window !== 'undefined' ? window : {}
  const oc = w.OC || {}
  try {
    const candidate =
      typeof oc.getCurrentUser === 'function'
        ? oc.getCurrentUser()
        : oc.currentUser
    if (typeof candidate === 'string') {
      return candidate
    }
    if (candidate && typeof candidate.uid === 'string') {
      return candidate.uid
    }
    if (candidate && typeof candidate.userId === 'string') {
      return candidate.userId
    }
  } catch (_) {
    // ignore and fall back to simple globals
  }
  const direct = oc.currentUser ?? oc.userId ?? w._oc_current_user ?? ''
  return typeof direct === 'string' ? direct : ''
}
