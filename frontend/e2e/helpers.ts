import { type Page } from '@playwright/test'

export const ADMIN_EMAIL = 'admin@trainconcierge.demo'
export const ASHA_EMAIL = 'asha.kulkarni@trainconcierge.demo'
export const FATIMA_EMAIL = 'fatima.sheikh@trainconcierge.demo'
export const DEMO_PASSWORD = 'Str0ng#Pass'

export async function signIn(page: Page, email: string, password = DEMO_PASSWORD) {
  await page.goto('/auth')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
}

export async function signOut(page: Page) {
  await page.getByRole('button', { name: /sign out/i }).click()
}
