import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders, queryClient } from '@/app/providers'
import { DisruptionsPage } from '@/features/passenger/pages/DisruptionsPage'
import { DisruptionDetailPage } from '@/features/passenger/pages/DisruptionDetailPage'
import { getMyDisruption, getMyDisruptions } from '../api'
import { passengerDetail, passengerDisruption } from './fixtures'

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

function renderList() {
  render(
    <AppProviders>
      <MemoryRouter initialEntries={['/app/disruptions']}>
        <DisruptionsPage />
      </MemoryRouter>
    </AppProviders>,
  )
}

function renderDetail(id = 1) {
  render(
    <AppProviders>
      <MemoryRouter initialEntries={[`/app/disruptions/${id}`]}>
        <Routes>
          <Route path="/app/disruptions/:id" element={<DisruptionDetailPage />} />
        </Routes>
      </MemoryRouter>
    </AppProviders>,
  )
}

beforeEach(() => {
  queryClient.clear()
  vi.mocked(getMyDisruptions).mockReset()
  vi.mocked(getMyDisruption).mockReset()
  vi.mocked(getMyDisruptions).mockResolvedValue([passengerDisruption()])
  vi.mocked(getMyDisruption).mockResolvedValue(passengerDetail())
})

describe('Passenger disruption updates', () => {
  it('lists active updates with impact details and recovery links', async () => {
    renderList()

    expect(await screen.findByText('Deccan Express')).toBeVisible()
    expect(within(screen.getByRole('listitem')).getByText('Active')).toBeVisible()
    expect(screen.getByText('Moderate impact')).toBeVisible()
    expect(screen.getByText('Hotel needed')).toBeVisible()
    expect(
      screen.getByText(
        'Train 11007 is delayed by 3h 15m. You will reach Mumbai CSMT at 23:00.',
      ),
    ).toBeVisible()

    const alternatives = screen.getByRole('link', { name: /View alternatives/ })
    expect(alternatives).toHaveAttribute('href', '/app/recovery?journey=501')
    expect(screen.getByRole('link', { name: 'View update' })).toHaveAttribute(
      'href',
      '/app/disruptions/1',
    )
    expect(getMyDisruptions).toHaveBeenCalledWith('ACTIVE')
  })

  it('filters by resolved and all updates', async () => {
    const user = userEvent.setup()
    renderList()

    await screen.findByText('Deccan Express')
    await user.click(screen.getByRole('button', { name: 'Resolved' }))
    await waitFor(() => expect(getMyDisruptions).toHaveBeenLastCalledWith('RESOLVED'))

    await user.click(screen.getByRole('button', { name: 'All updates' }))
    await waitFor(() => expect(getMyDisruptions).toHaveBeenLastCalledWith(undefined))
  })

  it('shows a calm all-clear state when nothing is active', async () => {
    vi.mocked(getMyDisruptions).mockResolvedValue([])
    renderList()

    expect(await screen.findByText('All clear')).toBeVisible()
    expect(
      screen.getByText(
        'There are no delays or cancellations affecting your journeys right now. We will update this page if anything changes.',
      ),
    ).toBeVisible()
  })

  it('shows a friendly error and retries', async () => {
    const user = userEvent.setup()
    const failure = Object.assign(new Error('We could not reach the server.'), {
      name: 'ApiError',
      status: 0,
      code: 'NETWORK_ERROR',
      fieldErrors: [],
    })
    vi.mocked(getMyDisruptions).mockRejectedValue(failure)
    renderList()

    expect(
      await screen.findByText('We could not load disruption updates', {}, { timeout: 3000 }),
    ).toBeVisible()
    vi.mocked(getMyDisruptions).mockResolvedValue([passengerDisruption()])
    await user.click(screen.getByRole('button', { name: /Try again/ }))
    expect(await screen.findByText('Deccan Express')).toBeVisible()
  })
})

describe('Passenger disruption detail', () => {
  it('shows the update, impact summary and alternatives link', async () => {
    renderDetail()

    expect(
      await screen.findByRole('heading', { level: 1, name: /Deccan Express/ }),
    ).toBeVisible()
    expect(screen.getAllByText('Moderate impact').length).toBeGreaterThan(0)
    expect(
      screen.getByText(
        'Train 11007 is delayed by 3h 15m. You will reach Mumbai CSMT at 23:00.',
      ),
    ).toBeVisible()
    expect(screen.getByRole('link', { name: /View alternatives/ })).toHaveAttribute(
      'href',
      '/app/recovery?journey=501',
    )
  })

  it('shows the refund note for a cancellation', async () => {
    vi.mocked(getMyDisruption).mockResolvedValue(
      passengerDetail({ type: 'CANCELLATION', delayMinutes: null }),
    )
    renderDetail()

    expect(await screen.findByText(/Cancellation · Cancelled/)).toBeVisible()
    expect(
      screen.getByText(/A full refund applies to your original ticket/),
    ).toBeVisible()
  })

  it('explains when a resolved disruption no longer offers live alternatives', async () => {
    vi.mocked(getMyDisruption).mockResolvedValue(passengerDetail({ status: 'RESOLVED' }))
    renderDetail()

    expect(
      await screen.findByText(
        'This disruption has been resolved. Alternatives stay on record but are no longer active.',
      ),
    ).toBeVisible()
  })

  it('shows a friendly not-found state for another passenger’s update', async () => {
    const notFound = Object.assign(new Error('The requested item could not be found.'), {
      name: 'ApiError',
      status: 404,
      code: 'NOT_FOUND',
      fieldErrors: [],
    })
    vi.mocked(getMyDisruption).mockRejectedValue(notFound)
    renderDetail(99)

    expect(await screen.findByText('Update not found')).toBeVisible()
  })
})
