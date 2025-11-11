import { test, expect, Page, request as playwrightRequest } from '@playwright/test'
import { Buffer } from 'node:buffer'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

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
  expect(envelope.payload.cals.length).toBeGreaterThan(0)
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

  // ensure the second user exists (idempotent)
  await page.request.post(baseURL + '/index.php/ocs/v2.php/cloud/users', {
    headers: {
      Authorization: 'Basic ' + Buffer.from(`admin:admin`).toString('base64'),
      'OCS-APIREQUEST': 'true',
      'Content-Type': 'application/json',
    },
    data: { userid: SECOND_USER, password: SECOND_PASS, displayName: 'QA Opsdash' },
  }).catch(() => {})

  // log out (if needed) to avoid OC redirect loop
  await page.goto(baseURL + '/index.php/logout')
  await page.goto(baseURL + '/index.php/apps/opsdash/overview')
  await dismissOnboardingIfVisible(page)

  await page.evaluate(() => {
    const token = (window as any).OC?.requestToken || (window as any).oc_requesttoken || ''
    return fetch('/index.php/apps/opsdash/overview/persist', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', requesttoken: token },
      body: JSON.stringify({ selected: ['personal'] }),
    })
  })

  const secondaryContext = await playwrightRequest.newContext({
    baseURL,
    extraHTTPHeaders: {
      Authorization: 'Basic ' + Buffer.from(`${SECOND_USER}:${SECOND_PASS}`).toString('base64'),
      'OCS-APIREQUEST': 'true',
    },
  })

  const persistSecondary = await secondaryContext.post('/index.php/apps/opsdash/overview/persist', {
    data: { selected: ['opsdash-focus'] },
    headers: { 'Content-Type': 'application/json' },
  })
  if (!persistSecondary.ok()) {
    console.warn('secondary persist failed', await persistSecondary.text())
  }

  const loadPrimary = await page.request.get('/index.php/apps/opsdash/overview/load?range=week&offset=0')
  const primaryJson = await loadPrimary.json()
  const loadSecondary = await secondaryContext.get('/index.php/apps/opsdash/overview/load?range=week&offset=0')
  const secondaryJson = await loadSecondary.json()

  await secondaryContext.dispose()

  expect(primaryJson.selected).toContain('personal')
  expect(primaryJson.selected).not.toContain('opsdash-focus')
  expect(secondaryJson.selected).toContain('opsdash-focus')
})
