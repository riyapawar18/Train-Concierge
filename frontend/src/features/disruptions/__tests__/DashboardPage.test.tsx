import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders, queryClient } from '@/app/providers'
import { DashboardPage } from '@/features/passenger/pages/DashboardPage'
import { getJourneys, getJourneySummary } from '@/features/journeys/api'
import { getMyDisruptions } from '@/features/disruptions/api'
import { getNotifications } from '@/features/notifications/api'
import type { JourneyListItem, JourneyListResponse } from '@/features/journeys/types'
import { passengerDisruption } from './fixtures'

vi.mock('@/app/SessionProvider', () => ({
  useSession: () => ({
    user: {
      id: 1,
      fullName: 'Asha Verma',
      email: 'asha@example.com',
      role: 'PASSENGER',
    },
  }),
}))

vi.mock('@/features/journeys/api', () => ({
  getJourneys: vi.fn(),
  getJourneySummary: vi.fn(),
}))

vi.mock('../api', () => ({
  getTrainSuggestions: vi.fn(),
  previewDisruption: vi.fn(),
  createDisruption: vi.fn(),
  getAdminDisruptions: vi.fn(),
  getAdminDisruption: vi.fn(),
  getAdminImpacts: vi.fn(),
  updateDisruption: vi.fn(),
  resolveDisruption: vi.fn(),
  getMyDisruptions: vi.fn(),
  getMyDisruption: vi.fn(),
  getJourneyImpact: vi.fn(),
  getRecommendations: vi.fn(),
}))

vi.mock('@/features/notifications/api', () => ({
  getNotifications: vi.fn(),
  getUnreadCount: vi.fn(),
}))

function emptyJourneys(): JourneyListResponse {
  return {
    items: [],
    page: 1,
    size: 5,
    totalItems: 0,
    totalPages: 0,
    sort: 'CREATED_DESC',
    status: 'ALL',
    serverTime: '2026-10-29T10:00:00',
  }
}

function journeyItem(overrides: Partial<JourneyListItem> = {}): JourneyListItem {
  return {
    id: 7,
    pnr: '2199004455',
    title: null,
    trainNumber: '12951',
    trainName: 'Rajdhani Express',
    travelDate: '2026-11-05',
    boardingTime: '2026-11-05T16:35',
    arrivalTime: '2026-11-06T08:05',
    classCode: '3A',
    className: 'AC 3 Tier',
    quota: 'GENERAL',
    from: { code: 'BCT', name: 'Mumbai Central', city: 'Mumbai' },
    to: { code: 'NDLS', name: 'New Delhi', city: 'New Delhi' },
    passengerCount: 1,
    seatLabels: ['A12'],
    status: 'UPCOMING',
    bookingStatus: 'CONFIRMED',
    totalFare: 1650,
    refundAmount: null,
    refundPercent: null,
    createdAt: '2026-10-29T10:00:00',
    ...overrides,
  }
}

function renderPage() {
  render(
    <AppProviders>
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <DashboardPage />
      </MemoryRouter>
    </AppProviders>,
  )
}

beforeEach(() => {
  queryClient.clear()
  vi.mocked(getJourneySummary).mockReset()
  vi.mocked(getJourneys).mockReset()
  vi.mocked(getMyDisruptions).mockReset()
  vi.mocked(getNotifications).mockReset()
  vi.mocked(getNotifications).mockResolvedValue({
    items: [],
    page: 1,
    size: 1,
    total: 3,
    hasMore: false,
  })

  vi.mocked(getJourneySummary).mockResolvedValue({
    upcoming: 2,
    active: 0,
    needingAttention: 1,
    completed: 0,
    cancelled: 0,
    disruptions: 1,
    total: 3,
  })
  vi.mocked(getJourneys).mockResolvedValue(emptyJourneys())
  vi.mocked(getMyDisruptions).mockResolvedValue([passengerDisruption()])
})

describe('Passenger dashboard alerts', () => {
  it('shows active disruptions and real summary counts', async () => {
    renderPage()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Welcome back, Asha!' }),
    ).toBeVisible()

    expect(await screen.findByText('Deccan Express')).toBeVisible()
    expect(
      screen.getByText('Train 11007 is delayed by 3h 15m. You will reach Mumbai CSMT at 23:00.'),
    ).toBeVisible()
    expect(screen.getByRole('link', { name: /View all disruption updates/ })).toHaveAttribute(
      'href',
      '/app/disruptions',
    )

    const alertLink = screen.getByRole('link', { name: /Deccan Express/ })
    expect(alertLink).toHaveAttribute('href', '/app/disruptions/1')

    const totalBookings = screen.getByRole('link', { name: 'View all bookings' })
    expect(within(totalBookings).getByText('3')).toBeVisible()

    const upcomingStat = screen.getByRole('link', { name: 'View upcoming journeys' })
    expect(within(upcomingStat).getByText('2')).toBeVisible()

    const seatAlerts = screen.getByRole('link', { name: 'View seat alerts' })
    expect(within(seatAlerts).getByText('3')).toBeVisible()

    expect(getMyDisruptions).toHaveBeenCalledWith('ACTIVE')
    expect(getNotifications).toHaveBeenCalledWith({ filter: 'SEATS', size: 1 })

    for (const searchTrains of screen.getAllByRole('link', { name: /Search Trains/ })) {
      expect(searchTrains).toHaveAttribute('href', '/app/search')
    }
  })

  it('features the next upcoming journey with its route and PNR', async () => {
    vi.mocked(getJourneys).mockResolvedValue({
      ...emptyJourneys(),
      items: [
        journeyItem({ id: 7, trainName: 'Rajdhani Express', pnr: '2199004455' }),
        journeyItem({ id: 8, trainName: 'Deccan Queen', pnr: '2199004456' }),
      ],
    })
    renderPage()

    const card = await screen.findByRole('link', { name: /View ticket/ })
    expect(card).toHaveAttribute('href', '/app/journeys/7')
    expect(screen.getByText('Mumbai — New Delhi')).toBeVisible()
    expect(screen.getByText('15h 30m')).toBeVisible()
    expect(screen.getAllByText('2199004455')[0]).toBeVisible()
    expect(screen.getByRole('link', { name: /Deccan Queen/ })).toHaveAttribute(
      'href',
      '/app/journeys/8',
    )
  })

  it('shows all clear when no disruptions are active', async () => {
    vi.mocked(getMyDisruptions).mockResolvedValue([])
    renderPage()

    expect(await screen.findByText('All clear')).toBeVisible()
    expect(screen.getByText('No disruptions affecting your journeys.')).toBeVisible()
  })
})
