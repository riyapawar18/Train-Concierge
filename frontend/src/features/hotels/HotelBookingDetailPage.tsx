import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  BedDouble,
  Calendar,
  Hotel,
  Phone,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { normalizeApiError } from '@/lib/apiClient'
import { getHotelBooking, cancelHotelBooking, getHotelPolicy } from './api'
import { bookingStatusLabel, bookingStatusTone, formatCurrency } from './constants'
import { StayFlexibilityPanel } from './components/StayFlexibilityPanel'
import { VerdictCard } from './components/VerdictCard'

export function HotelBookingDetailPage() {
  const { id } = useParams()
  const bookingId = Number(id)
  const qc = useQueryClient()

  const bookingQuery = useQuery({
    queryKey: ['hotel-booking', bookingId],
    queryFn: () => getHotelBooking(bookingId),
    enabled: Boolean(bookingId),
  })

  const b = bookingQuery.data

  const policyQuery = useQuery({
    queryKey: ['hotel-policy', b?.hotelId],
    queryFn: () => getHotelPolicy(b!.hotelId),
    enabled: Boolean(b?.hotelId),
  })

  async function handleCancel() {
    if (!b) return
    if (!window.confirm('Cancel this stay?')) return
    try {
      await cancelHotelBooking(b.id)
      void qc.invalidateQueries({ queryKey: ['hotel-bookings'] })
      void qc.invalidateQueries({ queryKey: ['hotel-booking', bookingId] })
    } catch {
      /* show error */
    }
  }

  if (!bookingId) {
    return <EmptyState title="Stay not found" description="Invalid stay link." />
  }

  if (bookingQuery.isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-surface" />
        <div className="h-64 animate-pulse rounded-xl bg-surface" />
      </div>
    )
  }

  if (bookingQuery.isError) {
    const err = normalizeApiError(bookingQuery.error)
    if (err.status === 404) {
      return (
        <EmptyState
          title="Stay not found"
          description="This stay does not exist or belongs to another account."
          action={
            <Button asChild variant="outline">
              <Link to="/app/hotels">Back to Hotels</Link>
            </Button>
          }
        />
      )
    }
    return (
      <ErrorState
        title="Could not load stay"
        description={err.message}
        onRetry={() => void bookingQuery.refetch()}
      />
    )
  }

  if (!b) return null

  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/app/hotels"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-brand-navy hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Hotels
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-text">
              {b.hotelName ?? 'Hotel stay'}
            </h1>
            {b.manualEntry && (
              <Badge tone="neutral">Added by you</Badge>
            )}
            <Badge tone={bookingStatusTone(b.status)}>
              {bookingStatusLabel(b.status)}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            Booked {new Date(b.createdAt).toLocaleDateString('en-IN')}
          </p>
        </div>
        {b.status !== 'CANCELLED' && (
          <Button
            variant="ghost"
            size="sm"
            className="text-danger hover:bg-danger-soft"
            onClick={() => void handleCancel()}
          >
            Cancel stay
          </Button>
        )}
      </header>

      {/* Hotel impact verdict — answer comes first */}
      {b.impact && (
        <VerdictCard
          bookingId={b.id}
          hotelPhone={b.hotelPhone}
          impact={b.impact}
        />
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hotel className="size-4 text-brand-navy" aria-hidden="true" />
              Stay details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Hotel</dt>
                <dd className="font-medium text-text">{b.hotelName}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="flex items-center gap-1 text-muted">
                  <BedDouble className="size-3.5" aria-hidden="true" />
                  Room
                </dt>
                <dd className="text-text">
                  {b.roomNo ?? '—'}{b.roomType ? ` · ${b.roomType}` : ''}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="flex items-center gap-1 text-muted">
                  <Calendar className="size-3.5" aria-hidden="true" />
                  Check-in
                </dt>
                <dd className="text-text">{b.checkInDate} at {b.checkInTime}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="flex items-center gap-1 text-muted">
                  <Calendar className="size-3.5" aria-hidden="true" />
                  Check-out
                </dt>
                <dd className="text-text">{b.checkOutDate} at {b.checkOutTime}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Guests</dt>
                <dd className="text-text">{b.guests}</dd>
              </div>
              {b.totalPrice > 0 && (
                <div className="flex justify-between gap-2 border-t border-border pt-1 font-semibold">
                  <dt className="text-text">Total paid</dt>
                  <dd className="text-text">{formatCurrency(b.totalPrice)}</dd>
                </div>
              )}
              {b.lateArrivalCutoff && (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">Late arrival cutoff</dt>
                  <dd className="font-medium text-text">{b.lateArrivalCutoff}</dd>
                </div>
              )}
            </dl>
            {b.hotelPhone && (
              <Button asChild size="sm" variant="outline" className="mt-3">
                <a href={`tel:${b.hotelPhone}`}>
                  <Phone className="size-3.5" aria-hidden="true" />
                  Call hotel
                </a>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Stay flexibility rules */}
        {policyQuery.data && !b.manualEntry && (
          <Card>
            <CardHeader>
              <CardTitle>Stay rules</CardTitle>
            </CardHeader>
            <CardContent>
              <StayFlexibilityPanel policy={policyQuery.data} />
            </CardContent>
          </Card>
        )}

        {/* Manual entry note */}
        {b.manualEntry && (
          <Card>
            <CardHeader>
              <CardTitle>Stay rules</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted">
                This stay was added manually. The rules shown are what you entered.
                {b.lateArrivalCutoff && (
                  <span> Late arrival cutoff: {b.lateArrivalCutoff}.</span>
                )}
              </p>
              {b.notes && <p className="mt-2 text-sm text-text">{b.notes}</p>}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Extension requests */}
      {b.extensionRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Extension requests</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {b.extensionRequests.map((ext) => (
                <li
                  key={ext.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-medium text-text capitalize">
                      {ext.type.replace('_', ' ').toLowerCase()}
                    </span>
                    {ext.responseNote && (
                      <span className="ml-2 text-muted">— {ext.responseNote}</span>
                    )}
                  </div>
                  <Badge
                    tone={
                      ext.status === 'APPROVED'
                        ? 'success'
                        : ext.status === 'DECLINED'
                          ? 'danger'
                          : 'neutral'
                    }
                  >
                    {ext.status.toLowerCase()}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
