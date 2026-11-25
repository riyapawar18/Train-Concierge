import { StrictMode } from 'react'
import { act, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SessionRoot } from '@/app/guards'
import { SplashScreen } from '@/features/splash/SplashScreen'
import {
  SPLASH_MAX_CHECK_MS,
  SPLASH_MIN_MS,
  __resetSplashGateForTests,
} from '@/features/splash/useSplashGate'
import {
  TOKEN_STORAGE_KEY,
  fetchCurrentUser,
  readToken,
  writeToken,
  type SessionUser,
} from '@/lib/session'

vi.mock('@/lib/session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/session')>()
  return { ...actual, fetchCurrentUser: vi.fn() }
})

const passenger: SessionUser = {
  id: 1,
  fullName: 'Asha Verma',
  email: 'asha@example.com',
  role: 'PASSENGER',
}

const admin: SessionUser = {
  id: 2,
  fullName: 'Ravi Shah',
  email: 'ravi@example.com',
  role: 'ADMIN',
}

const routes = [
  {
    element: <SessionRoot />,
    children: [
      { path: '/', element: <SplashScreen /> },
      { path: '/auth', element: <div>auth destination</div> },
      { path: '/app/dashboard', element: <div>passenger destination</div> },
      { path: '/admin/dashboard', element: <div>admin destination</div> },
    ],
  },
]

function renderApp({ strict = false }: { strict?: boolean } = {}) {
  const router = createMemoryRouter(routes, { initialEntries: ['/'] })
  const tree = <RouterProvider router={router} />
  render(strict ? <StrictMode>{tree}</StrictMode> : tree)
  return router
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  __resetSplashGateForTests()
  vi.mocked(fetchCurrentUser).mockReset()
  window.sessionStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('splash gate', () => {
  it('does not navigate at 3999 ms and routes anonymous visitors at 4000 ms', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(null)
    const router = renderApp()

    expect(screen.getByTestId('splash-screen')).toBeInTheDocument()

    await advance(SPLASH_MIN_MS - 1)

    expect(router.state.location.pathname).toBe('/')
    expect(screen.getByTestId('splash-screen')).toBeInTheDocument()
    expect(screen.queryByText('auth destination')).not.toBeInTheDocument()

    await advance(1)

    expect(router.state.location.pathname).toBe('/auth')
    expect(screen.getByText('auth destination')).toBeInTheDocument()
    expect(screen.queryByTestId('splash-screen')).not.toBeInTheDocument()
  })

  it('routes a valid passenger to the passenger dashboard', async () => {
    writeToken('valid-passenger-token')
    vi.mocked(fetchCurrentUser).mockResolvedValue(passenger)
    const router = renderApp()

    await advance(SPLASH_MIN_MS)

    expect(router.state.location.pathname).toBe('/app/dashboard')
    expect(screen.getByText('passenger destination')).toBeInTheDocument()
  })

  it('routes a valid admin to the admin dashboard', async () => {
    writeToken('valid-admin-token')
    vi.mocked(fetchCurrentUser).mockResolvedValue(admin)
    const router = renderApp()

    await advance(SPLASH_MIN_MS)

    expect(router.state.location.pathname).toBe('/admin/dashboard')
    expect(screen.getByText('admin destination')).toBeInTheDocument()
  })

  it('clears an invalid token and routes to auth', async () => {
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, 'invalid-phase01-token')
    vi.mocked(fetchCurrentUser).mockResolvedValue(null)
    const router = renderApp()

    expect(readToken()).not.toBeNull()

    await advance(SPLASH_MIN_MS)

    expect(router.state.location.pathname).toBe('/auth')
    expect(readToken()).toBeNull()
  })

  it('never holds the splash beyond seven seconds when the session check hangs', async () => {
    writeToken('slow-token')
    vi.mocked(fetchCurrentUser).mockReturnValue(new Promise<SessionUser | null>(() => {}))
    const router = renderApp()

    await advance(SPLASH_MAX_CHECK_MS - 1)

    expect(router.state.location.pathname).toBe('/')
    expect(screen.getByTestId('splash-screen')).toBeInTheDocument()

    await advance(1)

    expect(router.state.location.pathname).toBe('/auth')
    expect(screen.getByText('auth destination')).toBeInTheDocument()
  })

  it('exposes progress bar ARIA attributes and advances the value', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(null)
    renderApp()

    const bar = screen.getByRole('progressbar', { name: 'Checking your session' })
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
    expect(bar).toHaveAttribute('aria-valuenow', '0')

    await advance(2000)

    const value = Number(bar.getAttribute('aria-valuenow'))
    expect(value).toBeGreaterThan(0)
    expect(value).toBeLessThanOrEqual(100)
  })

  it('starts a single gate under StrictMode', async () => {
    writeToken('strict-token')
    vi.mocked(fetchCurrentUser).mockResolvedValue(passenger)
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    const router = renderApp({ strict: true })

    const delays = timeoutSpy.mock.calls.map((call) => call[1])
    expect(delays.filter((ms) => ms === SPLASH_MIN_MS)).toHaveLength(1)
    expect(delays.filter((ms) => ms === SPLASH_MAX_CHECK_MS)).toHaveLength(1)
    expect(vi.mocked(fetchCurrentUser)).toHaveBeenCalledTimes(1)

    await advance(SPLASH_MIN_MS - 1)
    expect(router.state.location.pathname).toBe('/')

    await advance(1)

    expect(router.state.location.pathname).toBe('/app/dashboard')
    expect(vi.mocked(fetchCurrentUser)).toHaveBeenCalledTimes(1)
  })

  it('does not replay the splash on later in-app route changes', async () => {
    writeToken('replay-token')
    vi.mocked(fetchCurrentUser).mockResolvedValue(passenger)
    const router = renderApp()

    await advance(SPLASH_MIN_MS)
    expect(router.state.location.pathname).toBe('/app/dashboard')

    await act(async () => {
      await router.navigate('/auth')
    })
    expect(router.state.location.pathname).toBe('/auth')

    await act(async () => {
      await router.navigate('/')
    })

    expect(router.state.location.pathname).toBe('/app/dashboard')
    expect(screen.queryByTestId('splash-screen')).not.toBeInTheDocument()
  })

  it('does not return to the splash when navigating back after the gate', async () => {
    writeToken('back-token')
    vi.mocked(fetchCurrentUser).mockResolvedValue(passenger)
    const router = renderApp()

    await advance(SPLASH_MIN_MS)
    expect(router.state.location.pathname).toBe('/app/dashboard')

    await act(async () => {
      await router.navigate(-1)
    })

    expect(router.state.location.pathname).toBe('/app/dashboard')
    expect(screen.queryByTestId('splash-screen')).not.toBeInTheDocument()
  })
})
