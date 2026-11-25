import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET ?? 'http://localhost:8080',
        changeOrigin: true,
        // The browser treats /api as same-origin, but would still send its own Origin
        // header. Forwarding it makes Spring reject any port other than the configured
        // frontend origin, so drop it and let the backend apply CORS only to real
        // cross-origin calls.
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyRequest) => {
            proxyRequest.removeHeader('origin')
          })
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    restoreMocks: true,
    // Exclude Playwright E2E specs — those run via `npx playwright test`, not Vitest.
    exclude: ['e2e/**', '**/node_modules/**'],
    // Heavy interaction tests exceed the 5s default when workers share the CPU.
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
})
