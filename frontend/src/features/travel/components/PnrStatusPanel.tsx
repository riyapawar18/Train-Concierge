import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowRight, Ticket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { StatusBadge } from '@/components/StatusBadge'
import { normalizeApiError } from '@/lib/apiClient'
import { formatFare, quotaName } from '@/features/travel/constants'
import { formatLongDate } from '@/features/travel/date'
import { getBookingByPnr } from '@/features/journeys/api'
import { formatTimeRange, genderLabel } from '@/features/journeys/format'

function PnrStatusPanel() {
  const [pnr, setPnr] = useState('')
  const [checked, setChecked] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const booking = useQuery({
    queryKey: ['booking', checked],
    queryFn: () => getBookingByPnr(checked ?? ''),
    enabled: checked !== null,
    retry: false,
  })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = pnr.trim()
    if (!/^\d{10}$/.test(value)) {
      setError('Enter the 10-digit PNR number.')
      setChecked(null)
      return
    }
    setError(null)
    setChecked(value)
  }

  const notFound =
    booking.isError && normalizeApiError(booking.error).status === 404

  return (
    <div className="flex flex-col gap-4">
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Input
          id="pnr-number"
          label="PNR number"
          description="The 10-digit number printed on your ticket."
          placeholder="1234567890"
          inputMode="numeric"
          maxLength={10}
          value={pnr}
          error={error ?? undefined}
          onChange={(event) => {
            setPnr(event.target.value.replace(/\D/g, '').slice(0, 10))
            setError(null)
            setChecked(null)
          }}
          className="max-w-sm"
        />
        <Button type="submit" variant="cta" className="sm:mb-0.5">
          <Ticket aria-hidden="true" />
          Check PNR
        </Button>
      </form>

      {checked === null ? (
        <p className="text-xs text-muted">
          Look up a booking made from this account. PNRs belonging to other passengers are not
          shown.
        </p>
      ) : booking.isLoading ? (
        <div className="h-40 animate-pulse rounded-xl bg-surface" aria-label="Loading booking" />
      ) : notFound ? (
        <EmptyState
          icon={Ticket}
          title={`No booking found for ${checked}`}
          description="Check the PNR printed on your ticket. Only bookings made from this account can be looked up."
        />
      ) : booking.isError ? (
        <ErrorState
          description={normalizeApiError(booking.error).message}
          onRetry={() => void booking.refetch()}
        />
      ) : booking.data ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <span className="font-mono tracking-wider">{booking.data.pnr}</span>
              </CardTitle>
              <StatusBadge status={booking.data.status} />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div>
              <p className="font-semibold text-text">
                {booking.data.trainName}{' '}
                <span className="font-normal text-muted">· {booking.data.trainNumber}</span>
              </p>
              <p className="mt-1 text-muted">
                {booking.data.from.name} ({booking.data.from.code}) → {booking.data.to.name} (
                {booking.data.to.code})
              </p>
              <p className="text-muted">
                {formatLongDate(booking.data.travelDate)} ·{' '}
                {formatTimeRange(booking.data.boardingTime, booking.data.arrivalTime)} ·{' '}
                {booking.data.className} ({booking.data.classCode}) ·{' '}
                {quotaName(booking.data.quota)}
              </p>
            </div>

            <ul className="divide-y divide-border">
              {booking.data.passengers.map((passenger) => (
                <li
                  key={passenger.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-1.5"
                >
                  <span>
                    <span className="font-medium text-text">{passenger.name}</span>
                    <span className="text-xs text-muted">
                      {' '}
                      · {genderLabel(passenger.gender)} · {passenger.age} yrs
                    </span>
                  </span>
                  <span className="rounded-md bg-surface-muted px-2 py-0.5 text-xs font-medium text-text">
                    {passenger.seatLabel}
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
              <p className="text-muted">
                Total fare{' '}
                <span className="font-semibold text-text">
                  {formatFare(booking.data.fare.totalFare)}
                </span>
              </p>
              {booking.data.journeyId ? (
                <Button asChild size="sm" variant="outline">
                  <Link to={`/app/journeys/${booking.data.journeyId}`}>
                    View journey
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

export { PnrStatusPanel }
