import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders, queryClient } from '@/app/providers'
import {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/features/notifications/api'
import type { AppNotification, NotificationPage } from '@/features/notifications/types'
import { NotificationsPage } from '../pages/NotificationsPage'

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

function page(items: AppNotification[], overrides: Partial<NotificationPage> = {}): NotificationPage {
  return { items, page: 0, size: 20, total: items.length, hasMore: false, ...overrides }
}

function renderPage() {
  render(
    <AppProviders>
      <MemoryRouter initialEntries={['/app/notifications']}>
        <Routes>
          <Route path="/app/notifications" element={<NotificationsPage />} />
          <Route path="*" element={<div>Navigated away</div>} />
        </Routes>
      </MemoryRouter>
    </AppProviders>,
  )
}

beforeEach(() => {
  queryClient.clear()
  vi.mocked(getUnreadCount).mockReset()
  vi.mocked(getUnreadCount).mockResolvedValue({ count: 2 })
  vi.mocked(getNotifications).mockReset()
  vi.mocked(getNotifications).mockResolvedValue(
    page([
      notification(),
      notification({ id: 2, type: 'BOOKING_CONFIRMED', title: 'Booking confirmed', read: true }),
    ]),
  )
  vi.mocked(markAllNotificationsRead).mockReset()
  vi.mocked(markAllNotificationsRead).mockResolvedValue({ updated: 2 })
  vi.mocked(markNotificationRead).mockReset()
  vi.mocked(markNotificationRead).mockResolvedValue(notification({ read: true }))
})

describe('NotificationsPage', () => {
  it('lists notifications newest first with unread highlights', async () => {
    renderPage()

    expect(await screen.findByText('Train 11007 is delayed by 45 minutes')).toBeInTheDocument()
    expect(screen.getByText('Booking confirmed')).toBeInTheDocument()
    expect(screen.getByText('Unread', { selector: 'span' })).toBeInTheDocument()
    expect(getNotifications).toHaveBeenCalledWith({ filter: 'ALL', page: 0, size: 20 })
  })

  it('switches filters and refetches', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Train 11007 is delayed by 45 minutes')

    const group = screen.getByRole('group', { name: 'Notification filters' })
    await user.click(within(group).getByRole('button', { name: 'Unread' }))

    await waitFor(() =>
      expect(getNotifications).toHaveBeenLastCalledWith({ filter: 'UNREAD', page: 0, size: 20 }),
    )
  })

  it('marks everything as read in one action', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Train 11007 is delayed by 45 minutes')

    await user.click(screen.getByRole('button', { name: /Mark all as read/ }))

    await waitFor(() => expect(markAllNotificationsRead).toHaveBeenCalledTimes(1))
    expect(queryClient.getQueryData(['notifications-unread'])).toEqual({ count: 0 })
  })

  it('marks a single notification as read and follows its link', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Train 11007 is delayed by 45 minutes')

    await user.click(screen.getByRole('button', { name: /Train 11007 is delayed by 45 minutes/ }))

    await waitFor(() => expect(markNotificationRead).toHaveBeenCalled())
    expect(vi.mocked(markNotificationRead).mock.calls[0]?.[0]).toBe(1)
    expect(await screen.findByText('Navigated away')).toBeInTheDocument()
  })

  it('does not re-mark an already read notification', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Booking confirmed')

    await user.click(screen.getByRole('button', { name: /Booking confirmed/ }))

    expect(markNotificationRead).not.toHaveBeenCalled()
    expect(await screen.findByText('Navigated away')).toBeInTheDocument()
  })

  it('loads the next page of older notifications', async () => {
    const user = userEvent.setup()
    vi.mocked(getNotifications).mockImplementation((query) =>
      Promise.resolve(
        query?.page === 0
          ? page([notification()], { hasMore: true })
          : page([notification({ id: 3, title: 'Older update', read: true })]),
      ),
    )
    renderPage()
    await screen.findByText('Train 11007 is delayed by 45 minutes')

    await user.click(screen.getByRole('button', { name: 'Load older notifications' }))

    expect(await screen.findByText('Older update')).toBeInTheDocument()
    expect(getNotifications).toHaveBeenLastCalledWith({ filter: 'ALL', page: 1, size: 20 })
  })

  it('shows filter-aware empty states', async () => {
    const user = userEvent.setup()
    vi.mocked(getNotifications).mockResolvedValue(page([]))
    renderPage()

    expect(await screen.findByText('No notifications yet')).toBeInTheDocument()

    const group = screen.getByRole('group', { name: 'Notification filters' })
    await user.click(within(group).getByRole('button', { name: 'Unread' }))

    expect(await screen.findByText("You're all caught up.")).toBeInTheDocument()
  })
})
