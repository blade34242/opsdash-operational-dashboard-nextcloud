import { test, expect } from '@playwright/test'

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

  await page.getByRole('tab', { name: 'Config & Setup' }).click()
  await page.getByRole('button', { name: 'Re-run onboarding' }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Welcome to Opsdash' })).toBeVisible()

  const continueButton = dialog.getByRole('button', { name: 'Continue' })
  for (let i = 0; i < 5; i++) {
    if (!(await continueButton.isVisible())) {
      break
    }
    await continueButton.click()
  }

  await dialog.getByRole('button', { name: 'Start dashboard' }).click()
  await expect(dialog).toBeHidden()
})
