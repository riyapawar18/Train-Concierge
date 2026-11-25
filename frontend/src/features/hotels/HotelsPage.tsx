import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { BedDouble, Hotel, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { normalizeApiError } from '@/lib/apiClient'
import { getHotels, getMyHotelBookings } from './api'
import { HotelCard } from './components/HotelCard'
import { HotelBookingCard } from './components/HotelBookingCard'
import { getJourneys } from '@/features/journeys/api'

/**
 * Hotels & Stay Recovery page.
 *
 * Always shows two sections:
 * 1. "Your stays" — booked stays with verdict cards, or an empty state.
 * 2. "Suggested stays" — always populated, defaulting to the destination of the
 *    passenger's next upcoming journey (or CSMT as a fallback).
 *
 * Never renders blank because of a missing disruption or empty booking list.
 */
export function HotelsPage() {
  const [urlParams] = useSearchParams()
  const stationFromUrl = urlParams.get('station') ?? ''

  // Derive the default station from the next upcoming journey destination
  const journeys = useQuery({
    queryKey: ['journeys-summary'],
    queryFn: () => getJourneys({ status: 'UPCOMING', size: 3 }),
  })

  const defaultStation = (() => {
    if (stationFromUrl) return stationFromUrl.toUpperCase()
    const items = journeys.data?.items
    if (items && items.length > 0 && items[0]?.to?.code) return items[0].to.code
    return 'CSMT' // sensible fallback
  })()

  const [searchInput, setSearchInput] = useState('')
  const [searchStation, setSearchStation] = useState<string | null>(null)

  // The effective station to query: explicit search > url param > derived default
  const effectiveStation = searchStation ?? defaultStation

  const myBookings = useQuery({
    queryKey: ['hotel-bookings'],
    queryFn: getMyHotelBookings,
  })

  const suggestedHotels = useQuery({
    queryKey: ['hotels', effectiveStation],
    queryFn: () => getHotels({ station: effectiveStation }),
    enabled: effectiveStation.length >= 2,
  })

  const activeBookings = (myBookings.data ?? []).filter(b => b.status !== 'CANCELLED')
  const atRiskBooking = activeBookings.find(b => b.status === 'AT_RISK' || b.status === 'LATE_ARRIVAL_NOTED')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const s = searchInput.trim().toUpperCase()
    if (s.length >= 2) setSearchStation(s)
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-text">Hotels &amp; Stay Recovery</h1>
        <p className="mt-1 text-sm text-muted">
          Manage your stays and find options when a delay threatens your check-in.
        </p>
      </header>

      {/* ── Your stays ───────────────────────────────────────────────────── */}
      <section aria-label="Your stays">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-medium text-text">Your stays</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {/* TODO: manual entry dialog */}}
          >
            <Plus className="size-3.5" aria-hidden="true" />
            Add my existing stay
          </Button>
        </div>

        {myBookings.isLoading && (
          <div className="flex flex-col gap-3">
            {[1, 2].map(n => (
              <div key={n} className="h-40 animate-pulse rounded-xl bg-surface" />
            ))}
          </div>
        )}

        {myBookings.isError && (
          <ErrorState
            title="Could not load your stays"
            description={normalizeApiError(myBookings.error).message}
            onRetry={() => void myBookings.refetch()}
          />
        )}

        {!myBookings.isLoading && !myBookings.isError && activeBookings.length === 0 && (
          <EmptyState
            icon={BedDouble}
            title="No stays booked yet"
            description="Find a hotel near your destination below, or add a stay you booked elsewhere."
            action={
              <Button size="sm" variant="cta" onClick={() => {
                setSearchInput(defaultStation)
                setSearchStation(defaultStation)
              }}>
                Find a stay
              </Button>
            }
          />
        )}

        {activeBookings.length > 0 && (
          <div className="flex flex-col gap-3">
            {activeBookings.map(b => (
              <HotelBookingCard key={b.id} booking={b} stationCode={effectiveStation} />
            ))}
          </div>
        )}
      </section>

      {/* ── Suggested stays ──────────────────────────────────────────────── */}
      <section aria-label="Suggested stays">
        <h2 className="mb-3 text-base font-medium text-text">Suggested stays</h2>

        {/* At-risk banner */}
        {atRiskBooking?.impact && (
          <div className="mb-4 rounded-xl border border-danger bg-danger-soft p-3 text-sm text-danger">
            <p className="font-medium">Stay at risk</p>
            <p className="mt-1">{atRiskBooking.impact.summary}</p>
          </div>
        )}

        {/* Station search bar */}
        <form
          onSubmit={handleSearch}
          className="mb-4 flex gap-2"
          aria-label="Search hotels by station"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              type="text"
              placeholder="Station code, e.g. CSMT"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-white py-2 pr-3 pl-9 text-sm text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-brand-navy"
              aria-label="Station code"
            />
          </div>
          <Button type="submit" size="sm" variant="cta">
            <Search className="size-3.5" aria-hidden="true" />
            Search
          </Button>
        </form>

        {/* Current station label */}
        <p className="mb-3 text-xs text-muted">
          Showing hotels near <span className="font-medium text-text">{effectiveStation}</span>
          {!searchStation && (journeys.data?.items?.length ?? 0) > 0 && (
            <span> (your next destination)</span>
          )}
        </p>

        {suggestedHotels.isLoading && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(n => (
              <div key={n} className="h-64 animate-pulse rounded-xl bg-surface" />
            ))}
          </div>
        )}

        {suggestedHotels.isError && (
          <ErrorState
            title="Could not load hotels"
            description={normalizeApiError(suggestedHotels.error).message}
            onRetry={() => void suggestedHotels.refetch()}
          />
        )}

        {!suggestedHotels.isLoading && !suggestedHotels.isError && (suggestedHotels.data?.length ?? 0) === 0 && (
          <EmptyState
            icon={Hotel}
            title="No hotels found"
            description={`No hotels near station ${effectiveStation}. Try a different station code.`}
          />
        )}

        {(suggestedHotels.data?.length ?? 0) > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {suggestedHotels.data!.map(hotel => (
              <HotelCard key={hotel.id} hotel={hotel} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
