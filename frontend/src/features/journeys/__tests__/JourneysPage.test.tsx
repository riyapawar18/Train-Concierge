import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders, queryClient } from '@/app/providers'
import { JourneysPage } from '@/features/passenger/pages/JourneysPage'
import { addDaysIso, todayIso } from '@/features/travel/date'
import { cancelJourney, getJourneys, getJourneySummary } from '../api'
import type { JourneyListItem, JourneyListResponse, JourneyStatusParam } from '../types'

vi.mock('@/features/journeys/api', () => ({
  createBooking: vi.fn(),
  getBookingByPnr: vi.fn(),
  getJourneys: vi.fn(),
  getJourneySummary: vi.fn(),
  getJourney: vi.fn(),
  updateJourney: vi.fn(),
  cancelJourney: vi.fn(),
}))

const travelDate = addDaysIso(todayIso(), 4)

function localDateTime(daysAhead: number, time: string): string {
  return `${addDaysIso(todayIso(), daysAhead)}T${time}:00`
}

function journey(overrides: Partial<JourneyListItem> = {}): JourneyListItem {
  return {
    id: 101,
    pnr: '1234567890',
    title: 'Mumbai weekend',
    trainNumber: '12123',
    trainName: 'Deccan Queen',
    travelDate,
    boardingTime: localDateTime(4, '07:15'),
    arrivalTime: localDateTime(4, '10:25'),
    classCode: '3A',
    className: 'AC 3 Tier',
    quota: 'GENERAL',
    from: { code: 'PUNE', name: 'Pune Junction', city: 'Pune' },
    to: { code: 'CSMT', name: 'Mumbai CSMT', city: 'Mumbai' },
    passengerCount: 1,
    seatLabels: ['B1-21, Lower'],
    status: 'UPCOMING',
    bookingStatus: 'CONFIRMED',
    totalFare: 2000,
    refundAmount: null,
    refundPercent: null,
    createdAt: localDateTime(-1, '09:00'),
    ...overrides,
  }
}

function listResponse(items: JourneyListItem[], status: JourneyStatusParam = 'ALL'): JourneyListResponse {
  return {
    items,
    page: 1,
    size: 10,
    totalItems: items.length,
    totalPages: items.length > 0 ? 1 : 0,
    sort: 'TRAVEL_DATE_ASC',
    status,
    serverTime: localDateTime(0, '10:00'),
  }
}

function renderPage() {
  render(
    <AppProviders>
      <MemoryRouter initialEntries={['/app/journeys']}>
        <JourneysPage />
      </MemoryRouter>
    </AppProviders>,
  )
}

beforeEach(() => {
  queryClient.clear()
  vi.mocked(getJourneySummary).mockReset()
  vi.mocked(getJourneys).mockReset()
  vi.mocked(cancelJourney).mockReset()
  vi.mocked(getJourneySummary).mockResolvedValue({
    upcoming: 1,
    active: 0,
    needingAttention: 0,
    completed: 0,
    cancelled: 1,
    disruptions: 0,
    total: 2,
  })
  vi.mocked(getJourneys).mockResolvedValue(
    listResponse([
      journey(),
      journey({ id: 102, pnr: '9876543210', status: 'CANCELLED', title: null }),
    ]),
  )
  vi.mocked(cancelJourney).mockResolvedValue({
    journeyId: 101,
    pnr: '1234567890',
    status: 'CANCELLED',
    refund: { amount: 1500, percent: 75, label: 'Estimated refund', simulated: true },
    cancelledAt: localDateTime(0, '11:00'),
  })
})

describe('My Journeys', () => {
  it('lists journeys and filters by the summary chips', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByText('My Journeys')).toBeVisible()
    expect((await screen.findAllByText('1234567890')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Deccan Queen').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Upcoming').length).toBeGreaterThan(0)

    const chips = screen.getByRole('group', { name: 'Journey status filters' })
    expect(chips).toBeVisible()

    await user.click(screen.getByRole('button', { name: /^Cancelled/ }))

    await waitFor(() =>
      expect(getJourneys).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'CANCELLED', page: 1 }),
      ),
    )
  })

  it('shows the estimated refund in the cancel dialog and cancels the booking', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findAllByText('1234567890')
    await user.click(screen.getAllByRole('button', { name: 'Cancel' })[0])

    expect(await screen.findByRole('dialog', { name: 'Cancel this journey?' })).toBeVisible()
    expect(
      screen.getByText(/Estimated refund: ₹1,500 \(75% of the fare\)\./),
    ).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Cancel journey' }))

    await waitFor(() => expect(cancelJourney).toHaveBeenCalledWith(101))
    expect(await screen.findByText('Journey cancelled · 1234567890')).toBeVisible()
  })

  it('shows a friendly error and recovers when retried', async () => {
    const user = userEvent.setup()
    const failure = Object.assign(
      new Error('We could not reach the server. Please check your connection and try again.'),
      { name: 'ApiError', status: 0, code: 'NETWORK_ERROR', fieldErrors: [] },
    )
    vi.mocked(getJourneys).mockRejectedValue(failure)
    renderPage()

    expect(await screen.findByText('We could not load your journeys')).toBeVisible()
    expect(
      screen.getByText('We could not reach the server. Please check your connection and try again.'),
    ).toBeVisible()

    vi.mocked(getJourneys).mockResolvedValue(listResponse([journey()]))
    await user.click(screen.getByRole('button', { name: /Try again/ }))

    expect((await screen.findAllByText('1234567890')).length).toBeGreaterThan(0)
  })

  it('shows the empty state when no journeys exist', async () => {
    vi.mocked(getJourneys).mockResolvedValue(listResponse([]))
    vi.mocked(getJourneySummary).mockResolvedValue({
      upcoming: 0,
      active: 0,
      needingAttention: 0,
      completed: 0,
      cancelled: 0,
      disruptions: 0,
      total: 0,
    })
    renderPage()

    expect(await screen.findByText('No journeys planned yet')).toBeVisible()
    expect(screen.getByText('Search trains to plan your next trip.')).toBeVisible()
    expect(screen.getAllByRole('link', { name: /Plan a Journey/ }).length).toBeGreaterThan(0)
  })
})
