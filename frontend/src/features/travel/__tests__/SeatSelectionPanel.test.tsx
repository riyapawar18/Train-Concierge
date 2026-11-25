import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders, queryClient } from '@/app/providers'
import { SeatMap } from '../components/SeatMap'
import { SeatSelectionPanel } from '../components/SeatSelectionPanel'
import {
  createSeatHold,
  getAvailability,
  getCoaches,
  getSeatMap,
  releaseSeatHold,
} from '../api'
import type { Seat, SeatHold } from '../types'
import { seatMap, seatsAvailability, seatsCoaches, travelDate } from './fixtures'

vi.mock('@/app/SessionProvider', () => ({
  useSession: () => ({
    user: { id: 1, fullName: 'Asha Verma', email: 'asha@example.com', role: 'PASSENGER' },
  }),
}))

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

function holdFor(seatNo: number): SeatHold {
  return {
    id: seatNo,
    trainNumber: '12125',
    date: travelDate,
    coachId: 11,
    coachNo: 'C1',
    seatNo,
    berthType: 'WS',
    berthLabel: 'Window',
    label: `C1/${seatNo}`,
    heldUntil: new Date(Date.now() + 10 * 60_000).toISOString(),
  }
}

beforeEach(() => {
  queryClient.clear()
  vi.mocked(getAvailability).mockResolvedValue(seatsAvailability)
  vi.mocked(getCoaches).mockResolvedValue(seatsCoaches)
  vi.mocked(getSeatMap).mockResolvedValue(seatMap)
  vi.mocked(createSeatHold).mockImplementation(async (input) => holdFor(input.seatNo))
  vi.mocked(releaseSeatHold).mockResolvedValue(undefined)
})

describe('seat selection', () => {
  it('shows the legend and ARIA states, holds seats and enforces the passenger limit', async () => {
    const user = userEvent.setup()
    render(
      <AppProviders>
        <MemoryRouter>
          <SeatSelectionPanel
            trainNumber="12125"
            trainName="Pragati Express"
            date={travelDate}
            initialClass="CC"
            onClose={vi.fn()}
          />
        </MemoryRouter>
      </AppProviders>,
    )

    const firstSeat = await screen.findByRole('button', {
      name: 'Seat 1, Window seat, available',
    })
    const occupied = screen.getByRole('button', { name: 'Seat 3, Aisle seat, occupied' })
    const held = screen.getByRole('button', { name: 'Seat 4, Window seat, held' })

    expect(occupied).toBeDisabled()
    expect(held).toBeDisabled()
    expect(firstSeat).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('CC: 2 left')).toBeVisible()

    const legend = screen.getByLabelText('Seat map legend')
    for (const label of ['Available', 'Occupied', 'Selected', 'Held']) {
      expect(within(legend).getByText(label)).toBeVisible()
    }

    await user.click(firstSeat)

    const selected = await screen.findByRole('button', {
      name: 'Seat 1, Window seat, selected',
    })
    expect(selected).toHaveAttribute('aria-pressed', 'true')
    expect(createSeatHold).toHaveBeenCalledWith({
      trainNumber: '12125',
      date: travelDate,
      coachId: 11,
      seatNo: 1,
    })
    expect(screen.getByText(/Seats held for \d{2}:\d{2}/)).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Seat 2, Middle seat, available' }))
    expect(
      screen.getByText(
        'You can select up to 1 seat for 1 passenger. Deselect a seat to choose another.',
      ),
    ).toBeVisible()
    expect(createSeatHold).toHaveBeenCalledTimes(1)

    await user.selectOptions(screen.getByLabelText('Passengers'), '2')
    await user.click(screen.getByRole('button', { name: 'Seat 2, Middle seat, available' }))

    await waitFor(() => expect(createSeatHold).toHaveBeenCalledTimes(2))
    expect(
      await screen.findByRole('button', { name: 'Seat 2, Middle seat, selected' }),
    ).toHaveAttribute('aria-pressed', 'true')

    const book = screen.getByRole('button', { name: 'Book Now' })
    expect(book).toBeEnabled()
    await user.click(book)
    expect(await screen.findByRole('dialog', { name: 'Passenger details' })).toBeVisible()
    expect(screen.getByLabelText('Contact email')).toHaveValue('asha@example.com')
    expect(screen.getAllByLabelText('Full name')[0]).toHaveValue('Asha Verma')
  })

  it('shows the class availability bar and books a seat with the keyboard', async () => {
    const user = userEvent.setup()
    render(
      <AppProviders>
        <MemoryRouter>
          <SeatSelectionPanel
            trainNumber="12125"
            trainName="Pragati Express"
            date={travelDate}
            initialClass="CC"
            onClose={vi.fn()}
          />
        </MemoryRouter>
      </AppProviders>,
    )

    const bar = screen.getByRole('progressbar', { name: 'CC availability' })
    await waitFor(() => expect(bar).toHaveAttribute('aria-valuenow', '2'))
    expect(bar).toHaveAttribute('aria-valuemax', '5')
    expect(screen.getByText('Available 2 / 5')).toBeVisible()
    expect(screen.getByText(/Booking: 0 seats selected/)).toBeVisible()

    const seat = await screen.findByRole('button', { name: 'Seat 1, Window seat, available' })
    seat.focus()
    await user.keyboard('{Enter}')

    expect(
      await screen.findByRole('button', { name: 'Seat 1, Window seat, selected' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(await screen.findByText(/Booking: 1 seat selected \(C1-01, Window\)/)).toBeVisible()
    expect(screen.getByText(/Seats held for \d{2}:\d{2}/)).toBeVisible()
  })
})

describe('seat map layouts', () => {
  const availableSeat = (
    seatNo: number,
    berthType: string,
    berthLabel: string,
  ): Seat => ({
    seatNo,
    berthType,
    berthLabel,
    status: 'AVAILABLE',
    heldUntil: null,
  })

  it('renders berth bays with side berths and accessible labels', () => {
    const berths = [
      availableSeat(1, 'LB', 'Lower'),
      availableSeat(2, 'MB', 'Middle'),
      availableSeat(3, 'UB', 'Upper'),
      availableSeat(4, 'LB', 'Lower'),
      availableSeat(5, 'MB', 'Middle'),
      availableSeat(6, 'UB', 'Upper'),
      availableSeat(7, 'SL', 'Side Lower'),
      availableSeat(8, 'SU', 'Side Upper'),
    ]
    render(
      <SeatMap
        seats={berths}
        layout="BERTH"
        selectedSeats={new Set()}
        onToggle={vi.fn()}
        coachNo="S1"
      />,
    )

    expect(screen.getByRole('group', { name: 'Coach S1 seat map' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Seat 1, Lower berth, available' })).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'Seat 7, Side Lower berth, available' }),
    ).toBeVisible()
    expect(screen.getAllByRole('button')).toHaveLength(8)
  })

  it('renders chair rows with window, middle and aisle seats', () => {
    const chairs = [
      availableSeat(1, 'WS', 'Window'),
      availableSeat(2, 'MS', 'Middle'),
      availableSeat(3, 'AS', 'Aisle'),
      availableSeat(4, 'WS', 'Window'),
      availableSeat(5, 'MS', 'Middle'),
    ]
    render(
      <SeatMap
        seats={chairs}
        layout="CHAIR_3x2"
        selectedSeats={new Set()}
        onToggle={vi.fn()}
        coachNo="C1"
      />,
    )

    expect(screen.getByRole('button', { name: 'Seat 1, Window seat, available' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Seat 3, Aisle seat, available' })).toBeVisible()
    expect(screen.getAllByRole('button')).toHaveLength(5)
  })
})
