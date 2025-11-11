import { test, expect, Page } from '@playwright/test'
import { Buffer } from 'node:buffer'

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
