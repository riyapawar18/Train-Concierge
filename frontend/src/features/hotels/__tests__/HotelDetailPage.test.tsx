import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders, queryClient } from '@/app/providers'
import { HotelDetailPage } from '../HotelDetailPage'
import { createHotelBooking, getHotel, getHotelPolicy, getHotelRooms, holdRoom } from '../api'
import type { FloorData, HotelPolicy, HotelSummary, NightAvailability } from '../types'

vi.mock('@/app/SessionProvider', () => ({
  useSession: () => ({
    user: { id: 1, fullName: 'Asha Verma', email: 'asha@example.com', role: 'PASSENGER' },
  }),
}))

vi.mock('../api', () => ({
  getHotel: vi.fn(),
  getHotelPolicy: vi.fn(),
  getHotelRooms: vi.fn(),
  holdRoom: vi.fn(),
  createHotelBooking: vi.fn(),
}))

const hotel: HotelSummary = {
  id: 5,
  name: 'Tranz Inn near CSMT',
  stationCode: 'CSMT',
  address: 'Near Mumbai CSMT',
  distanceKm: 0.4,
  priceMin: 3400,
  priceMax: 6800,
  rating: 4.3,
  phone: '022 4000 1111',
  email: 'stay@tranzinn.example',
  mapUrl: '',
  availableRoomsTonight: 3,
}

const policy: HotelPolicy = {
  standardCheckinTime: '14:00',
  standardCheckoutTime: '11:00',
  lateArrivalAllowed: true,
  lateArrivalCutoff: '22:00',
  lateCheckoutAllowed: true,
  maxLateCheckoutTime: '13:00',
  lateCheckoutFeeType: 'FREE',
  lateCheckoutFeeAmount: 0,
  extraNightPossible: true,
  freeChangeWindowHours: 24,
  extensionNeedsApproval: 'AUTO',
}

const floors: FloorData[] = [
  {
    floor: 2,
    rooms: [
      { id: 201, roomNo: '201', roomType: 'STANDARD', capacity: 2, pricePerNight: 3400, status: 'AVAILABLE' },
      { id: 202, roomNo: '202', roomType: 'DELUXE', capacity: 3, pricePerNight: 4600, status: 'BOOKED' },
    ],
  },
]

const dateStrip: NightAvailability[] = [
  { date: '2026-11-02', available: 1, total: 2 },
  { date: '2026-11-03', available: 1, total: 2 },
]

function renderPage() {
  render(
    <AppProviders>
      <MemoryRouter initialEntries={['/app/hotels/5']}>
        <Routes>
          <Route path="/app/hotels/:id" element={<HotelDetailPage />} />
        </Routes>
      </MemoryRouter>
    </AppProviders>,
  )
}

beforeEach(() => {
  queryClient.clear()
  vi.mocked(getHotel).mockReset().mockResolvedValue(hotel)
  vi.mocked(getHotelPolicy).mockReset().mockResolvedValue(policy)
  vi.mocked(getHotelRooms).mockReset().mockResolvedValue({
    floors,
    dateStrip,
    totalRooms: 2,
    availableTonight: 1,
  })
  vi.mocked(holdRoom).mockReset().mockResolvedValue({
    holdId: 77,
    expiresAt: new Date(Date.now() + 300_000).toISOString(),
    roomAvailabilityIds: [201],
  })
  vi.mocked(createHotelBooking).mockReset().mockResolvedValue({
    id: 12,
    hotelId: 5,
    hotelName: hotel.name,
    hotelPhone: hotel.phone,
    roomId: 201,
    roomNo: '201',
    roomType: 'STANDARD',
    checkInDate: dateStrip[0].date,
    checkInTime: '14:00',
    checkOutDate: dateStrip[1].date,
    checkOutTime: '11:00',
    guests: 1,
    totalPrice: 3400,
    status: 'CONFIRMED',
    lateArrivalCutoff: null,
    notes: null,
    manualEntry: false,
    journeyId: null,
    createdAt: '2026-11-02T09:00:00',
    impact: null,
    extensionRequests: [],
  })
})

describe('hotel stay checkout', () => {
  it('pays for the stay through the checkout and books the room', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('heading', { name: hotel.name })

    await user.click(await screen.findByRole('button', { name: /Room 201, Standard, available/i }))
    await user.click(screen.getByRole('button', { name: 'Review booking' }))
    await user.click(screen.getByRole('checkbox', { name: "I've read the stay rules" }))
    await user.click(screen.getByRole('button', { name: 'Pay Now' }))

    const checkout = await screen.findByRole('dialog', {
      name: `Payment for ${hotel.name}`,
    })
    expect(within(checkout).getByText('Choose payment method')).toBeVisible()
    expect(within(checkout).getByText('₹3,400.00')).toBeVisible()

    // Paytm sheet: wallet → OTP → verify
    await user.click(within(checkout).getByRole('button', { name: /Paytm/ }))
    await user.click(within(checkout).getByRole('button', { name: 'Pay ₹3,400.00' }))
    await user.type(within(checkout).getByLabelText('Paytm OTP digit 1'), '123456')
    await user.click(within(checkout).getByRole('button', { name: /Verify & Pay/ }))

    await within(checkout).findByText('Payment successful', {}, { timeout: 25000 })
    expect(within(checkout).getByText('Transaction successful')).toBeVisible()
    expect(within(checkout).getByText(/^paytm[0-9a-f]{12}$/)).toBeVisible()
    expect(within(checkout).getByText('HB-12')).toBeVisible()
    expect(within(checkout).getByRole('button', { name: /Download receipt/ })).toBeVisible()
    expect(
      within(checkout).getByRole('button', { name: /View booking details/ }),
    ).toBeVisible()

    await waitFor(() => expect(createHotelBooking).toHaveBeenCalledTimes(1), { timeout: 5000 })
    expect(holdRoom).toHaveBeenCalled()
    expect(createHotelBooking).toHaveBeenCalledWith(
      expect.objectContaining({ hotelId: 5, roomId: 201, guests: 1, totalPrice: 3400 }),
    )

    // Leaving the receipt reveals the hotel's own confirmation screen
    await user.click(within(checkout).getByRole('button', { name: /See your stay/ }))
    expect(await screen.findByRole('heading', { name: 'Hotel booked!' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'View stay details' })).toHaveAttribute(
      'href',
      '/app/hotels/bookings/12',
    )
  }, 40000)
})
