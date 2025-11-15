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
  await page.getByRole('button', { name: /Refresh list/i }).click()

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

test('Activity day-off trend toggle hides chart', async ({ page, baseURL }) => {
  if (!baseURL) {
    test.skip()
    return
  }

  await page.goto(baseURL + '/index.php/apps/opsdash/overview')
  await dismissOnboardingIfVisible(page)

  const trendSection = page.locator('.activity-card__trend')
  await expect(trendSection).toBeVisible()

  await page.locator('#opsdash-sidebar-tab-activity').click()
  const trendToggle = page.getByLabel('Days off trend chart').first()
  await trendToggle.uncheck()
  await expect(trendSection).toBeHidden()

  await trendToggle.check()
  await expect(trendSection).toBeVisible()
})

test('Deck settings toggle hides main Deck tab', async ({ page, baseURL }) => {
  if (!baseURL) {
    test.skip()
    return
  }

  await page.goto(baseURL + '/index.php/apps/opsdash/overview')
  await dismissOnboardingIfVisible(page)

  const deckMainLink = page.locator('#opsdash .tabs').getByRole('link', { name: 'Deck' })
  if ((await deckMainLink.count()) === 0) {
    test.skip(true, 'Deck tab disabled for this user')
    return
  }

  const deckSidebarTab = page.locator('#opsdash-sidebar-tab-deck')
  if ((await deckSidebarTab.count()) === 0) {
    test.skip(true, 'Deck sidebar tab unavailable')
    return
  }

  await deckSidebarTab.click()
  const deckToggleSwitch = page.locator('#opsdash-sidebar-pane-deck .switch').first()
  const deckStateInput = page.locator('#opsdash-sidebar-pane-deck .report-card__header input[type="checkbox"]').first()
  const saveButton = page.locator('#opsdash-sidebar-pane-deck .report-save')

  try {
    await deckToggleSwitch.click()
    await saveButton.click()
    await expect(saveButton).toBeDisabled({ timeout: 15000 })
    await expect(deckMainLink).toHaveCount(0)

    await deckToggleSwitch.click()
    await saveButton.click()
    await expect(saveButton).toBeDisabled({ timeout: 15000 })
    await expect(page.locator('#opsdash .tabs').getByRole('link', { name: 'Deck' })).toBeVisible()
  } finally {
    await deckSidebarTab.click()
    if (!(await deckStateInput.isChecked())) {
      await deckToggleSwitch.click()
      await saveButton.click()
      await expect(saveButton).toBeDisabled({ timeout: 15000 })
    }
  }
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
    await page.getByRole('button', { name: 'Refresh' }).first().click()
    await page.getByRole('link', { name: 'Longest Tasks' }).click()
    await page.waitForTimeout(2000)
    await expect(page.getByText(seededSummary, { exact: false })).toBeVisible({ timeout: 15000 })
  } finally {
    await removeCalendarResource(page, resourceUrl)
  }
})

