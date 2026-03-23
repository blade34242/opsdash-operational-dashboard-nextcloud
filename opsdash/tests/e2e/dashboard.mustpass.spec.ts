import { expect, test, type Page } from '@playwright/test'

async function dismissOnboardingIfVisible(page: Page) {
  const dialog = page.getByRole('dialog')
  const onboardingHeading = page.getByRole('heading', { name: 'Welcome to Opsdash' })
  if (await dialog.isVisible({ timeout: 1000 }).catch(() => false)) {
    const maybeLater = dialog.getByRole('button', { name: 'Maybe later' })
    if (await maybeLater.isVisible().catch(() => false)) {
      await maybeLater.click()
      await expect(onboardingHeading).toBeHidden({ timeout: 15000 })
    }
  }
}

test('must-pass: overview shell renders', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/index.php/apps/opsdash/overview`)
  await dismissOnboardingIfVisible(page)

  await expect(page.locator('.opsdash')).toBeVisible()
  await expect(page.getByRole('tablist', { name: 'Dashboard tabs' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Refresh' }).first()).toBeVisible()
})

test('must-pass: profiles overlay opens and closes', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/index.php/apps/opsdash/overview`)
  await dismissOnboardingIfVisible(page)

  await page.getByRole('button', { name: 'Profiles and backups' }).click()
  const profilesDialog = page.getByRole('dialog', { name: 'Profiles' })
  await expect(profilesDialog).toBeVisible()
  await profilesDialog.getByRole('button', { name: 'Close' }).click()
  await expect(profilesDialog).toBeHidden()
})

test('must-pass: keyboard shortcuts overlay opens and closes', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/index.php/apps/opsdash/overview`)
  await dismissOnboardingIfVisible(page)

  await page.getByRole('button', { name: 'Keyboard shortcuts' }).click()
  const shortcutsDialog = page.getByRole('dialog', { name: 'Keyboard Shortcuts' })
  await expect(shortcutsDialog.getByRole('heading', { name: 'Keyboard Shortcuts' })).toBeVisible()
  await shortcutsDialog.getByRole('button', { name: 'Close shortcuts overlay' }).click()
  await expect(shortcutsDialog).toBeHidden()
})
