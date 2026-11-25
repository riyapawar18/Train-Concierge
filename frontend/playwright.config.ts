import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  // Do NOT start the server automatically — tests require the app running separately.
  // Run with: npm run dev (frontend) + mvn spring-boot:run -Dspring-boot.run.profiles=demo (backend)
  webServer: undefined,
})
