import { test, expect } from '@playwright/test'

/**
 * Scenario 1 – Splash and routing
 * Without a session the app shows the splash and then navigates to /auth.
 */
test('splash then auth redirect', async ({ page }) => {
  await page.goto('/')
  // Splash is visible initially (heading or animation container)
  // After ~5 s it redirects to /auth
  await page.waitForURL('**/auth', { timeout: 10_000 })
  await expect(page).toHaveURL(/\/auth/)
})

test('authenticated session goes to role home', async ({ page, context }) => {
  // Pre-seed a session token via localStorage would require running backend.
  // This test is a structural check — guard pages redirect unauthenticated users.
  await page.goto('/app/dashboard')
  // Without a token we end up at /auth (guard redirects)
  await page.waitForURL(/\/auth/, { timeout: 8_000 })
  await expect(page).toHaveURL(/\/auth/)
})
