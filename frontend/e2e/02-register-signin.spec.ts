import { test, expect } from '@playwright/test'

/**
 * Scenario 2 – Register and sign in
 * Requires the backend running on http://localhost:8080 with the demo profile.
 */
test.describe('auth flow', () => {
  const unique = `e2e.${Date.now()}@trainconcierge.demo`

  test('register creates a PASSENGER account', async ({ page }) => {
    await page.goto('/auth')
    // Switch to register tab / link
    await page.getByRole('link', { name: /create account|register/i }).click()
    await page.getByLabel(/full name/i).fill('E2E Tester')
    await page.getByLabel(/email/i).fill(unique)
    await page.getByLabel(/^password$/i).fill('Str0ng#Pass')
    await page.getByLabel(/confirm/i).fill('Str0ng#Pass')
    await page.getByRole('button', { name: /create|register/i }).click()
    // On success we land on the passenger dashboard
    await page.waitForURL('**/app/dashboard', { timeout: 10_000 })
    await expect(page).toHaveURL(/\/app\/dashboard/)
  })

  test('sign in with demo passenger lands on dashboard', async ({ page }) => {
    await page.goto('/auth')
    await page.getByLabel(/email/i).fill('asha.kulkarni@trainconcierge.demo')
    await page.getByLabel(/password/i).fill('Str0ng#Pass')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL('**/app/dashboard', { timeout: 10_000 })
    await expect(page).toHaveURL(/\/app\/dashboard/)
  })
})
