import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '@/app/providers'
import { appRoutes } from '@/app/router'
import {
  clearToken,
  fetchCurrentUser,
  writeToken,
  type SessionUser,
} from '@/lib/session'

vi.mock('@/lib/session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/session')>()
  return { ...actual, fetchCurrentUser: vi.fn() }
})

vi.mock('@/features/disruptions/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/disruptions/api')>()
  return { ...actual, getMyDisruptions: vi.fn().mockResolvedValue([]) }
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

function renderApp(path: string, user: SessionUser = path.startsWith('/admin') ? admin : passenger) {
  clearToken()
  vi.mocked(fetchCurrentUser).mockReset()
  writeToken('test-session-token')
  vi.mocked(fetchCurrentUser).mockResolvedValue(user)

  const router = createMemoryRouter(appRoutes, { initialEntries: [path] })
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return router
}

const passengerLinks = [
  'Dashboard',
  'My Journeys',
  'Train Search',
  'Train Status',
  'Disruptions',
  'Recovery Recommendations',
  'Hotels & Stay Recovery',
  'Notifications',
  'My Profile',
  'Settings',
]

const adminLinks = [
  'Admin Dashboard',
  'Passenger Management',
  'Journey Management',
  'Train Management',
  'Disruption Management',
  'Recovery Recommendations',
  'Hotel Management',
  'Notification Management',
  'User Roles & Access',
  'Reports & Analytics',
  'System Settings',
  'My Profile',
]

function navLinkLabels(nav: HTMLElement) {
  return within(nav)
    .getAllByRole('link')
    .map((link) => link.textContent?.trim())
}

beforeEach(() => {
  window.sessionStorage.clear()
})

describe('passenger layout', () => {
  it('renders every sidebar group, item and action in order', async () => {
    renderApp('/app/dashboard')

    const nav = await screen.findByRole('navigation', { name: 'Passenger navigation' })
    expect(within(nav).getByText('TRAVEL')).toBeInTheDocument()
    expect(within(nav).getByText('ASSISTANCE')).toBeInTheDocument()
    expect(within(nav).getByText('ACCOUNT')).toBeInTheDocument()
    expect(navLinkLabels(nav)).toEqual(passengerLinks)
    expect(within(nav).getByRole('button', { name: 'Sign Out' })).toBeInTheDocument()
  })

  it('marks the current route as active and leaves other items inactive', async () => {
    renderApp('/app/journeys')

    const nav = await screen.findByRole('navigation', { name: 'Passenger navigation' })
    const active = within(nav).getByRole('link', { name: 'My Journeys' })
    const inactive = within(nav).getByRole('link', { name: 'Dashboard' })

    expect(active).toHaveAttribute('data-active', 'true')
    expect(active).toHaveAttribute('aria-current', 'page')
    expect(active.className.split(' ')).toContain('bg-white/10')
    expect(inactive).toHaveAttribute('data-active', 'false')
    expect(inactive).not.toHaveAttribute('aria-current')
    expect(inactive.className.split(' ')).not.toContain('bg-white/10')
  })

  it('opens the navigation drawer on small screens and closes it after navigating', async () => {
    const user = userEvent.setup()
    renderApp('/app/dashboard')

    await screen.findByRole('navigation', { name: 'Passenger navigation' })
    await user.click(screen.getByRole('button', { name: 'Open navigation' }))

    const drawer = await screen.findByRole('dialog', { name: 'Navigation' })
    const drawerNav = within(drawer).getByRole('navigation', { name: 'Passenger navigation' })
    expect(navLinkLabels(drawerNav)).toEqual(passengerLinks)

    await user.click(within(drawerNav).getByRole('link', { name: 'Train Search' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Train Search' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Navigation' })).not.toBeInTheDocument()
  })

  it('shows a single page heading that differs from the sidebar label', async () => {
    renderApp('/app/dashboard')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Welcome back, Asha!' }),
    ).toBeVisible()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.queryByRole('heading', { name: 'Dashboard' })).not.toBeInTheDocument()
    expect(screen.getByText('No disruptions affecting your journeys.')).toBeInTheDocument()
  })
})

describe('admin layout', () => {
  it('renders every sidebar group, item and action in order', async () => {
    renderApp('/admin/dashboard')

    const nav = await screen.findByRole('navigation', { name: 'Admin navigation' })
    expect(within(nav).getByText('OPERATIONS')).toBeInTheDocument()
    expect(within(nav).getByText('ASSISTANCE')).toBeInTheDocument()
    expect(within(nav).getByText('ADMINISTRATION')).toBeInTheDocument()
    expect(within(nav).getByText('ACCOUNT')).toBeInTheDocument()
    expect(navLinkLabels(nav)).toEqual(adminLinks)
    expect(within(nav).getByRole('button', { name: 'Sign Out' })).toBeInTheDocument()
    expect(screen.getAllByText('Admin').length).toBeGreaterThan(0)
  })

  it('marks the current admin route as active', async () => {
    renderApp('/admin/disruptions')

    const nav = await screen.findByRole('navigation', { name: 'Admin navigation' })
    const active = within(nav).getByRole('link', { name: 'Disruption Management' })

    expect(active).toHaveAttribute('data-active', 'true')
    expect(active).toHaveAttribute('aria-current', 'page')
    expect(active.className.split(' ')).toContain('bg-white/10')
  })

  it('renders the administrator placeholder heading', async () => {
    renderApp('/admin/dashboard')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Operations overview' }),
    ).toBeVisible()
  })
})

describe('unknown routes', () => {
  it('renders the 404 page', async () => {
    renderApp('/this-route-does-not-exist')

    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '/auth')
  })
})
