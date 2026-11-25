import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '@/app/providers'
import { AuthLayout } from '@/layouts/AuthLayout'
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage'
import { requestPasswordReset, resetPassword } from '@/features/auth/api'
import { normalizeApiError } from '@/lib/apiClient'

vi.mock('@/features/auth/api', () => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
}))

const routes = [
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      { index: true, element: <div>sign in</div> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
    ],
  },
]

function apiError(
  status: number,
  code: string,
  fieldErrors: { field: string; message: string }[] = [],
) {
  return normalizeApiError({
    response: { status, data: { status, code, message: 'server detail', fieldErrors } },
  })
}

function renderAt(entry: string) {
  const router = createMemoryRouter(routes, { initialEntries: [entry] })
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return router
}

beforeEach(() => {
  vi.mocked(requestPasswordReset).mockReset().mockResolvedValue(undefined)
  vi.mocked(resetPassword).mockReset().mockResolvedValue(undefined)
})

describe('forgot password page', () => {
  it('emails the account address and never shows a second recipient field', async () => {
    const user = userEvent.setup()
    renderAt('/auth/forgot-password')

    expect(screen.getByLabelText('Email')).toBeVisible()
    expect(screen.queryByLabelText(/notification email/i)).toBeNull()

    await user.type(screen.getByLabelText('Email'), 'asha@example.com')
    await user.click(screen.getByRole('button', { name: 'Email me a reset link' }))

    expect(await screen.findByTestId('reset-sent')).toHaveTextContent('asha@example.com')
    expect(requestPasswordReset).toHaveBeenCalledWith('asha@example.com')
  })

  it('validates the address before calling the API', async () => {
    const user = userEvent.setup()
    renderAt('/auth/forgot-password')

    await user.click(screen.getByRole('button', { name: 'Email me a reset link' }))

    expect(await screen.findByText('Enter your email address.')).toBeVisible()
    expect(requestPasswordReset).not.toHaveBeenCalled()
  })

  it('reports a failed send instead of a success message', async () => {
    const user = userEvent.setup()
    vi.mocked(requestPasswordReset).mockRejectedValue(apiError(502, 'MAIL_FAILED'))
    renderAt('/auth/forgot-password')

    await user.type(screen.getByLabelText('Email'), 'asha@example.com')
    await user.click(screen.getByRole('button', { name: 'Email me a reset link' }))

    expect(
      await screen.findByText('We could not send the email just now. Please try again in a moment.'),
    ).toBeVisible()
    expect(screen.queryByTestId('reset-sent')).toBeNull()
  })

  it('returns to sign in', async () => {
    const user = userEvent.setup()
    const router = renderAt('/auth/forgot-password')

    await user.click(screen.getByRole('link', { name: 'Back to sign in' }))

    expect(router.state.location.pathname).toBe('/auth')
  })
})

describe('reset password page', () => {
  it('asks for a new link when the URL carries no token', async () => {
    renderAt('/auth/reset-password')

    expect(await screen.findByTestId('reset-missing-token')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Request a new link' })).toHaveAttribute(
      'href',
      '/auth/forgot-password',
    )
    expect(resetPassword).not.toHaveBeenCalled()
  })

  it('sends the token from the link with the new password', async () => {
    const user = userEvent.setup()
    const router = renderAt('/auth/reset-password?token=abc123')

    await user.type(screen.getByLabelText('New password'), 'newpass')
    await user.type(screen.getByLabelText('Confirm new password'), 'newpass')
    await user.click(screen.getByRole('button', { name: 'Update password' }))

    expect(await screen.findByTestId('reset-done')).toBeVisible()
    expect(resetPassword).toHaveBeenCalledWith({
      token: 'abc123',
      password: 'newpass',
      confirmPassword: 'newpass',
    })

    await user.click(screen.getByRole('link', { name: 'Sign in' }))
    expect(router.state.location.pathname).toBe('/auth')
  })

  it('checks both fields before calling the API', async () => {
    const user = userEvent.setup()
    renderAt('/auth/reset-password?token=abc123')

    await user.type(screen.getByLabelText('New password'), 'abc')
    await user.type(screen.getByLabelText('Confirm new password'), 'different')
    await user.click(screen.getByRole('button', { name: 'Update password' }))

    expect(await screen.findByText('Password must be at least 4 characters.')).toBeVisible()
    expect(screen.getByText('Passwords do not match.')).toBeVisible()
    expect(resetPassword).not.toHaveBeenCalled()
  })

  it('surfaces a rejected link from the server', async () => {
    const user = userEvent.setup()
    vi.mocked(resetPassword).mockRejectedValue(
      apiError(400, 'VALIDATION_ERROR', [
        { field: 'token', message: 'This reset link has expired. Please request a new one.' },
      ]),
    )
    renderAt('/auth/reset-password?token=old')

    await user.type(screen.getByLabelText('New password'), 'newpass')
    await user.type(screen.getByLabelText('Confirm new password'), 'newpass')
    await user.click(screen.getByRole('button', { name: 'Update password' }))

    expect(
      await screen.findByText('This reset link has expired. Please request a new one.'),
    ).toBeVisible()
    expect(screen.queryByTestId('reset-done')).toBeNull()
  })
})