test('Deck tab surfaces seeded QA cards', async ({ page, baseURL }) => {
  if (!baseURL) {
    test.skip()
    return
  }

  const deckSeeded = await seedDeckData(page, baseURL)
  if (!deckSeeded) {
    test.skip(true, 'Deck API unavailable or seeding failed')
    return
  }

  await page.goto(baseURL + '/index.php/apps/opsdash/overview')
  await dismissOnboardingIfVisible(page)

  const deckLink = page.locator('#opsdash .tabs').getByRole('link', { name: 'Deck' })
  if ((await deckLink.count()) === 0) {
    test.skip(true, 'Deck tab disabled for this user')
  }
  await deckLink.first().click()
  const deckPanel = page.locator('.deck-card-list')
  const deckLoading = page.locator('.deck-panel__loading')
  await deckLoading.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
  await deckLoading.first().waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {})
  const hasDeckList = await deckPanel.count()
  if (!hasDeckList) {
    test.skip(true, 'Deck cards unavailable (Deck app disabled?)')
  }
  await expect(deckPanel).toBeVisible({ timeout: 15000 })
  const cardCount = await deckPanel.locator('.deck-card').count()
  if (cardCount === 0) {
    test.skip(true, 'Deck payload empty; Deck seed missing?')
  }
  await expect(page.locator('.deck-card__title', { hasText: 'Prep Opsdash Deck sync' })).toBeVisible()
  await expect(page.locator('.deck-card__title', { hasText: 'Publish Ops report cards' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible()
  await expect(page.getByText('Open Deck', { exact: false })).toBeVisible()

  await page.getByRole('button', { name: 'My cards' }).click()
  await expect(page.locator('.deck-card__title', { hasText: 'Archive completed Ops tasks' })).toBeHidden()
  await expect(page.locator('.deck-card__title', { hasText: 'Prep Opsdash Deck sync' })).toBeVisible()
  await page.getByRole('button', { name: 'All cards' }).click()
  await expect(page.locator('.deck-card__title', { hasText: 'Archive completed Ops tasks' })).toBeVisible()
})

async function seedDeckData(page: Page, baseURL: string): Promise<boolean> {
  const password = process.env.PLAYWRIGHT_PASS || 'admin'
  const authHeader = 'Basic ' + Buffer.from(`${PRIMARY_USER}:${password}`).toString('base64')
  const deckFetch = (path: string, init: Parameters<Page['request']['fetch']>[1] = {}) => {
    return page.request.fetch(`${baseURL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'OCS-APIREQUEST': 'true',
        Authorization: authHeader,
        ...(init.headers || {}),
      },
    })
  }
  try {
    const board = await ensureBoard(deckFetch)
    if (!board) return false
    const stacks = await ensureStacks(deckFetch, board.id)
    if (!stacks) return false
    await Promise.all([
      ensureCard(deckFetch, board.id, stacks.inbox, 'Prep Opsdash Deck sync', 1),
      ensureCard(deckFetch, board.id, stacks.progress, 'Publish Ops report cards', 3),
      ensureCard(deckFetch, board.id, stacks.done, 'Archive completed Ops tasks', -1, true),
    ])
    return true
  } catch (error) {
    console.warn('[deck seed failed]', error)
    return false
  }
}

async function ensureBoard(
  fetcher: (path: string, init?: Parameters<Page['request']['fetch']>[1]) => Promise<Response>,
) {
  const title = 'Opsdash Deck QA'
  const res = await fetcher('/ocs/v2.php/apps/deck/api/v1/boards')
  if (!res.ok) return null
  const payload = await res.json().catch(() => null)
  const boards = payload?.ocs?.data ?? []
  let board = boards.find((b: any) => b?.title === title)
  if (!board) {
    const create = await fetcher('/ocs/v2.php/apps/deck/api/v1/boards', {
      method: 'POST',
      data: { title, color: '#2563EB' },
    })
    if (!create.ok) return null
    const created = await create.json().catch(() => null)
    board = created?.ocs?.data ?? null
  }
  return board
}

async function ensureStacks(
  fetcher: (path: string, init?: Parameters<Page['request']['fetch']>[1]) => Promise<Response>,
  boardId: number,
) {
  const stackRes = await fetcher(`/ocs/v2.php/apps/deck/api/v1/boards/${boardId}/stacks`)
  if (!stackRes.ok) return null
  const stackPayload = await stackRes.json().catch(() => null)
  let stacks = stackPayload?.ocs?.data ?? []
  const getOrCreate = async (title: string, order: number) => {
    let stack = stacks.find((s: any) => s?.title === title)
    if (stack) return stack
    const create = await fetcher(`/ocs/v2.php/apps/deck/api/v1/boards/${boardId}/stacks`, {
      method: 'POST',
      data: { title, order },
    })
    if (!create.ok) return null
    const json = await create.json().catch(() => null)
    stack = json?.ocs?.data ?? null
    stacks = [...stacks, stack].filter(Boolean)
    return stack
  }
  const inbox = await getOrCreate('Inbox', 10)
  const progress = await getOrCreate('In Progress', 20)
  const done = await getOrCreate('Done', 30)
  if (!inbox || !progress || !done) return null
  return { inbox, progress, done }
}

async function ensureCard(
  fetcher: (path: string, init?: Parameters<Page['request']['fetch']>[1]) => Promise<Response>,
  boardId: number,
  stack: any,
  title: string,
  daysFromNow: number,
  archived = false,
) {
  const due = new Date()
  due.setDate(due.getDate() + daysFromNow)
  const create = await fetcher(
    `/ocs/v2.php/apps/deck/api/v1/boards/${boardId}/stacks/${stack.id}/cards`,
    {
      method: 'POST',
      data: {
        title,
        order: Date.now(),
        type: 'plain',
        duedate: Math.floor(due.getTime() / 1000),
        description: 'Seeded by Opsdash e2e',
      },
    },
  )
  if (!create.ok) return
  if (archived) {
    const cardJson = await create.json().catch(() => null)
    const cardId = cardJson?.ocs?.data?.id
    if (cardId) {
      await fetcher(`/ocs/v2.php/apps/deck/api/v1/cards/${cardId}/archive`, { method: 'POST' })
    }
  }
}
