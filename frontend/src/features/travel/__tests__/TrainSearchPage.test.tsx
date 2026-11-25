import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders, queryClient } from '@/app/providers'
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/features/notifications/api'
import { TrainSearchPage } from '@/features/passenger/pages/TrainSearchPage'
import { searchTrains } from '../api'
import { addDaysIso } from '../date'
import { emptyResponse, searchResponse, travelDate } from './fixtures'

vi.mock('@/features/travel/api', () => ({
  getStations: vi.fn(),
  searchTrains: vi.fn(),
  getAvailability: vi.fn(),
  getCoaches: vi.fn(),
  getSeatMap: vi.fn(),
  createSeatHold: vi.fn(),
  releaseSeatHold: vi.fn(),
  getTrainStatus: vi.fn(),
}))

vi.mock('@/features/notifications/api', () => ({
  getNotifications: vi.fn(),
  getUnreadCount: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  markNotificationRead: vi.fn(),
  getNotificationPreferences: vi.fn(),
  updateNotificationPreferences: vi.fn(),
}))

function renderResults() {
  const router = createMemoryRouter([{ path: '/app/search', element: <TrainSearchPage /> }], {
    initialEntries: [`/app/search?from=PUNE&to=CSMT&date=${travelDate}`],
  })
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return router
}

function lastFilters() {
  return vi.mocked(searchTrains).mock.calls.at(-1)?.[0]
}

beforeEach(() => {
  queryClient.clear()
  vi.mocked(searchTrains).mockResolvedValue(searchResponse)
  vi.mocked(getNotificationPreferences).mockResolvedValue({
    emailEnabled: true,
    seatAlertsEnabled: false,
    disruptionAlertsEnabled: true,
    announcementsEnabled: false,
  })
  vi.mocked(updateNotificationPreferences).mockImplementation((preferences) =>
    Promise.resolve(preferences),
  )
})

describe('train search results', () => {
  it('shows the route summary and trains, and writes filters to the URL', async () => {
    const user = userEvent.setup()
    const router = renderResults()

    expect(
      await screen.findByText(
        `2 results for PUNE JUNCTION → MUMBAI CSMT | ${new Intl.DateTimeFormat('en-GB', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }).format(new Date(`${travelDate}T00:00:00`))} | General`,
      ),
    ).toBeVisible()
    expect(screen.getByText('Deccan Queen')).toBeVisible()
    expect(screen.getByText('Pragati Express')).toBeVisible()
    expect(screen.getAllByRole('button', { name: '3A AVL 18 ₹1,245' })).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Other' }))

    await waitFor(() => expect(lastFilters()?.types).toEqual(['OTHER']))
    expect(new URLSearchParams(router.state.location.search).get('types')).toBe('OTHER')

    // All classes start included, so excluding the other two leaves 3A only.
    const class2A = screen.getByRole('checkbox', { name: '2A · 1 train' })
    const classCC = screen.getByRole('checkbox', { name: 'CC · 1 train' })
    expect(class2A).toBeChecked()
    expect(classCC).toBeChecked()
    await user.click(class2A)
    await waitFor(() => expect(lastFilters()?.classCodes).toEqual(['3A', 'CC']))

    // The results refetch re-renders the panel, so query the live checkbox again.
    await user.click(screen.getByRole('checkbox', { name: 'CC · 1 train' }))

    await waitFor(() => expect(lastFilters()?.classCodes).toEqual(['3A']))
    expect(new URLSearchParams(router.state.location.search).get('class')).toBe('3A')
    expect(screen.getByRole('checkbox', { name: '3A · 2 trains' })).toBeChecked()

    await user.click(
      screen.getByRole('button', { name: 'Departure Morning, 06:00 to 12:00' }),
    )

    await waitFor(() => {
      expect(lastFilters()?.depFrom).toBe(360)
      expect(lastFilters()?.depTo).toBe(720)
    })
    const departureParams = new URLSearchParams(router.state.location.search)
    expect(departureParams.get('depFrom')).toBe('360')
    expect(departureParams.get('depTo')).toBe('720')

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Remove Filter' })).toBeEnabled(),
    )
    await user.click(screen.getByRole('button', { name: 'Remove Filter' }))

    await waitFor(() =>
      expect(new URLSearchParams(router.state.location.search).get('class')).toBeNull(),
    )
    const params = new URLSearchParams(router.state.location.search)
    expect(params.get('types')).toBeNull()
    expect(params.get('depFrom')).toBeNull()
    expect(screen.getByRole('button', { name: 'Remove Filter' })).toBeDisabled()
  })

  it('sorts through the URL so a refresh keeps the chosen order', async () => {
    const user = userEvent.setup()
    const router = renderResults()

    await screen.findByText('Deccan Queen')
    await user.selectOptions(screen.getByLabelText('Sort by'), 'FARE')

    await waitFor(() => expect(lastFilters()?.sort).toBe('FARE'))
    expect(new URLSearchParams(router.state.location.search).get('sort')).toBe('FARE')
  })

  it('offers another date when no trains match', async () => {
    vi.mocked(searchTrains).mockResolvedValue(emptyResponse)
    const user = userEvent.setup()
    const router = renderResults()

    expect(await screen.findByText('No trains found')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Previous Day' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Try another date' }))

    await waitFor(() =>
      expect(new URLSearchParams(router.state.location.search).get('date')).toBe(
        addDaysIso(travelDate, 1),
      ),
    )
    expect(await screen.findByText('No trains found')).toBeVisible()
  })

  it('opts the passenger in to email seat alerts without changing the other categories', async () => {
    const user = userEvent.setup()
    renderResults()

    const seatAlerts = await screen.findByRole('switch', { name: 'Email seat alerts' })
    expect(seatAlerts).toHaveAttribute('aria-checked', 'false')

    await user.click(seatAlerts)

    await waitFor(() => expect(updateNotificationPreferences).toHaveBeenCalled())
    expect(vi.mocked(updateNotificationPreferences).mock.calls[0]?.[0]).toEqual({
      emailEnabled: true,
      seatAlertsEnabled: true,
      disruptionAlertsEnabled: true,
      announcementsEnabled: false,
    })
    expect(await screen.findByRole('switch', { name: 'Email seat alerts' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.getByText('Seat alerts are on')).toBeInTheDocument()
  })
})
