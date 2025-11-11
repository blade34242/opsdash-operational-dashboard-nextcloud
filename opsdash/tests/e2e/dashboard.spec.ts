import { test, expect, Page, request as playwrightRequest } from '@playwright/test'
import { Buffer } from 'node:buffer'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const PRIMARY_USER = process.env.PLAYWRIGHT_USER || 'admin'
const SECOND_USER = process.env.PLAYWRIGHT_SECOND_USER
const SECOND_PASS = process.env.PLAYWRIGHT_SECOND_PASS

async function seedCalendarEvent(page: Page, baseURL: string, summary: string, durationHours = 2) {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 9, 0, 0))
  const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000)
  const format = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const dtstamp = format(now)
  const dtstart = format(start)
  const dtend = format(end)
  const uid = `opsdash-e2e-${Date.now()}@local`
  const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Opsdash//Integration Test//EN\nBEGIN:VEVENT\nUID:${uid}\nDTSTAMP:${dtstamp}\nDTSTART:${dtstart}\nDTEND:${dtend}\nSUMMARY:${summary}\nEND:VEVENT\nEND:VCALENDAR\n`
  const url = `${baseURL}/remote.php/dav/calendars/admin/personal/${encodeURIComponent(uid)}.ics`
  await page.request.put(url, {
    data: ics,
    headers: { 'Content-Type': 'text/calendar' },
  })
  return url
}

async function removeCalendarResource(page: Page, resourceUrl: string) {
  try {
    await page.request.delete(resourceUrl)
  } catch {
    // ignore cleanup errors
  }
}

async function dismissOnboardingIfVisible(page: Page) {
  const dialog = page.getByRole('dialog')
  if (await dialog.isVisible({ timeout: 1000 }).catch(() => false)) {
    const maybeLater = dialog.getByRole('button', { name: 'Maybe later' })
    if (await maybeLater.isVisible().catch(() => false)) {
      await maybeLater.click()
      await expect(dialog).toBeHidden()
    }
  }
}

async function loginUser(page: Page, baseURL: string, username: string, password: string) {
  await page.goto(baseURL + '/index.php/logout').catch(() => {})
  await page.goto(baseURL + '/index.php/login?clear=1')
  const userInput = page.locator('input#user')
  const passwordInput = page.locator('input#password')
  const ensureAttached = async () => {
    try {
      await page.waitForSelector('input#user', { state: 'attached', timeout: 15000 })
      await page.waitForSelector('input#password', { state: 'attached', timeout: 15000 })
      return true
    } catch {
      await page.waitForLoadState('domcontentloaded').catch(() => {})
      await page.reload().catch(() => {})
      try {
        await page.waitForSelector('input#user', { state: 'attached', timeout: 10000 })
        await page.waitForSelector('input#password', { state: 'attached', timeout: 10000 })
        return true
      } catch {
        return false
      }
    }
  }
  if (!(await ensureAttached())) {
    throw new Error('Login form did not become available')
  }
  const visible = await userInput.isVisible({ timeout: 2000 }).catch(() => false)
  if (visible) {
    await userInput.fill(username)
    await passwordInput.fill(password)
  } else {
    const filled = await page.evaluate(([u, p]) => {
      const userEl = document.querySelector<HTMLInputElement>('input#user')
      const passEl = document.querySelector<HTMLInputElement>('input#password')
      if (!userEl || !passEl) {
        return false
      }
      userEl.value = u
      passEl.value = p
      return true
    }, [username, password])
    if (!filled) {
      throw new Error('Login inputs not found in DOM')
    }
  }
  await Promise.all([
    page.waitForNavigation({ url: /index.php\/(apps|login)/ }),
    page.click('button[type="submit"]'),
  ])
}

async function createApiContext(baseURL: string, username: string, password: string) {
  const ctx = await playwrightRequest.newContext({
    baseURL,
    extraHTTPHeaders: {
      'User-Agent': 'opsdash-playwright',
    },
  })
  const loginResponse = await ctx.get('/index.php/login?clear=1')
  const loginHtml = await loginResponse.text()
  const requestTokenMatch =
    loginHtml.match(/name="requesttoken" value="([^"]+)"/) ||
    loginHtml.match(/data-requesttoken="([^"]+)"/)
  if (!requestTokenMatch) {
    await ctx.dispose()
    throw new Error('Unable to extract requesttoken for API login')
  }
  const requestToken = requestTokenMatch[1]
  const form = new URLSearchParams()
  form.set('user', username)
  form.set('password', password)
  form.set('timezone', 'UTC')
  form.set('timezone_offset', '0')
  form.set('remember_login', '1')
  form.set('requesttoken', requestToken)

  await ctx.post('/index.php/login', {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    data: form.toString(),
  })

  return ctx
}

