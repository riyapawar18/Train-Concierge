import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders, queryClient } from '@/app/providers'
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/features/notifications/api'
import type { NotificationPreferences } from '@/features/notifications/types'
import { SettingsPage } from '../pages/SettingsPage'

vi.mock('@/features/notifications/api', () => ({
  getNotifications: vi.fn(),
  getUnreadCount: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  markNotificationRead: vi.fn(),
  getNotificationPreferences: vi.fn(),
  updateNotificationPreferences: vi.fn(),
}))

const PREFERENCES: NotificationPreferences = {
  emailEnabled: true,
  seatAlertsEnabled: true,
  disruptionAlertsEnabled: true,
  announcementsEnabled: false,
}

function renderSettings() {
  render(
    <AppProviders>
      <MemoryRouter initialEntries={['/app/settings']}>
        <SettingsPage />
      </MemoryRouter>
    </AppProviders>,
  )
}

beforeEach(() => {
  queryClient.clear()
  vi.mocked(getNotificationPreferences).mockReset()
  vi.mocked(getNotificationPreferences).mockResolvedValue(PREFERENCES)
  vi.mocked(updateNotificationPreferences).mockReset()
  vi.mocked(updateNotificationPreferences).mockImplementation((prefs) =>
    Promise.resolve(prefs),
  )
})

describe('SettingsPage notification preferences', () => {
  it('loads and shows the current preferences', async () => {
    renderSettings()

    const emailSwitch = await screen.findByRole('switch', { name: 'Email notifications' })
    expect(screen.getByText('Account settings')).toBeInTheDocument()
    expect(emailSwitch).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('switch', { name: 'Announcements' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
    expect(screen.getByRole('button', { name: 'Save preferences' })).toBeDisabled()
  })

  it('saves changed preferences and confirms with a toast', async () => {
    const user = userEvent.setup()
    renderSettings()
    await screen.findByRole('switch', { name: 'Email notifications' })

    await user.click(screen.getByRole('switch', { name: 'Disruption alerts' }))
    await user.click(screen.getByRole('switch', { name: 'Announcements' }))

    const save = screen.getByRole('button', { name: 'Save preferences' })
    expect(save).toBeEnabled()
    await user.click(save)

    await waitFor(() => expect(updateNotificationPreferences).toHaveBeenCalled())
    expect(vi.mocked(updateNotificationPreferences).mock.calls[0]?.[0]).toEqual({
      emailEnabled: true,
      seatAlertsEnabled: true,
      disruptionAlertsEnabled: false,
      announcementsEnabled: true,
    })
    expect(await screen.findByText('Preferences saved')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Disruption alerts' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
  })

  it('undoes unsaved changes', async () => {
    const user = userEvent.setup()
    renderSettings()
    await screen.findByRole('switch', { name: 'Email notifications' })

    await user.click(screen.getByRole('switch', { name: 'Email notifications' }))
    expect(screen.getByRole('switch', { name: 'Email notifications' })).toHaveAttribute(
      'aria-checked',
      'false',
    )

    await user.click(screen.getByRole('button', { name: 'Undo changes' }))

    expect(screen.getByRole('switch', { name: 'Email notifications' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(updateNotificationPreferences).not.toHaveBeenCalled()
  })
})
