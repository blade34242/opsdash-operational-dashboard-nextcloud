import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useOcHttp } from '../composables/useOcHttp'

describe('useOcHttp', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    const w: any = window as any
    w.OC = {
      webroot: '/nc',
      requestToken: 'token123',
    }
  })

  it('builds preset routes with encoding', () => {
    const { route } = useOcHttp()
    const url = route('presetsLoad', 'foo/bar')
    expect(url).toBe('/nc/apps/opsdash/overview/presets/foo%2Fbar')
  })

  it('adds requesttoken to post/delete', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ ok: true }) })
      .mockResolvedValueOnce({ ok: true, text: vi.fn().mockResolvedValue('') })
    vi.stubGlobal('fetch', fetchMock)

    const { postJson, deleteJson } = useOcHttp()
    await postJson('/nc/apps/opsdash/overview/persist', { a: 1 })
    await deleteJson('/nc/apps/opsdash/overview/presets/demo')

    const postHeaders = (fetchMock.mock.calls[0][1] as any).headers
    const deleteHeaders = (fetchMock.mock.calls[1][1] as any).headers
    expect(postHeaders.requesttoken).toBe('token123')
    expect(deleteHeaders.requesttoken).toBe('token123')
  })
})
