import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders, queryClient } from '@/app/providers'
import {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/features/notifications/api'
import type { AppNotification } from '@/features/notifications/types'
import { NotificationBell } from '../NotificationBell'

vi.mock('@/features/notifications/api', () => ({
  getNotifications: vi.fn(),
  getUnreadCount: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  markNotificationRead: vi.fn(),
  getNotificationPreferences: vi.fn(),
  updateNotificationPreferences: vi.fn(),
}))

function notification(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: 1,
    type: 'DISRUPTION',
    title: 'Train 11007 is delayed by 45 minutes',
    body: 'Your journey is affected.',
    linkPath: '/app/recovery?journey=7',
    entityType: 'disruption',
    entityId: 9,
    read: false,
    createdAt: '2026-10-29T09:30:00',
    ...overrides,
  }
}

function renderBell(to = '/app/notifications') {
  render(
    <AppProviders>
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <NotificationBell to={to} />
      </MemoryRouter>
    </AppProviders>,
  )
}

beforeEach(() => {
  queryClient.clear()
  vi.mocked(getUnreadCount).mockReset()
  vi.mocked(getUnreadCount).mockResolvedValue({ count: 2 })
  vi.mocked(getNotifications).mockReset()
  vi.mocked(getNotifications).mockResolvedValue({
    items: [
      notification(),
      notification({ id: 2, type: 'SEAT_ALERT', title: 'Seats are running low', read: true }),
    ],
    page: 0,
    size: 5,
    total: 2,
    hasMore: false,
  })
  vi.mocked(markAllNotificationsRead).mockReset()
  vi.mocked(markAllNotificationsRead).mockResolvedValue({ updated: 2 })
  vi.mocked(markNotificationRead).mockReset()
  vi.mocked(markNotificationRead).mockResolvedValue(notification({ read: true }))
})

describe('NotificationBell', () => {
  it('shows the unread count and loads the latest five when opened', async () => {
    const user = userEvent.setup()
    renderBell()

    const trigger = await screen.findByRole('button', { name: 'Notifications, 2 unread' })
    expect(getNotifications).not.toHaveBeenCalled()

    await user.click(trigger)

    const menu = await screen.findByRole('menu')
    expect(getNotifications).toHaveBeenCalledWith({ page: 0, size: 5 })
    expect(within(menu).getByText('Train 11007 is delayed by 45 minutes')).toBeInTheDocument()
    expect(within(menu).getByText('Seats are running low')).toBeInTheDocument()
    expect(within(menu).getAllByLabelText('Unread')).toHaveLength(1)
    expect(
      within(menu).getByRole('menuitem', { name: /View all notifications/ }),
    ).toBeInTheDocument()
  })

  it('marks a notification as read when it is opened from the dropdown', async () => {
    const user = userEvent.setup()
    renderBell()
    await user.click(await screen.findByRole('button', { name: 'Notifications, 2 unread' }))

    const menu = await screen.findByRole('menu')
    const item = within(menu).getByRole('menuitem', { name: /Train 11007 is delayed/ })
    expect(item).toHaveAttribute('href', '/app/recovery?journey=7')
    await user.click(item)

    await waitFor(() => expect(markNotificationRead).toHaveBeenCalled())
    expect(vi.mocked(markNotificationRead).mock.calls[0]?.[0]).toBe(1)
  })

  it('marks everything as read from the dropdown header', async () => {
    const user = userEvent.setup()
    renderBell()
    await user.click(await screen.findByRole('button', { name: 'Notifications, 2 unread' }))
    const menu = await screen.findByRole('menu')

    await user.click(within(menu).getByRole('menuitem', { name: /Mark all as read/ }))

    await waitFor(() => expect(markAllNotificationsRead).toHaveBeenCalledTimes(1))
    expect(queryClient.getQueryData(['notifications-unread'])).toEqual({ count: 0 })
  })

  it('shows a calm empty state when there is nothing new', async () => {
    const user = userEvent.setup()
    vi.mocked(getUnreadCount).mockResolvedValue({ count: 0 })
    vi.mocked(getNotifications).mockResolvedValue({
      items: [],
      page: 0,
      size: 5,
      total: 0,
      hasMore: false,
    })
    renderBell()

    await user.click(await screen.findByRole('button', { name: 'Notifications, 0 unread' }))

    const menu = await screen.findByRole('menu')
    expect(within(menu).getByText("You're all caught up.")).toBeInTheDocument()
    const markAll = within(menu).getByRole('menuitem', { name: /Mark all as read/ })
    expect(markAll).toHaveAttribute('aria-disabled', 'true')
  })

  it('renders a plain link for admin pages', async () => {
    vi.mocked(getUnreadCount).mockResolvedValue({ count: 3 })
    renderBell('/admin/notifications')

    const link = await screen.findByRole('link', { name: 'Notifications, 3 unread' })
    expect(link).toHaveAttribute('href', '/admin/notifications')
    expect(getNotifications).not.toHaveBeenCalled()
  })
})
