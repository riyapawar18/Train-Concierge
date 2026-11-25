import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders, queryClient } from '@/app/providers'
import { todayIso } from '@/features/travel/date'
import { AdminDisruptionsPage } from '@/features/admin/pages/AdminDisruptionsPage'
import {
  createDisruption,
  getAdminDisruption,
  getAdminDisruptions,
  getTrainSuggestions,
  previewDisruption,
  resolveDisruption,
} from '../api'
import { adminDetail, adminDisruption } from './fixtures'

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

function renderPage() {
  render(
    <AppProviders>
      <MemoryRouter initialEntries={['/admin/disruptions']}>
        <AdminDisruptionsPage />
      </MemoryRouter>
    </AppProviders>,
  )
}

beforeEach(() => {
  queryClient.clear()
  vi.mocked(getAdminDisruptions).mockReset()
  vi.mocked(getAdminDisruption).mockReset()
  vi.mocked(getTrainSuggestions).mockReset()
  vi.mocked(previewDisruption).mockReset()
  vi.mocked(createDisruption).mockReset()
  vi.mocked(resolveDisruption).mockReset()

  vi.mocked(getAdminDisruptions).mockResolvedValue([adminDisruption()])
  vi.mocked(getAdminDisruption).mockResolvedValue(adminDetail())
  vi.mocked(getTrainSuggestions).mockResolvedValue([
    { number: '11007', name: 'Deccan Express', runsOn: 'MON,TUE,WED,THU,FRI,SAT,SUN' },
  ])
  vi.mocked(previewDisruption).mockResolvedValue({
    affectedPassengers: 4,
    confirmedBookings: 2,
    message: 'Will affect 4 confirmed passengers',
  })
  vi.mocked(createDisruption).mockResolvedValue(
    adminDetail({ id: 9, affectedPassengers: 4, affectedBookings: 2 }),
  )
  vi.mocked(resolveDisruption).mockResolvedValue(
    adminDetail({ status: 'RESOLVED', resolvedAt: `${todayIso()}T12:00:00` }),
  )
})

describe('Admin disruption management', () => {
  it('lists active disruptions and filters by status', async () => {
    const user = userEvent.setup()
    renderPage()

    expect((await screen.findAllByText('Deccan Express')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('#11007').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Delayed 3h 15m').length).toBeGreaterThan(0)
    expect(getAdminDisruptions).toHaveBeenCalledWith({
      status: 'ACTIVE',
      train: undefined,
      date: undefined,
    })

    await user.click(screen.getByRole('button', { name: 'Resolved' }))

    await waitFor(() =>
      expect(getAdminDisruptions).toHaveBeenLastCalledWith({
        status: 'RESOLVED',
        train: undefined,
        date: undefined,
      }),
    )
  })

  it('shows a calm empty state when there are no active disruptions', async () => {
    vi.mocked(getAdminDisruptions).mockResolvedValue([])
    renderPage()

    expect(await screen.findByText('No active disruptions')).toBeVisible()
    expect(
      screen.getByText(
        'When a train is delayed or cancelled, log it here to alert affected passengers and prepare alternatives.',
      ),
    ).toBeVisible()
  })

  it('validates a new disruption before submitting', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findAllByText('Deccan Express')
    await user.click(screen.getByRole('button', { name: /New disruption/ }))

    const dialog = await screen.findByRole('dialog', { name: 'Log a disruption' })
    await user.click(within(dialog).getByRole('button', { name: 'Log disruption' }))

    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'Please check the highlighted fields.',
    )
    expect(within(dialog).getByText('Choose a train.')).toBeVisible()
    expect(within(dialog).getByText('Choose or enter a reason.')).toBeVisible()
    expect(createDisruption).not.toHaveBeenCalled()
  })

  it('previews affected passengers and creates the disruption', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findAllByText('Deccan Express')
    await user.click(screen.getByRole('button', { name: /New disruption/ }))

    const dialog = await screen.findByRole('dialog', { name: 'Log a disruption' })
    await user.type(within(dialog).getByRole('combobox', { name: 'Train' }), '11007')

    const option = await within(dialog).findByText('Deccan Express')
    await user.click(option)

    expect(await within(dialog).findByText('Will affect 4 confirmed passengers')).toBeVisible()
    expect(within(dialog).getByText('(2 confirmed bookings)')).toBeVisible()

    await user.type(within(dialog).getByLabelText('Reason'), 'Signal failure near Lonavala')
    await user.click(within(dialog).getByRole('button', { name: 'Log disruption' }))

    await waitFor(() =>
      expect(createDisruption).toHaveBeenCalledWith({
        trainNumber: '11007',
        travelDate: todayIso(),
        type: 'DELAY',
        delayMinutes: 60,
        reason: 'Signal failure near Lonavala',
        severity: 'MEDIUM',
      }),
    )

    expect(await screen.findByText('Disruption logged')).toBeVisible()
    expect(await screen.findByText('Affected journeys')).toBeVisible()
  })

  it('resolves a disruption after a confirmation', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findAllByText('Deccan Express')
    await user.click(screen.getAllByRole('button', { name: 'View' })[0])

    expect(await screen.findByText('Affected journeys')).toBeVisible()
    expect(screen.getByText('Asha Verma, Mohan Verma')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Resolve' }))

    expect(
      await screen.findByRole('dialog', { name: 'Resolve this disruption?' }),
    ).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Resolve disruption' }))

    await waitFor(() => expect(resolveDisruption).toHaveBeenCalledWith(1))
    expect(await screen.findByText('Disruption resolved')).toBeVisible()
  })
})
