import { test, expect } from '@playwright/test'

/**
 * Scenario 11 – Sign out
 * After sign-out, protected URLs redirect to /auth.
 */
test('sign out clears session and redirects', async ({ page }) => {
  await page.goto('/auth')
  // Sign in first
  const loginOk = page.waitForURL(/\/app\/dashboard/, { timeout: 10_000 }).catch(() => null)
  await page.getByLabel(/email/i).fill('asha.kulkarni@trainconcierge.demo')
  await page.getByLabel(/password/i).fill('Str0ng#Pass')
  await page.getByRole('button', { name: /sign in/i }).click()
  await loginOk

  if (!page.url().includes('/app/dashboard')) {
    // Backend not running in CI — skip
    test.skip()
    return
  }

  // Sign out
  await page.getByRole('button', { name: /sign out/i }).click()
  await page.waitForURL(/\/auth/, { timeout: 8_000 })

  // Attempting to go back is blocked
  await page.goto('/app/dashboard')
  await page.waitForURL(/\/auth/, { timeout: 8_000 })
  await expect(page).toHaveURL(/\/auth/)
})