async function persistSelectionViaApi(baseURL: string, username: string, password: string, calendars: string[]) {
  const ctx = await createApiContext(baseURL, username, password)
  try {
    let requestToken = ''
    try {
      const csrfResponse = await ctx.get('/index.php/csrftoken')
      if (csrfResponse.ok()) {
        const json = await csrfResponse.json()
        if (typeof json?.token === 'string') {
          requestToken = json.token
        }
      }
    } catch {}
    if (!requestToken) {
      const overviewResponse = await ctx.get('/index.php/apps/opsdash/overview')
      const overviewHtml = await overviewResponse.text()
      const rtMatch =
        overviewHtml.match(/data-requesttoken="([^"]+)"/) ||
        overviewHtml.match(/name="requesttoken" value="([^"]+)"/)
      if (!rtMatch) {
        throw new Error('Unable to extract requesttoken from overview page')
      }
      requestToken = rtMatch[1]
    }
    await ctx.post('/index.php/apps/opsdash/overview/persist', {
      headers: {
        'Content-Type': 'application/json',
        requesttoken: requestToken,
      },
      data: JSON.stringify({ cals: calendars }),
    })
    return ctx
  } catch (error) {
    await ctx.dispose()
    throw error
  }
}

async function persistSelection(page: Page, calendars: string[]) {
  await page.evaluate(async (selected) => {
    const token = (window as any).OC?.requestToken || (window as any).oc_requesttoken || ''
    await fetch('/index.php/apps/opsdash/overview/persist', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { requesttoken: token } : {}),
      },
      body: JSON.stringify({ cals: selected }),
    })
  }, calendars)
}

async function expectCalDavColor(page: Page, baseURL: string, calendar = 'personal') {
  const root = baseURL.replace(/\/$/, '')
  const body =
    '<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:ical="http://apple.com/ns/ical/"><d:prop><ical:calendar-color/></d:prop></d:propfind>'
  const response = await page.request.fetch(
    `${root}/remote.php/dav/calendars/${PRIMARY_USER}/${encodeURIComponent(calendar)}/`,
    {
      method: 'PROPFIND',
      headers: {
        Depth: '0',
        'Content-Type': 'application/xml',
      },
      body,
    },
  )
  expect(response.status(), 'CalDAV response should be successful').toBeLessThan(400)
  const text = await response.text()
  expect(text).toMatch(/calendar-color/i)
}

test('Operational Dashboard loads without console errors', async ({ page, baseURL }) => {
  if (!baseURL) {
    test.skip()
    return
  }

  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text())
    }
  })

  await page.goto(baseURL + '/index.php/apps/opsdash/overview')
  await expect(page.locator('#app')).toBeVisible()
  // App bar title is unique and confirms the Vue shell rendered
  await expect(page.locator('#opsdash .appbar .title')).toContainText('Operational Dashboard')

  // ensure no opsdash Vue errors surfaced
  const hasOpsdashError = consoleErrors.some(line => line.includes('[opsdash] Vue error'))
  expect(hasOpsdashError, `Console errors encountered: ${consoleErrors.join('\n')}`).toBeFalsy()
})

test('CalDAV calendar exposes color metadata', async ({ page, baseURL }) => {
  if (!baseURL) {
    test.skip()
    return
  }

  await page.goto(baseURL + '/index.php/apps/opsdash/overview')
  await dismissOnboardingIfVisible(page)
  await expect(page.locator('#app')).toBeVisible()

  await expectCalDavColor(page, baseURL)
})

