import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders, queryClient } from '@/app/providers'
import { openEventStream } from '@/lib/sse'
import {
  getMyDisruptions,
  getRecommendations,
} from '@/features/disruptions/api'
import { RealtimeProvider } from '../RealtimeProvider'
import { DisruptionModalHost } from '@/layouts/DisruptionModalHost'
import type { PassengerDisruption, Recommendation } from '@/features/disruptions/types'

vi.mock('@/app/SessionProvider', () => ({
  useSession: () => ({
    status: 'authenticated',
    token: 'token-1',
    user: {
      id: 7,
      fullName: 'Asha Verma',
      email: 'asha@example.com',
      role: 'PASSENGER' as const,
    },
    signIn: vi.fn(),
    signOut: vi.fn(),
    refreshSession: vi.fn(),
    abandonSession: vi.fn(),
  }),
}))

vi.mock('@/lib/sse', () => ({
  openEventStream: vi.fn(() => vi.fn()),
}))

vi.mock('@/features/disruptions/api', () => ({
  getMyDisruptions: vi.fn(),
  getRecommendations: vi.fn(),
}))

function disruption(id: number, journeyId: number): PassengerDisruption {
  return {
    id,
    impactId: id * 10,
    journeyId,
    trainNumber: '11007',
    trainName: 'Deccan Express',
    travelDate: '2026-11-01',
    fromCode: 'PUNE',
    fromName: 'Pune',
    toCode: 'CSMT',
    toName: 'Mumbai',
    type: 'DELAY',
    delayMinutes: 195,
    reason: 'Signal failure',
    severity: 'HIGH',
    status: 'ACTIVE',
    impactLevel: 'SEVERE',
    summary: 'Your train 11007 is delayed by 3h 15m.',
    originalArrival: '2026-11-01T19:45',
    newArrival: '2026-11-01T23:00',
    missedConnection: false,
    overnight: false,
    needsHotel: false,
    journeyStatus: 'DISRUPTED',
    createdAt: '2026-10-29T10:00',
  }
}

function recommendation(id: number, recommended = true): Recommendation {
  return {
    id,
    kind: 'TRAIN',
    refTrainNumber: '12123',
    refName: 'Intercity Express',
    refBusTripId: null,
    classCode: '3A',
    className: 'AC 3 Tier',
    fromStation: 'PUNE',
    fromName: 'Pune',
    toStation: 'CSMT',
    toName: 'Mumbai',
    departureAt: '2026-11-01T21:10',
    arrivalAt: '2026-11-01T23:55',
    fare: 1120,
    seatsAvailable: 12,
    score: 82,
    rank: 1,
    recommended,
    reasons: ['Arrives earlier'],
    warnings: [],
    active: true,
  }
}

function renderHost() {
  return render(
    <AppProviders>
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <RealtimeProvider>
          <DisruptionModalHost />
        </RealtimeProvider>
      </MemoryRouter>
    </AppProviders>,
  )
}

function streamOptions() {
  return vi.mocked(openEventStream).mock.calls[0]?.[0]
}

describe('realtime disruption modal', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    queryClient.clear()
    vi.mocked(openEventStream).mockReset()
    vi.mocked(openEventStream).mockReturnValue(vi.fn())
    vi.mocked(getMyDisruptions).mockReset()
    vi.mocked(getMyDisruptions).mockResolvedValue([])
    vi.mocked(getRecommendations).mockReset()
    vi.mocked(getRecommendations).mockResolvedValue([recommendation(9)])
  })

  it('opens an accessible modal with the top recommendation for unacknowledged disruptions', async () => {
    const user = userEvent.setup()
    vi.mocked(getMyDisruptions).mockResolvedValue([disruption(3, 33)])
    renderHost()

    const dialog = await screen.findByRole('alertdialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(withinText(dialog, 'Train 11007 is delayed by 3h 15m')).toBeTruthy()
    expect(screen.getByText('Best option')).toBeInTheDocument()
    expect(screen.getByText(/Intercity Express/)).toBeInTheDocument()
    const book = screen.getByRole('link', { name: /Book this/ })
    expect(book).toHaveAttribute('href', '/app/recovery?journey=33&option=9')
    expect(screen.getByRole('link', { name: /View all options/ })).toHaveAttribute(
      'href',
      '/app/recovery?journey=33',
    )

    await user.click(screen.getByRole('button', { name: 'Dismiss' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })

  it('queues disruptions one at a time and remembers dismissed ones', async () => {
    const user = userEvent.setup()
    const cancellation: PassengerDisruption = {
      ...disruption(4, 44),
      type: 'CANCELLATION',
      delayMinutes: null,
    }
    vi.mocked(getMyDisruptions).mockResolvedValue([disruption(3, 33), cancellation])
    renderHost()

    expect(
      await screen.findByText('Train 11007 is delayed by 3h 15m'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Dismiss' }))

    expect(
      await screen.findByText('Train 11007 has been cancelled'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Dismiss' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(vi.mocked(getMyDisruptions)).toHaveBeenCalledTimes(1)
  })

  it('queues live disruption events and refreshes the unread count', async () => {
    renderHost()
    await waitFor(() => expect(openEventStream).toHaveBeenCalled())
    const options = streamOptions()
    expect(options?.token).toBe('token-1')

    options?.onEvent({ event: 'notification', data: { unreadCount: 4 } })
    options?.onEvent({
      event: 'disruption',
      data: {
        disruptionId: 12,
        journeyId: 21,
        notificationId: 55,
        type: 'DELAY',
        severity: 'MEDIUM',
        title: 'Train 12123 is delayed by 45m',
        body: 'Your journey is delayed.',
        active: true,
        trainNumber: '12123',
        trainName: 'Deccan Queen',
        delayMinutes: 45,
        newArrival: '2026-11-01T23:40',
        linkPath: '/app/recovery?journey=21',
      },
    })

    expect(queryClient.getQueryData(['notifications-unread'])).toEqual({ count: 4 })
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    expect(
      screen.getByText('Train 12123 is delayed by 45m'),
    ).toBeInTheDocument()
    expect(screen.getByText(/New arrival/)).toBeInTheDocument()
  })

  it('closes the stream when the provider unmounts', async () => {
    const close = vi.fn()
    vi.mocked(openEventStream).mockReturnValue(close)
    const view = renderHost()
    await waitFor(() => expect(openEventStream).toHaveBeenCalled())
    view.unmount()
    expect(close).toHaveBeenCalled()
  })
})

function withinText(element: HTMLElement, text: string) {
  return Array.from(element.querySelectorAll('*')).some(
    (node) => node.textContent === text || node.textContent?.includes(text),
  )
}
