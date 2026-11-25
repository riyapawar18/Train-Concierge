import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders, queryClient } from '@/app/providers'
import { addDaysIso, todayIso } from '@/features/travel/date'
import type { SeatHold } from '@/features/travel/types'
import { BookingFlow } from '../components/BookingFlow'
import { createBooking } from '../api'
import type { BookingResponse } from '../types'

vi.mock('@/app/SessionProvider', () => ({
  useSession: () => ({
    user: { id: 1, fullName: 'Asha Verma', email: 'asha@example.com', role: 'PASSENGER' },
  }),
}))

vi.mock('@/features/journeys/api', () => ({
  createBooking: vi.fn(),
  getBookingByPnr: vi.fn(),
  getJourneys: vi.fn(),
  getJourneySummary: vi.fn(),
  getJourney: vi.fn(),
  updateJourney: vi.fn(),
  cancelJourney: vi.fn(),
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

const travelDate = addDaysIso(todayIso(), 4)

const hold: SeatHold = {
  id: 42,
  trainNumber: '12123',
  date: travelDate,
  coachId: 11,
  coachNo: 'B1',
  seatNo: 21,
  berthType: 'LB',
  berthLabel: 'Lower',
  label: 'B1-21',
  heldUntil: new Date(Date.now() + 10 * 60_000).toISOString(),
}

function booking(overrides: Partial<BookingResponse> = {}): BookingResponse {
  return {
    id: 7,
    pnr: '1234567890',
    journeyId: 70,
    status: 'CONFIRMED',
    trainNumber: '12123',
    trainName: 'Deccan Queen',
    travelDate,
    boardingTime: `${travelDate}T07:15:00`,
    arrivalTime: `${travelDate}T10:25:00`,
    classCode: '3A',
    className: 'AC 3 Tier',
    quota: 'GENERAL',
    from: { code: 'PUNE', name: 'Pune Junction', city: 'Pune' },
    to: { code: 'CSMT', name: 'Mumbai CSMT', city: 'Mumbai' },
    passengerCount: 1,
    passengers: [
      {
        id: 1,
        name: 'Asha Verma',
        age: 34,
        gender: 'FEMALE',
        berthPreference: null,
        seatNo: 21,
        berthType: 'LB',
        seatLabel: 'B1-21, Lower',
        coachNo: 'B1',
      },
    ],
    fare: {
      baseFare: 1245,
      reservationCharge: 60,
      gst: 65.25,
      totalFare: 1370.25,
      perPassenger: 1245,
    },
    contactEmail: 'asha@example.com',
    contactMobile: null,
    createdAt: `${travelDate}T09:00:00`,
    cancelledAt: null,
    refund: null,
    ...overrides,
  }
}

function renderFlow(overrides: Partial<Parameters<typeof BookingFlow>[0]> = {}) {
  const onBooked = vi.fn()
  const onHoldsInvalid = vi.fn()
  const onOpenChange = vi.fn()
  render(
    <AppProviders>
      <MemoryRouter>
        <BookingFlow
          open
          onOpenChange={onOpenChange}
          trainNumber="12123"
          trainName="Deccan Queen"
          date={travelDate}
          classCode="3A"
          quota="GENERAL"
          baseFare={1245}
          route={{
            from: { code: 'PUNE', name: 'Pune Junction' },
            to: { code: 'CSMT', name: 'Mumbai CSMT' },
          }}
          holds={[hold]}
          onBooked={onBooked}
          onHoldsInvalid={onHoldsInvalid}
          {...overrides}
        />
      </MemoryRouter>
    </AppProviders>,
  )
  return { onBooked, onHoldsInvalid, onOpenChange }
}

beforeEach(() => {
  queryClient.clear()
  vi.mocked(createBooking).mockReset()
  vi.mocked(createBooking).mockResolvedValue(booking())
})

describe('booking flow', () => {
  it('validates passenger details before the review', async () => {
    const user = userEvent.setup()
    renderFlow()

    expect(screen.getByRole('dialog', { name: 'Passenger details' })).toBeVisible()
    expect(screen.getByLabelText('Contact email')).toHaveValue('asha@example.com')

    await user.click(screen.getByRole('button', { name: 'Review booking' }))

    expect(screen.getByText('Enter an age between 1 and 120.')).toBeVisible()
    expect(screen.getByText('Select a gender.')).toBeVisible()
    expect(createBooking).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Passenger details' })).toBeVisible()

    await user.type(screen.getByLabelText('Age'), '34')
    await user.selectOptions(screen.getByLabelText('Gender'), 'FEMALE')
    await user.click(screen.getByRole('button', { name: 'Review booking' }))

    expect(await screen.findByRole('dialog', { name: 'Review your booking' })).toBeVisible()
    expect(screen.getByText('Base fare (₹1,245 × 1)')).toBeVisible()
    expect(screen.getByText('₹1,370')).toBeVisible()
  })

  it('confirms a booking through the payment checkout and shows the PNR', async () => {
    const user = userEvent.setup()
    const { onBooked } = renderFlow()

    // Fill passenger details and reach the review step
    await user.type(screen.getByLabelText('Age'), '34')
    await user.selectOptions(screen.getByLabelText('Gender'), 'FEMALE')
    await user.click(screen.getByRole('button', { name: 'Review booking' }))
    await screen.findByRole('dialog', { name: 'Review your booking' })

    // Pay Now opens the checkout over the booking dialog
    await user.click(screen.getByRole('button', { name: 'Pay Now' }))
    const checkout = await screen.findByRole('dialog', {
      name: 'Payment for Deccan Queen · 12123',
    })
    expect(within(checkout).getByText('Choose payment method')).toBeVisible()
    expect(within(checkout).getAllByText('₹1,370.25').length).toBeGreaterThan(0)

    // Google Pay sheet → pay, then the biometric confirmation runs on its own
    await user.click(within(checkout).getByRole('button', { name: /Google Pay/ }))
    await user.click(within(checkout).getByRole('button', { name: 'Pay ₹1,370.25' }))
    expect(await within(checkout).findByText('Verifying your biometrics')).toBeVisible()

    // Payment success screen: amount, transaction id, references, booking
    await within(checkout).findByText('Payment successful', {}, { timeout: 20000 })
    expect(within(checkout).getAllByText('₹1,370.25').length).toBeGreaterThan(0)
    expect(within(checkout).getByText(/^txn_gp/)).toBeVisible()
    expect(within(checkout).getByText('1234567890')).toBeVisible()
    expect(within(checkout).getByText('Transaction successful')).toBeVisible()
    expect(within(checkout).getByRole('button', { name: /Download receipt/ })).toBeVisible()
    expect(
      within(checkout).getByRole('button', { name: /View booking details/ }),
    ).toBeVisible()

    // The booking itself is created with the review payload
    await waitFor(() => expect(createBooking).toHaveBeenCalledTimes(1), { timeout: 5000 })
    expect(createBooking).toHaveBeenCalledWith({
      trainNumber: '12123',
      date: travelDate,
      from: 'PUNE',
      to: 'CSMT',
      classCode: '3A',
      quota: 'GENERAL',
      passengers: [{ name: 'Asha Verma', age: 34, gender: 'FEMALE' }],
      holdIds: [42],
      contactEmail: 'asha@example.com',
      contactMobile: undefined,
    })
    expect(onBooked).toHaveBeenCalledWith(expect.objectContaining({ pnr: '1234567890' }))

    // Leaving the checkout reveals the existing e-ticket step, untouched
    await user.click(within(checkout).getByRole('button', { name: /See your e-ticket/ }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Passenger details' })).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('link', { name: 'View journey' })).toHaveAttribute(
      'href',
      '/app/journeys/70',
    )
  }, 30000)

  it('sends expired holds back to the seat map', async () => {
    const user = userEvent.setup()
    vi.mocked(createBooking).mockRejectedValue(
      Object.assign(new Error('expired'), {
        response: {
          status: 409,
          data: { code: 'HOLD_EXPIRED', message: 'Your seat hold expired. Select the seats again.' },
        },
      }),
    )
    const { onHoldsInvalid } = renderFlow()

    await user.type(screen.getByLabelText('Age'), '34')
    await user.selectOptions(screen.getByLabelText('Gender'), 'FEMALE')
    await user.click(screen.getByRole('button', { name: 'Review booking' }))
    await user.click(await screen.findByRole('button', { name: 'Pay Now' }))

    const checkout = await screen.findByRole('dialog', {
      name: 'Payment for Deccan Queen · 12123',
    })
    await user.click(within(checkout).getByRole('button', { name: /Google Pay/ }))
    await user.click(within(checkout).getByRole('button', { name: 'Pay ₹1,370.25' }))

    // The failed booking is reported and the checkout hands control back
    await waitFor(() =>
      expect(onHoldsInvalid).toHaveBeenCalledWith('Your seat hold expired. Select the seats again.'),
      { timeout: 20000 },
    )
    expect(screen.queryByText('Payment successful')).not.toBeInTheDocument()
  }, 30000)

  it('keeps the checkout open and shows the error when the booking fails', async () => {
    const user = userEvent.setup()
    vi.mocked(createBooking).mockRejectedValue(
      Object.assign(new Error('changed'), {
        response: {
          status: 400,
          data: { message: 'Seat availability changed. Please re-check.' },
        },
      }),
    )
    renderFlow()

    await user.type(screen.getByLabelText('Age'), '34')
    await user.selectOptions(screen.getByLabelText('Gender'), 'FEMALE')
    await user.click(screen.getByRole('button', { name: 'Review booking' }))
    await user.click(await screen.findByRole('button', { name: 'Pay Now' }))

    const checkout = await screen.findByRole('dialog', {
      name: 'Payment for Deccan Queen · 12123',
    })
    await user.click(within(checkout).getByRole('button', { name: /QR Code/ }))
    await user.click(within(checkout).getByRole('button', { name: 'I have completed the payment' }))

    expect(
      await within(checkout).findByText('Seat availability changed. Please re-check.', {}, {
        timeout: 20000,
      }),
    ).toBeVisible()
    // The failed debit leaves no payment receipt behind
    expect(within(checkout).queryByText('Payment successful')).not.toBeInTheDocument()
    // Back on the QR screen, ready to try again
    expect(
      within(checkout).getByRole('button', { name: 'I have completed the payment' }),
    ).toBeVisible()
  }, 30000)
})

describe('payment methods', () => {
  /** Drive one method from the checkout picker to the payment success screen. */
  async function payWith(
    user: ReturnType<typeof userEvent.setup>,
    tile: RegExp,
    idPrefix: RegExp,
    authorize: (checkout: HTMLElement) => Promise<void>,
  ) {
    renderFlow()
    await user.type(screen.getByLabelText('Age'), '34')
    await user.selectOptions(screen.getByLabelText('Gender'), 'FEMALE')
    await user.click(screen.getByRole('button', { name: 'Review booking' }))
    await user.click(await screen.findByRole('button', { name: 'Pay Now' }))

    const checkout = await screen.findByRole('dialog', {
      name: 'Payment for Deccan Queen · 12123',
    })
    await user.click(within(checkout).getByRole('button', { name: tile }))
    await authorize(checkout)

    await within(checkout).findByText('Payment successful', {}, { timeout: 25000 })
    expect(within(checkout).getByText('Transaction successful')).toBeVisible()
    expect(within(checkout).getByText(idPrefix)).toBeVisible()
    expect(within(checkout).getByText('1234567890')).toBeVisible()
    await waitFor(() => expect(createBooking).toHaveBeenCalledTimes(1), { timeout: 5000 })
  }

  it('runs Google Pay', async () => {
    const user = userEvent.setup()
    await payWith(user, /Google Pay/, /^txn_gp[0-9a-f]{12}$/, async (checkout) => {
      await user.click(within(checkout).getByRole('button', { name: 'Pay ₹1,370.25' }))
    })
  }, 40000)

  it('runs PhonePe with its PIN pad', async () => {
    const user = userEvent.setup()
    await payWith(user, /PhonePe/, /^pp[0-9a-f]{12}$/, async (checkout) => {
      await user.click(within(checkout).getByRole('button', { name: 'Pay ₹1,370.25' }))
      for (const digit of ['1', '2', '3', '4', '5', '6']) {
        await user.click(within(checkout).getByRole('button', { name: digit }))
      }
      await user.click(within(checkout).getByRole('button', { name: 'Pay ₹1,370.25' }))
    })
  }, 40000)

  it('runs Paytm with its OTP step', async () => {
    const user = userEvent.setup()
    await payWith(user, /Paytm/, /^paytm[0-9a-f]{12}$/, async (checkout) => {
      await user.click(within(checkout).getByRole('button', { name: 'Pay ₹1,370.25' }))
      await user.type(within(checkout).getByLabelText('Paytm OTP digit 1'), '123456')
      await user.click(within(checkout).getByRole('button', { name: /Verify & Pay/ }))
    })
  }, 40000)

  it('runs a generic UPI collect request', async () => {
    const user = userEvent.setup()
    await payWith(user, /Other UPI/, /^upi[0-9a-f]{12}$/, async (checkout) => {
      await user.type(within(checkout).getByLabelText('UPI ID / VPA'), 'asha@okhdfcbank')
      await user.click(within(checkout).getByRole('button', { name: /Request ₹1,370.25/ }))
      expect(
        await within(checkout).findByText(/Waiting for asha@okhdfcbank to approve/),
      ).toBeVisible()
      await user.click(within(checkout).getByRole('button', { name: /Approve payment/ }))
    })
  }, 40000)

  it('runs the UPI QR screen', async () => {
    const user = userEvent.setup()
    await payWith(user, /QR Code/, /^qr[0-9a-f]{12}$/, async (checkout) => {
      expect(within(checkout).getByText(/^upi:\/\/pay\?/)).toBeVisible()
      await user.click(
        within(checkout).getByRole('button', { name: 'I have completed the payment' }),
      )
    })
  }, 40000)

  it('runs a card with 3-D Secure', async () => {
    const user = userEvent.setup()
    await payWith(user, /Debit \/ Credit Card/, /^cc[0-9a-f]{12}$/, async (checkout) => {
      await user.click(within(checkout).getByRole('button', { name: /Autofill card details/ }))
      await user.click(within(checkout).getByRole('button', { name: /Pay ₹1,370.25 securely/ }))
      await user.type(within(checkout).getByLabelText('3-D Secure OTP digit 1'), '123456')
      await user.click(within(checkout).getByRole('button', { name: /Authenticate & Pay/ }))
    })
  }, 40000)

  it('runs net banking through the bank portal', async () => {
    const user = userEvent.setup()
    await payWith(user, /Net Banking/, /^nb[0-9a-f]{12}$/, async (checkout) => {
      await user.click(within(checkout).getByRole('button', { name: /State Bank of India/ }))
      await user.click(within(checkout).getByRole('button', { name: /Use saved credentials/ }))
      await user.click(within(checkout).getByRole('button', { name: /Sign in to State Bank of India/ }))
      await user.click(
        within(checkout).getByRole('button', { name: 'Confirm payment of ₹1,370.25' }),
      )
    })
  }, 40000)
})
