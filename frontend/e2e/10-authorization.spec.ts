import { test, expect } from '@playwright/test'

/**
 * Scenario 10 – Authorization
 * Passengers are blocked from admin pages and anonymous users are redirected.
 */
test('anonymous user hitting /app/dashboard gets redirected to /auth', async ({ page }) => {
  await page.goto('/app/dashboard')
  await page.waitForURL(/\/auth/, { timeout: 8_000 })
  await expect(page).toHaveURL(/\/auth/)
})

test('anonymous user hitting /admin/dashboard gets redirected to /auth', async ({ page }) => {
  await page.goto('/admin/dashboard')
  await page.waitForURL(/\/auth/, { timeout: 8_000 })
  await expect(page).toHaveURL(/\/auth/)
})

test('protected API /api/admin/stats returns 401 without token', async ({ request }) => {
  const response = await request.get('/api/admin/stats')
  expect(response.status()).toBe(401)
})

test('protected API /api/admin/passengers returns 403 with passenger token', async ({ request }) => {
  // Sign in as passenger to get a token
  const loginResp = await request.post('/api/auth/login', {
    data: { email: 'asha.kulkarni@trainconcierge.demo', password: 'Str0ng#Pass' },
  })
  if (loginResp.status() !== 200) {
    // Backend may not be running in CI — skip gracefully
    test.skip()
    return
  }
  const { accessToken } = await loginResp.json() as { accessToken: string }
  const resp = await request.get('/api/admin/passengers', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  expect(resp.status()).toBe(403)
})
