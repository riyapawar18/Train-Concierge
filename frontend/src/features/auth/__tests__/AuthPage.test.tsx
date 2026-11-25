import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '@/app/providers'
import { RequireAnonymous, SessionRoot } from '@/app/guards'
import { AuthLayout } from '@/layouts/AuthLayout'
import { AuthPage } from '@/features/auth/AuthPage'
import { login, register, type LoginResult } from '@/features/auth/api'
import { normalizeApiError } from '@/lib/apiClient'
import { readToken, type SessionUser } from '@/lib/session'

vi.mock('@/features/auth/api', () => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn().mockResolvedValue(undefined),
  requestPasswordReset: vi.fn().mockResolvedValue(undefined),
  resetPassword: vi.fn().mockResolvedValue(undefined),
}))

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
      {
        element: <RequireAnonymous />,
        children: [
          {
            path: '/auth',
            element: <AuthLayout />,
            children: [{ index: true, element: <AuthPage /> }],
          },
        ],
      },
      { path: '/app/dashboard', element: <div>passenger home</div> },
      { path: '/app/journeys', element: <div>journeys home</div> },
      { path: '/admin/dashboard', element: <div>admin home</div> },
    ],
  },
]

function loginResult(user: SessionUser, token = 'access-token'): LoginResult {
  return {
    accessToken: token,
    tokenType: 'Bearer',
    expiresInSeconds: 3600,
    user,
  }
}

function apiError(
  status: number,
  code: string,
  fieldErrors: { field: string; message: string }[] = [],
) {
  return normalizeApiError({
    response: {
      status,
      data: { status, code, message: 'server detail', fieldErrors },
    },
  })
}

function renderAuth(entry: string | { pathname: string; state: unknown }) {
  const router = createMemoryRouter(routes, { initialEntries: [entry] })
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return router
}

async function openRegisterTab() {
  const user = userEvent.setup()
  await user.click(screen.getByRole('tab', { name: 'Register' }))
  await screen.findByRole('heading', { name: 'Create your account' })
  return user
}

beforeEach(() => {
  window.sessionStorage.clear()
  vi.mocked(login).mockReset()
  vi.mocked(register).mockReset()
})

