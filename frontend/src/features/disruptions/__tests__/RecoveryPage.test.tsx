import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders, queryClient } from '@/app/providers'
import { RecoveryPage } from '@/features/passenger/pages/RecoveryPage'
import { getJourneyImpact, getMyDisruptions, getRecommendations } from '../api'
import { journeyImpact, recommendation } from './fixtures'

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

const bus = recommendation({
  id: 32,
  kind: 'BUS',
  refTrainNumber: null,
  refName: 'Shivneri Travels',
  refBusTripId: 7,
  classCode: null,
  className: null,
  departureAt: '2026-11-02T19:00:00',
  arrivalAt: '2026-11-02T23:30:00',
  fare: 900,
  seatsAvailable: 18,
  score: 45,
  rank: 2,
  recommended: false,
  reasons: ['Direct bus service to Mumbai'],
  warnings: [],
})

const wait = recommendation({
  id: 33,
  kind: 'WAIT',
  refTrainNumber: null,
  refName: 'Wait for your train',
  refBusTripId: null,
  departureAt: '2026-11-02T16:30:00',
  arrivalAt: '2026-11-02T23:00:00',
  fare: 2000,
  seatsAvailable: 4,
  score: 30,
  rank: 3,
  recommended: false,
  reasons: ['Short delay: your train is still the fastest option'],
  warnings: [],
})

function renderPage(path = '/app/recovery?journey=501') {
  render(
    <AppProviders>
      <MemoryRouter initialEntries={[path]}>
        <RecoveryPage />
      </MemoryRouter>
    </AppProviders>,
  )
}

beforeEach(() => {
  queryClient.clear()
  vi.mocked(getJourneyImpact).mockReset()
  vi.mocked(getRecommendations).mockReset()
  vi.mocked(getMyDisruptions).mockReset()
  // Default: disruptions list returns an item matching the URL journey id
  vi.mocked(getMyDisruptions).mockResolvedValue([
    {
      id: 10,
      impactId: 20,
      journeyId: 501,
      trainNumber: '12127',
      trainName: 'Intercity Express',
      travelDate: '2026-11-02',
      fromCode: 'PUNE',
      fromName: 'Pune Junction',
      toCode: 'CSMT',
      toName: 'Mumbai CSMT',
      type: 'DELAY',
      delayMinutes: 195,
      reason: 'Signal failure',
      severity: 'HIGH',
      status: 'ACTIVE',
      impactLevel: 'MODERATE',
      summary: 'Train 12127 is delayed by 3h 15m.',
      originalArrival: '2026-11-02T19:45:00',
      newArrival: '2026-11-02T23:00:00',
      missedConnection: false,
      overnight: true,
      needsHotel: true,
      journeyStatus: 'DISRUPTED',
      createdAt: '2026-11-02T10:00:00',
    },
  ])
  vi.mocked(getJourneyImpact).mockResolvedValue(journeyImpact())
  vi.mocked(getRecommendations).mockResolvedValue([recommendation(), bus, wait])
})

describe('Recovery options', () => {
  it('ranks alternatives and explains the recommendation', async () => {
    renderPage()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Recovery options' }),
    ).toBeVisible()
    expect(await screen.findByText('Best option')).toBeVisible()
    expect(screen.getByText('Option 1')).toBeVisible()
    expect(screen.getByText('Option 2')).toBeVisible()
    expect(screen.getByText('Option 3')).toBeVisible()
    expect(
      screen.getByText('Arrives 3h 15m earlier than the delayed train'),
    ).toBeVisible()
    expect(screen.getByText('Arrives after midnight')).toBeVisible()
    expect(screen.getByText('Intercity Express')).toBeVisible()
    expect(screen.getByText('Shivneri Travels')).toBeVisible()
    expect(getRecommendations).toHaveBeenCalledWith(501)
  })

  it('filters options by kind', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Intercity Express')
    await user.click(screen.getByRole('button', { name: /^Buses/ }))

    await waitFor(() => expect(screen.queryByText('Intercity Express')).not.toBeInTheDocument())
    expect(screen.getByText('Shivneri Travels')).toBeVisible()

    await user.click(screen.getByRole('button', { name: /^Wait/ }))
    await waitFor(() => expect(screen.queryByText('Shivneri Travels')).not.toBeInTheDocument())
    expect(screen.getByText('Wait for your train')).toBeVisible()
  })

  it('shows the refund note and resolved note for a cancellation', async () => {
    vi.mocked(getJourneyImpact).mockResolvedValue(
      journeyImpact({
        disruptionType: 'CANCELLATION',
        disruptionStatus: 'RESOLVED',
        delayMinutes: 0,
        newArrival: null,
        refundNote: 'Full refund applies to your original ticket.',
      }),
    )
    renderPage()

    expect(
      await screen.findByText('Full refund applies to your original ticket.'),
    ).toBeVisible()
    expect(
      screen.getByText(
        'This disruption is resolved. These alternatives are kept for reference.',
      ),
    ).toBeVisible()
  })

  it('shows a calm message when no alternatives were generated', async () => {
    vi.mocked(getRecommendations).mockResolvedValue([])
    renderPage()

    expect(await screen.findByText('No alternatives available yet')).toBeVisible()
  })

  it('shows a helpful empty state when no disrupted journeys exist', async () => {
    // No disruptions and no journey in URL
    vi.mocked(getMyDisruptions).mockResolvedValue([])
    renderPage('/app/recovery')

    expect(
      await screen.findByText('Nothing needs your attention right now'),
    ).toBeVisible()
    expect(screen.getByRole('link', { name: 'View my journeys' })).toHaveAttribute(
      'href',
      '/app/journeys',
    )
  })

  it('shows a friendly error when recommendations fail', async () => {
    vi.mocked(getRecommendations).mockRejectedValue(
      Object.assign(new Error('We could not reach the server.'), {
        name: 'ApiError',
        status: 0,
        code: 'NETWORK_ERROR',
        fieldErrors: [],
      }),
    )
    renderPage()

    expect(await screen.findByText('We could not load recovery options')).toBeVisible()
  })
})
