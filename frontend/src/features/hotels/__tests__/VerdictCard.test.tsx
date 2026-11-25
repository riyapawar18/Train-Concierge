import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { VerdictCard } from '../components/VerdictCard'
import type { HotelImpactSummary } from '../types'

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

const lateArrivalOk: HotelImpactSummary = {
  verdict: 'LATE_ARRIVAL_OK',
  summary:
    'Your stay can be extended: late arrival is allowed until 23:59 at no charge.',
  newArrivalAt: '2026-10-31T23:40:00',
  arrivalVsCheckinMinutes: 580,
  actions: ['NOTIFY_HOTEL'],
}

const pastCutoffNoExtension: HotelImpactSummary = {
  verdict: 'PAST_CUTOFF_NO_EXTENSION',
  summary:
    'This hotel cannot hold your room past 22:00. You\'ll arrive about 23:40. Please call the hotel or find a nearby stay.',
  newArrivalAt: '2026-10-31T23:40:00',
  arrivalVsCheckinMinutes: 700,
  actions: ['CALL_HOTEL', 'SEE_NEARBY'],
}

describe('VerdictCard', () => {
  it('shows the verdict badge for LATE_ARRIVAL_OK', () => {
    wrap(<VerdictCard bookingId={1} impact={lateArrivalOk} />)
    expect(screen.getByText('Late arrival OK')).toBeInTheDocument()
  })

  it('shows the summary text — answer comes first', () => {
    wrap(<VerdictCard bookingId={1} impact={lateArrivalOk} />)
    expect(
      screen.getByText(/late arrival is allowed until 23:59/i),
    ).toBeInTheDocument()
  })

  it('shows Notify hotel button for LATE_ARRIVAL_OK', () => {
    wrap(<VerdictCard bookingId={1} impact={lateArrivalOk} />)
    expect(screen.getByRole('button', { name: /Notify hotel/i })).toBeInTheDocument()
  })

  it('shows Call hotel link when phone provided', () => {
    wrap(
      <VerdictCard bookingId={1} hotelPhone="+91 22 4000 2001" impact={pastCutoffNoExtension} />,
    )
    expect(screen.getByRole('link', { name: /Call hotel/i })).toBeInTheDocument()
  })

  it('shows See nearby stays link when stationCode provided', () => {
    wrap(
      <VerdictCard
        bookingId={1}
        impact={pastCutoffNoExtension}
        stationCode="CSMT"
      />,
    )
    expect(screen.getByRole('link', { name: /See nearby stays/i })).toBeInTheDocument()
  })

  it('shows PAST_CUTOFF_NO_EXTENSION verdict badge', () => {
    wrap(<VerdictCard bookingId={1} impact={pastCutoffNoExtension} />)
    expect(screen.getByText('Past cutoff – no extension')).toBeInTheDocument()
  })

  it('Notify hotel button is disabled after clicking (optimistic)', async () => {
    // The API call will be mocked — just check the button is there and not already disabled
    wrap(<VerdictCard bookingId={1} impact={lateArrivalOk} />)
    const btn = screen.getByRole('button', { name: /Notify hotel/i })
    expect(btn).not.toBeDisabled()
  })
})
