import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders, queryClient } from '@/app/providers'
import { BookTicketCard } from '../components/BookTicketCard'
import { getStations } from '../api'
import { formatDisplayDate, todayIso } from '../date'

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

const stations = [
  {
    code: 'PUNE',
    name: 'Pune Junction',
    city: 'Pune',
    state: 'Maharashtra',
  },
  {
    code: 'PNVL',
    name: 'Panvel Junction',
    city: 'Panvel',
    state: 'Maharashtra',
  },
  {
    code: 'CSMT',
    name: 'Mumbai CSMT',
    city: 'Mumbai',
    state: 'Maharashtra',
  },
]

function renderCard() {
  const router = createMemoryRouter(
    [
      { path: '/', element: <BookTicketCard /> },
      { path: '/app/search', element: <div>search results</div> },
    ],
    { initialEntries: ['/'] },
  )
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return router
}

async function selectStations() {
  const user = userEvent.setup()
  await user.click(screen.getByLabelText('From'))
  await user.type(screen.getByLabelText('From'), 'Pune')
  await user.click(await screen.findByRole('option', { name: /Pune Junction/ }))

  await user.click(screen.getByLabelText('To'))
  await user.type(screen.getByLabelText('To'), 'Mumbai')
  await user.click(await screen.findByRole('option', { name: /Mumbai CSMT/ }))
  return user
}

beforeEach(() => {
  queryClient.clear()
  vi.mocked(getStations).mockImplementation(async (query: string) => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) {
      return stations
    }
    return stations.filter(
      (station) =>
        station.name.toLowerCase().includes(normalized) ||
        station.code.toLowerCase().includes(normalized),
    )
  })
})

describe('book ticket card', () => {
  it('defaults to today, blocks the search until stations are chosen, and navigates with URL filters', async () => {
    const router = renderCard()
    const submit = screen.getByRole('button', { name: 'Search Trains' })

    expect(screen.getByLabelText('Travel date')).toHaveValue(
      formatDisplayDate(todayIso()),
    )
    expect(submit).toBeDisabled()

    const user = await selectStations()
    await waitFor(() => expect(submit).toBeEnabled())
    await user.click(submit)

    expect(await screen.findByText('search results')).toBeVisible()
    expect(router.state.location.pathname).toBe('/app/search')
    const params = new URLSearchParams(router.state.location.search)
    expect(params.get('from')).toBe('PUNE')
    expect(params.get('to')).toBe('CSMT')
    expect(params.get('date')).toBe(todayIso())
  })

  it('shows the three ticket tabs and opens Charts / Vacancy', async () => {
    renderCard()
    const user = userEvent.setup()

    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'Book Ticket',
      'PNR Status',
      'Charts / Vacancy',
    ])
    expect(screen.queryByRole('tab', { name: 'Vacancy' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Charts / Vacancy' }))
    expect(screen.getByLabelText('Train number')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Check seats' })).toBeDisabled()
  })

  it('blocks the search when From and To are the same', async () => {
    renderCard()
    const user = await selectStations()

    const to = screen.getByLabelText('To')
    await user.clear(to)
    await user.type(to, 'Pune')
    await user.click(await screen.findByRole('option', { name: /Pune Junction/ }))

    expect(await screen.findByText('From and To stations must be different.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Search Trains' })).toBeDisabled()
  })

  it('swaps the selected origin and destination', async () => {
    renderCard()
    const user = await selectStations()

    await user.click(screen.getByRole('button', { name: 'Swap stations' }))

    await waitFor(() =>
      expect(screen.getByLabelText('From')).toHaveValue('Mumbai CSMT (CSMT)'),
    )
    expect(screen.getByLabelText('To')).toHaveValue('Pune Junction (PUNE)')
  })

  it('rejects a past travel date and disables the search', async () => {
    renderCard()
    const user = await selectStations()

    const date = screen.getByLabelText('Travel date')
    await user.clear(date)
    await user.type(date, '01/01/2020')
    await user.tab()

    expect(await screen.findByText('Travel date cannot be in the past.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Search Trains' })).toBeDisabled()
  })
})