describe('auth page', () => {
  it('shows the sign-in form by default and links the register tab to the URL', async () => {
    const router = renderAuth('/auth')

    expect(screen.getByRole('heading', { name: 'Sign in to your journey' })).toBeVisible()
    expect(screen.getByRole('tab', { name: 'Sign In' })).toHaveAttribute('data-state', 'active')
    expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'email')
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')

    const forgot = screen.getByRole('link', { name: 'Forgot password?' })
    expect(forgot).toHaveAttribute('href', '/auth/forgot-password')

    await openRegisterTab()
    expect(router.state.location.search).toBe('?tab=register')
  })

  it('opens directly on the register tab when the URL asks for it', async () => {
    renderAuth('/auth?tab=register')

    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeVisible()
    expect(screen.getByRole('tab', { name: 'Register' })).toHaveAttribute('data-state', 'active')
    expect(screen.getByLabelText('Full name')).toBeVisible()
    expect(screen.getByLabelText('Mobile number (optional)')).toBeVisible()
    expect(
      screen.getByText("We'll email you about delays and seat availability."),
    ).toBeVisible()
  })

  it('validates the sign-in form before calling the API', async () => {
    const user = userEvent.setup()
    renderAuth('/auth')

    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(await screen.findByText('Enter your email address.')).toBeVisible()
    expect(screen.getByText('Enter your password.')).toBeVisible()
    expect(login).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(await screen.findByText('Enter a valid email address.')).toBeVisible()
    expect(login).not.toHaveBeenCalled()
  })

  it('shows a generic message for incorrect credentials', async () => {
    const user = userEvent.setup()
    vi.mocked(login).mockRejectedValue(apiError(401, 'INVALID_CREDENTIALS'))
    renderAuth('/auth')

    await user.type(screen.getByLabelText('Email'), 'asha@example.com')
    await user.type(screen.getByLabelText('Password'), 'WrongPass1!')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.')
    expect(readToken()).toBeNull()
  })

  it('shows a friendly message when the server throttles sign-in', async () => {
    const user = userEvent.setup()
    vi.mocked(login).mockRejectedValue(apiError(429, 'TOO_MANY_ATTEMPTS'))
    renderAuth('/auth')

    await user.type(screen.getByLabelText('Email'), 'asha@example.com')
    await user.type(screen.getByLabelText('Password'), 'WrongPass1!')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many attempts. Please wait a few minutes and try again.',
    )
  })

  it('shows a friendly message when the server cannot be reached', async () => {
    const user = userEvent.setup()
    vi.mocked(login).mockRejectedValue(normalizeApiError(new Error('Network Error')))
    renderAuth('/auth')

    await user.type(screen.getByLabelText('Email'), 'asha@example.com')
    await user.type(screen.getByLabelText('Password'), 'WrongPass1!')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not reach the server. Check your connection and try again.',
    )
  })

  it('shows a permission message when the request is forbidden', async () => {
    const user = userEvent.setup()
    vi.mocked(login).mockRejectedValue(apiError(403, 'FORBIDDEN'))
    renderAuth('/auth')

    await user.type(screen.getByLabelText('Email'), 'asha@example.com')
    await user.type(screen.getByLabelText('Password'), 'WrongPass1!')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You do not have permission to do that.',
    )
  })

  it('signs a passenger in and opens the dashboard', async () => {
    const user = userEvent.setup()
    vi.mocked(login).mockResolvedValue(loginResult(passenger))
    const router = renderAuth('/auth')

    await user.type(screen.getByLabelText('Email'), 'asha@example.com')
    await user.type(screen.getByLabelText('Password'), 'ValidPass1!')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(await screen.findByText('passenger home')).toBeVisible()
    expect(router.state.location.pathname).toBe('/app/dashboard')
    expect(readToken()).toBe('access-token')
    expect(login).toHaveBeenCalledWith({ email: 'asha@example.com', password: 'ValidPass1!' })
  })

  it('sends an administrator to the admin dashboard', async () => {
    const user = userEvent.setup()
    vi.mocked(login).mockResolvedValue(loginResult(admin, 'admin-token'))
    const router = renderAuth('/auth')

    await user.type(screen.getByLabelText('Email'), 'ravi@example.com')
    await user.type(screen.getByLabelText('Password'), 'ValidPass1!')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(await screen.findByText('admin home')).toBeVisible()
    expect(router.state.location.pathname).toBe('/admin/dashboard')
    expect(readToken()).toBe('admin-token')
  })

  it('returns to the remembered passenger route after signing in', async () => {
    const user = userEvent.setup()
    vi.mocked(login).mockResolvedValue(loginResult(passenger))
    const router = renderAuth({
      pathname: '/auth',
      state: { from: { pathname: '/app/journeys' } },
    })

    await user.type(screen.getByLabelText('Email'), 'asha@example.com')
    await user.type(screen.getByLabelText('Password'), 'ValidPass1!')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(await screen.findByText('journeys home')).toBeVisible()
    expect(router.state.location.pathname).toBe('/app/journeys')
  })

  it('ignores a remembered admin route for a passenger', async () => {
    const user = userEvent.setup()
    vi.mocked(login).mockResolvedValue(loginResult(passenger))
    const router = renderAuth({
      pathname: '/auth',
      state: { from: { pathname: '/admin/dashboard' } },
    })

    await user.type(screen.getByLabelText('Email'), 'asha@example.com')
    await user.type(screen.getByLabelText('Password'), 'ValidPass1!')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(await screen.findByText('passenger home')).toBeVisible()
    expect(router.state.location.pathname).toBe('/app/dashboard')
  })

  it('toggles password visibility', async () => {
    const user = userEvent.setup()
    renderAuth('/auth')

    const password = screen.getByLabelText('Password')
    expect(password).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(password).toHaveAttribute('type', 'text')

    await user.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(password).toHaveAttribute('type', 'password')
  })

  it('shows a session-expired message from the URL', async () => {
    renderAuth('/auth?reason=expired')

    expect(await screen.findByTestId('session-expired')).toHaveTextContent(
      'Your session has expired. Please sign in again to continue.',
    )
  })

  it('validates registration and rejects mismatched passwords', async () => {
    const user = userEvent.setup()
    renderAuth('/auth?tab=register')

    await user.type(screen.getByLabelText('Full name'), 'Asha Verma')
    await user.type(screen.getByLabelText('Email'), 'asha@example.com')
    await user.type(screen.getByLabelText('Password'), 'abc')
    await user.type(screen.getByLabelText('Confirm password'), 'different')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(
      await screen.findByText('Password must be at least 4 characters.'),
    ).toBeVisible()
    expect(screen.getByText('Passwords do not match.')).toBeVisible()
    expect(register).not.toHaveBeenCalled()
  })

  it('maps a duplicate email to the email field', async () => {
    const user = userEvent.setup()
    vi.mocked(register).mockRejectedValue(apiError(409, 'EMAIL_TAKEN'))
    renderAuth('/auth?tab=register')

    await user.type(screen.getByLabelText('Full name'), 'Asha Verma')
    await user.type(screen.getByLabelText('Email'), 'asha@example.com')
    await user.type(screen.getByLabelText('Password'), 'ValidPass1!')
    await user.type(screen.getByLabelText('Confirm password'), 'ValidPass1!')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('An account with this email already exists.')).toBeVisible()
    expect(readToken()).toBeNull()
  })

  it('creates the account, shows a success message and returns to sign in', async () => {
    const user = userEvent.setup()
    const created: SessionUser = { ...passenger, fullName: 'Asha Verma' }
    vi.mocked(register).mockResolvedValue(created)
    const router = renderAuth('/auth?tab=register')

    await user.type(screen.getByLabelText('Full name'), 'Asha Verma')
    await user.type(screen.getByLabelText('Email'), 'asha@example.com')
    await user.type(screen.getByLabelText('Mobile number (optional)'), '9876543210')
    await user.type(screen.getByLabelText('Password'), 'ValidPass1!')
    await user.type(screen.getByLabelText('Confirm password'), 'ValidPass1!')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Account created successfully')).toBeVisible()
    expect(screen.getByText('Please sign in to continue.')).toBeVisible()
    expect(await screen.findByRole('heading', { name: 'Sign in to your journey' })).toBeVisible()
    expect(screen.getByLabelText('Email')).toHaveValue('asha@example.com')
    expect(screen.getByLabelText('Password')).toHaveValue('')
    expect(router.state.location.pathname).toBe('/auth')
    expect(router.state.location.search).toBe('')
    expect(register).toHaveBeenCalledWith({
      fullName: 'Asha Verma',
      email: 'asha@example.com',
      mobile: '9876543210',
      password: 'ValidPass1!',
      confirmPassword: 'ValidPass1!',
    })
    expect(login).not.toHaveBeenCalled()
    expect(readToken()).toBeNull()
  })

  it('keeps the remembered route when switching tabs before signing in', async () => {
    const user = userEvent.setup()
    vi.mocked(login).mockResolvedValue(loginResult(passenger))
    const router = renderAuth({
      pathname: '/auth',
      state: { from: { pathname: '/app/journeys' } },
    })

    await openRegisterTab()
    await user.click(screen.getByRole('tab', { name: 'Sign In' }))
    await user.type(screen.getByLabelText('Email'), 'asha@example.com')
    await user.type(screen.getByLabelText('Password'), 'ValidPass1!')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(await screen.findByText('journeys home')).toBeVisible()
    expect(router.state.location.pathname).toBe('/app/journeys')
  })
})
