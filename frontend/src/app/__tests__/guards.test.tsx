import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders, queryClient } from '@/app/providers'
import { appRoutes } from '@/app/router'
import { logout } from '@/features/auth/api'
import {
  clearToken,
  fetchCurrentUser,
  readToken,
  writeToken,
  type SessionUser,
} from '@/lib/session'
import { registerSessionCleanup } from '@/lib/sessionCleanup'
import { clearSessionExpired, markSessionExpired } from '@/lib/tokenStorage'

vi.mock('@/lib/session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/session')>()
  return { ...actual, fetchCurrentUser: vi.fn() }
})

vi.mock('@/features/auth/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/auth/api')>()
  return { ...actual, logout: vi.fn().mockResolvedValue(undefined) }
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

function renderApp(path: string, user: SessionUser | null = null) {
  clearToken()
  vi.mocked(fetchCurrentUser).mockReset()

  if (user) {
    writeToken('test-session-token')
    vi.mocked(fetchCurrentUser).mockResolvedValue(user)
  } else {
    vi.mocked(fetchCurrentUser).mockResolvedValue(null)
  }

  const router = createMemoryRouter(appRoutes, { initialEntries: [path] })
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return router
}

function redirectedFrom(router: ReturnType<typeof renderApp>) {
  return router.state.location.state as { from?: { pathname?: string } } | null
}

beforeEach(() => {
  window.sessionStorage.clear()
  clearSessionExpired()
  vi.mocked(logout).mockReset()
  vi.mocked(logout).mockResolvedValue(undefined)
})

describe('route guards', () => {
  it('sends anonymous visitors to sign in and remembers the attempted URL', async () => {
    const router = renderApp('/app/dashboard')

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/auth')
    })
    expect(redirectedFrom(router)?.from?.pathname).toBe('/app/dashboard')
    expect(await screen.findByRole('heading', { name: 'Sign in to your journey' })).toBeVisible()
  })

  it('guards the admin area for anonymous visitors', async () => {
    const router = renderApp('/admin/dashboard')

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/auth')
    })
    expect(redirectedFrom(router)?.from?.pathname).toBe('/admin/dashboard')
  })

  it('adds the expired reason after a session expiry', async () => {
    markSessionExpired()
    const router = renderApp('/app/dashboard')

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/auth')
      expect(router.state.location.search).toBe('?reason=expired')
    })
    expect(await screen.findByTestId('session-expired')).toBeVisible()
  })

  it('shows access denied when a passenger opens an admin route', async () => {
    const router = renderApp('/admin/dashboard', passenger)

    expect(await screen.findByRole('heading', { name: 'Access denied' })).toBeVisible()
    expect(router.state.location.pathname).toBe('/admin/dashboard')
    expect(screen.queryByRole('navigation', { name: 'Admin navigation' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to dashboard' })).toHaveAttribute(
      'href',
      '/app/dashboard',
    )
  })

  it('sends an administrator from a passenger route to the admin dashboard', async () => {
    const router = renderApp('/app/dashboard', admin)

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/admin/dashboard')
    })
    expect(await screen.findByRole('heading', { name: 'Operations overview' })).toBeVisible()
  })

  it('keeps a passenger inside the passenger area', async () => {
    const router = renderApp('/app/journeys', passenger)

    expect(await screen.findByRole('heading', { name: 'My Journeys' })).toBeVisible()
    expect(router.state.location.pathname).toBe('/app/journeys')
    expect(screen.getByRole('navigation', { name: 'Passenger navigation' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Admin navigation' })).not.toBeInTheDocument()
  })

  it('redirects an authenticated passenger away from the sign-in page', async () => {
    const router = renderApp('/auth', passenger)

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/app/dashboard')
    })
    expect(await screen.findByRole('heading', { name: 'Welcome back, Asha!' })).toBeVisible()
  })

  it('redirects an authenticated administrator away from the sign-in page', async () => {
    const router = renderApp('/auth', admin)

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/admin/dashboard')
    })
    expect(await screen.findByRole('heading', { name: 'Operations overview' })).toBeVisible()
  })

  it('signs out from the sidebar, clears the session and returns to sign in', async () => {
    const user = userEvent.setup()
    const cleanup = vi.fn()
    const unregister = registerSessionCleanup(cleanup)
    const clearSpy = vi.spyOn(queryClient, 'clear')
    const router = renderApp('/app/dashboard', passenger)

    await screen.findByRole('heading', { name: 'Welcome back, Asha!' })
    await user.click(screen.getByRole('button', { name: 'Sign Out' }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/auth')
    })
    expect(await screen.findByRole('heading', { name: 'Sign in to your journey' })).toBeVisible()
    expect(readToken()).toBeNull()
    expect(logout).toHaveBeenCalledWith('test-session-token')
    expect(clearSpy).toHaveBeenCalled()
    expect(cleanup).toHaveBeenCalledTimes(1)

    unregister()
  })
})