test('Onboarding wizard can be re-run from Config & Setup', async ({ page, baseURL }) => {
  if (!baseURL) {
    test.skip()
    return
  }

  await page.goto(baseURL + '/index.php/apps/opsdash/overview')
  await dismissOnboardingIfVisible(page)

  await page.getByRole('tab', { name: 'Config & Setup' }).click()
  await page.getByRole('button', { name: 'Re-run onboarding' }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Welcome to Opsdash' })).toBeVisible()

  await dialog.getByRole('button', { name: 'Maybe later' }).click()
  await expect(dialog).toBeHidden()
})

test('Config preset can be saved via UI', async ({ page, baseURL }) => {
  if (!baseURL) {
    test.skip()
    return
  }

  const presetName = `E2E Preset ${Date.now()}`

  await page.goto(baseURL + '/index.php/apps/opsdash/overview')
  await dismissOnboardingIfVisible(page)
  await page.getByRole('tab', { name: 'Config & Setup' }).click()

  await page.getByLabel('Profile name').fill(presetName)
  await page.getByRole('button', { name: 'Save current configuration' }).click()

  const presetNameLocator = page.locator('.preset-name', { hasText: presetName })
  await expect(presetNameLocator).toBeVisible({ timeout: 15000 })

  await page.evaluate(async (name) => {
    const token = (window as any).OC?.requestToken || (window as any).oc_requesttoken || ''
    await fetch(`/index.php/apps/opsdash/overview/presets/${encodeURIComponent(name)}`, {
      method: 'DELETE',
      credentials: 'same-origin',
      headers: token ? { requesttoken: token } : {},
    })
  }, presetName)
})

test('Config import applies theme preference', async ({ page, baseURL }) => {
  if (!baseURL) {
    test.skip()
    return
  }

  const importEnvelope = {
    version: 1,
    generated: new Date().toISOString(),
    payload: {
      cals: ['personal'],
      groups: { personal: 0 },
      targets_week: { personal: 12 },
      targets_month: { personal: 48 },
      targets_config: {
        totalHours: 12,
        categories: [],
        pace: { includeWeekendTotal: true, mode: 'days_only', thresholds: { onTrack: -2, atRisk: -10 } },
        forecast: { methodPrimary: 'linear', momentumLastNDays: 2, padding: 1.5 },
        ui: { showTotalDelta: true, showNeedPerDay: true, showCategoryBlocks: true },
        allDayHours: 8,
        timeSummary: {},
        activityCard: { showWeekendShare: true },
        balance: { categories: [], useCategoryMapping: true, thresholds: { noticeMaxShare: 0.65, warnMaxShare: 0.75, warnIndex: 0.6 }, relations: { displayMode: 'ratio' }, trend: { lookbackWeeks: 1 }, dayparts: { enabled: false }, ui: { roundPercent: 1, roundRatio: 1, showDailyStacks: false, showInsights: true } },
      },
      theme_preference: 'light',
      onboarding: { completed: true, version: 1, strategy: 'total_only' },
    },
  }

  await page.goto(baseURL + '/index.php/apps/opsdash/overview')
  await dismissOnboardingIfVisible(page)
  await page.getByRole('tab', { name: 'Config & Setup' }).click()

  const fileInput = page.locator('input[type="file"][accept="application/json"]')
  await fileInput.setInputFiles({ name: 'opsdash-config.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(importEnvelope)) })

  await expect(page.getByLabel('Force light')).toBeChecked({ timeout: 10000 })
})

test('Config export downloads current envelope', async ({ page, baseURL }) => {
  if (!baseURL) {
    test.skip()
    return
  }

  await page.goto(baseURL + '/index.php/apps/opsdash/overview')
  await dismissOnboardingIfVisible(page)
  await page.getByRole('tab', { name: 'Config & Setup' }).click()

  const tempFile = path.join(os.tmpdir(), `opsdash-export-${Date.now()}.json`)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export configuration' }).click(),
  ])

  await download.saveAs(tempFile)
  const raw = await fs.readFile(tempFile, 'utf-8')
  await fs.unlink(tempFile)

  const envelope = JSON.parse(raw)
  expect(envelope).toHaveProperty('payload')
  expect(Array.isArray(envelope.payload?.cals)).toBe(true)
  expect(Array.isArray(envelope.payload.cals)).toBe(true)
  expect(envelope.payload).toHaveProperty('targets_config')
})

test('Dashboard reflects seeded calendar events', async ({ page, baseURL }) => {
  if (!baseURL) {
    test.skip()
    return
  }

  const seededSummary = `E2E Focus Block ${Date.now()}`
  const resourceUrl = await seedCalendarEvent(page, baseURL, seededSummary)

  try {
    await page.goto(baseURL + '/index.php/apps/opsdash/overview')
    await dismissOnboardingIfVisible(page)
    await page.getByRole('link', { name: 'Longest Tasks' }).click()
    await expect(page.getByText(seededSummary, { exact: false })).toBeVisible({ timeout: 15000 })
  } finally {
    await removeCalendarResource(page, resourceUrl)
  }
})

test('Separate users keep independent selections', async ({ page, baseURL }) => {
  if (!baseURL || !SECOND_USER || !SECOND_PASS) {
    test.skip()
    return
  }

  await page.goto(baseURL + '/index.php/logout')
  await page.goto(baseURL + '/index.php/apps/opsdash/overview')
  await dismissOnboardingIfVisible(page)

  await persistSelection(page, ['personal'])

  const loadPrimary = await page.request.get('/index.php/apps/opsdash/overview/load?range=week&offset=0')
  const primaryJson = await loadPrimary.json()

  const qaApiContext = await persistSelectionViaApi(baseURL, SECOND_USER, SECOND_PASS, ['opsdash-focus'])
  const loadSecondary = await qaApiContext.get('/index.php/apps/opsdash/overview/load?range=week&offset=0')
  const secondaryJson = await loadSecondary.json()
  await qaApiContext.dispose()

  expect(primaryJson.selected).toContain('personal')
  expect(primaryJson.selected).not.toContain('opsdash-focus')
  expect(secondaryJson.selected).toContain('opsdash-focus')
})
