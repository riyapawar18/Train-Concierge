import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  BedDouble,
  Download,
  Hotel,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  TriangleAlert,
  UserRound,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { StatusBadge } from '@/components/StatusBadge'
import { normalizeApiError } from '@/lib/apiClient'
import { cn } from '@/lib/utils'
import { getCoaches } from '@/features/travel/api'
import { formatFare, quotaName } from '@/features/travel/constants'
import { formatLongDate } from '@/features/travel/date'
import { getJourney } from '@/features/journeys/api'
import { getJourneyImpact } from '@/features/disruptions/api'
import { impactMeta } from '@/features/disruptions/constants'
import { canCancelJourney, canEditJourney } from '@/features/journeys/constants'
import { formatClock, formatDayTime, genderLabel } from '@/features/journeys/format'
import { CancelJourneyDialog, type CancelTarget } from '@/features/journeys/components/CancelJourneyDialog'
import { CoachSeatDiagram } from '@/features/journeys/components/CoachSeatDiagram'
import { EditJourneyDialog } from '@/features/journeys/components/EditJourneyDialog'
import { getJourneyHotelImpact } from '@/features/hotels/api'
import { VerdictCard } from '@/features/hotels/components/VerdictCard'
import { downloadTicket, buildWhatsAppUrl } from '@/features/journeys/ticketDownload'

function JourneyDetailPage() {
  const { id } = useParams()
  const journeyId = Number(id)
  const validId = Number.isInteger(journeyId) && journeyId > 0
  const [searchParams, setSearchParams] = useSearchParams()
  const [cancelTarget, setCancelTarget] = useState<CancelTarget | null>(null)

  const journey = useQuery({
    queryKey: ['journey', journeyId],
    queryFn: () => getJourney(journeyId),
    enabled: validId,
  })

  const editParam = searchParams.get('edit') === '1'
  const editOpen = editParam && journey.data !== undefined

  const closeEdit = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('edit')
    setSearchParams(next, { replace: true })
  }

  const detail = journey.data

  const coaches = useQuery({
    queryKey: ['coaches', detail?.trainNumber, detail?.travelDate, detail?.classCode],
    queryFn: () => getCoaches(detail?.trainNumber ?? '', detail?.travelDate ?? '', detail?.classCode ?? ''),
    enabled: Boolean(detail),
  })

  const disruptionImpact = useQuery({
    queryKey: ['journey-impact', detail?.id],
    queryFn: () => getJourneyImpact(detail?.id ?? 0),
    enabled: Boolean(detail?.disruption),
  })

  const hotelImpact = useQuery({
    queryKey: ['journey-hotel-impact', detail?.id],
    queryFn: () => getJourneyHotelImpact(detail?.id ?? 0),
    enabled: Boolean(detail?.id),
  })

  const diagrams = useMemo(() => {
    if (!detail) {
      return []
    }
    const byCoach = new Map<string, number[]>()
    for (const passenger of detail.passengers) {
      if (!passenger.coachNo || passenger.seatNo == null) {
        continue
      }
      const seats = byCoach.get(passenger.coachNo) ?? []
      seats.push(passenger.seatNo)
      byCoach.set(passenger.coachNo, seats)
    }
    return [...byCoach.entries()].flatMap(([coachNo, seats]) => {
      const coach = coaches.data?.coaches.find((item) => item.coachNo === coachNo)
      return coach ? [{ coachNo, seats, total: coach.total, layout: coach.layout }] : []
    })
  }, [detail, coaches.data])

  if (!validId) {
    return (
      <EmptyState
        title="Journey not found"
        description="This journey does not exist or belongs to another account."
        action={
          <Button asChild variant="outline">
            <Link to="/app/journeys">Back to My Journeys</Link>
          </Button>
        }
      />
    )
  }

  if (journey.isLoading) {
    return (
      <div className="flex flex-col gap-3" aria-label="Loading journey">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-surface" />
        <div className="h-48 animate-pulse rounded-xl bg-surface" />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="h-40 animate-pulse rounded-xl bg-surface" />
          <div className="h-40 animate-pulse rounded-xl bg-surface" />
        </div>
      </div>
    )
  }

  if (journey.isError) {
    const normalized = normalizeApiError(journey.error)
    if (normalized.status === 404) {
      return (
        <EmptyState
          title="Journey not found"
          description="This journey does not exist or belongs to another account."
          action={
            <Button asChild variant="outline">
              <Link to="/app/journeys">Back to My Journeys</Link>
            </Button>
          }
        />
      )
    }
    return (
      <ErrorState
        title="We could not load this journey"
        description={normalized.message}
        onRetry={() => void journey.refetch()}
      />
    )
  }

  if (!detail) {
    return null
  }

  const title = detail.title ?? `${detail.trainName} to ${detail.to.name}`

  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/app/journeys"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-brand-navy hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to My Journeys
      </Link>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-text">{title}</h1>
            <StatusBadge status={detail.status} />
          </div>
          <p className="mt-1 text-sm text-muted">
            PNR <span className="font-mono font-medium text-text">{detail.pnr}</span> ·{' '}
            {detail.trainName} · {formatLongDate(detail.travelDate)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEditJourney(detail.status) ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const next = new URLSearchParams(searchParams)
                next.set('edit', '1')
                setSearchParams(next, { replace: true })
              }}
            >
              <Pencil aria-hidden="true" />
              Edit
            </Button>
          ) : null}
          {/* Ticket download */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              downloadTicket({
                pnr: detail.pnr,
                trainNumber: detail.trainNumber,
                trainName: detail.trainName,
                travelDate: detail.travelDate,
                boardingTime: detail.boardingTime,
                arrivalTime: detail.arrivalTime,
                fromCode: detail.from.code,
                fromName: detail.from.name,
                toCode: detail.to.code,
                toName: detail.to.name,
                classCode: detail.classCode,
                className: detail.className,
                quota: detail.quota,
                passengers: detail.passengers.map(p => ({
                  name: p.name,
                  age: p.age,
                  gender: p.gender,
                  seatLabel: p.seatLabel,
                  berthType: p.berthType,
                  coachNo: p.coachNo,
                })),
                fare: detail.fare,
                contactMobile: detail.contactMobile,
                contactEmail: detail.contactEmail,
              })
            }}
          >
            <Download className="size-3.5" aria-hidden="true" />
            Download ticket
          </Button>
          {/* WhatsApp share */}
          <Button variant="outline" size="sm" asChild>
            <a
              href={buildWhatsAppUrl({
                pnr: detail.pnr,
                trainNumber: detail.trainNumber,
                trainName: detail.trainName,
                travelDate: detail.travelDate,
                boardingTime: detail.boardingTime,
                arrivalTime: detail.arrivalTime,
                fromCode: detail.from.code,
                fromName: detail.from.name,
                toCode: detail.to.code,
                toName: detail.to.name,
                classCode: detail.classCode,
                className: detail.className,
                quota: detail.quota,
                passengers: detail.passengers.map(p => ({
                  name: p.name,
                  age: p.age,
                  gender: p.gender,
                  seatLabel: p.seatLabel,
                })),
                fare: detail.fare,
                contactMobile: detail.contactMobile,
                contactEmail: detail.contactEmail,
              }, detail.contactMobile ?? undefined)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="size-3.5 text-[#25d366]" aria-hidden="true" />
              WhatsApp
            </a>
          </Button>
          {canCancelJourney(detail.status) ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-danger hover:bg-danger-soft"
              onClick={() =>
                setCancelTarget({
                  id: detail.id,
                  pnr: detail.pnr,
                  trainName: detail.trainName,
                  travelDate: detail.travelDate,
                  boardingTime: detail.boardingTime,
                  totalFare: detail.fare.totalFare,
                })
              }
            >
              <XCircle aria-hidden="true" />
              Cancel journey
            </Button>
          ) : null}
        </div>
      </header>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Your route</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-muted px-3 py-2 text-sm">
              <div>
                <p className="font-semibold text-text">
                  {detail.from.name} ({detail.from.code})
                </p>
                <p className="text-xs text-muted">{formatDayTime(detail.boardingTime)}</p>
              </div>
              <div className="text-xs text-muted">
                {detail.className} ({detail.classCode}) · {quotaName(detail.quota)}
              </div>
              <div className="text-right">
                <p className="font-semibold text-text">
                  {detail.to.name} ({detail.to.code})
                </p>
                <p className="text-xs text-muted">{formatDayTime(detail.arrivalTime)}</p>
              </div>
            </div>

            <ol className="mt-4 flex flex-col">
              {detail.route.map((stop, index) => (
                <li key={`${stop.stationCode}-${index}`} className="relative flex gap-3 pb-4 last:pb-0">
                  <span className="relative flex w-3 shrink-0 justify-center">
                    {index < detail.route.length - 1 ? (
                      <span className="absolute top-2 h-full w-px bg-border" aria-hidden="true" />
                    ) : null}
                    <span
                      aria-hidden="true"
                      className={cn(
                        'relative mt-1 size-2.5 rounded-full',
                        stop.boarding || stop.alighting ? 'bg-brand-navy' : 'bg-border',
                      )}
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm">
                        <span className="font-medium text-text">{stop.stationCode}</span>{' '}
                        <span className="text-muted">{stop.stationName}</span>
                      </p>
                      <p className="text-xs tabular-nums text-muted">
                        {stop.arrivalTime ? formatClock(stop.arrivalTime) : '—'} /{' '}
                        {stop.departureTime ? formatClock(stop.departureTime) : '—'}
                      </p>
                    </div>
                    <p className="text-xs text-muted">
                      {stop.distanceKm} km
                      {stop.dayOffset > 0 ? ` · day ${stop.dayOffset + 1}` : ''}
                      {stop.boarding ? ' · Boarding' : ''}
                      {stop.alighting ? ' · Destination' : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3">
          <Card>
            <CardHeader>
              <CardTitle>Passengers</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <ul className="flex flex-col gap-2">
                {detail.passengers.map((passenger) => (
                  <li key={passenger.id} className="flex items-start justify-between gap-2">
                    <span className="flex items-start gap-2">
                      <span className="mt-0.5 grid size-8 place-items-center rounded-full bg-surface-muted text-brand-navy">
                        <UserRound className="size-4" aria-hidden="true" />
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-text">{passenger.name}</span>
                        <span className="block text-xs text-muted">
                          {genderLabel(passenger.gender)} · {passenger.age} yrs
                        </span>
                      </span>
                    </span>
                    <span className="rounded-md bg-surface-muted px-2 py-1 text-xs font-medium text-text">
                      {passenger.seatLabel}
                    </span>
                  </li>
                ))}
              </ul>

              {diagrams.map((diagram) => (
                <CoachSeatDiagram
                  key={diagram.coachNo}
                  coachNo={diagram.coachNo}
                  layout={diagram.layout}
                  total={diagram.total}
                  seatNos={diagram.seats}
                />
              ))}
              {diagrams.length === 0 ? (
                <p className="flex items-center gap-1.5 text-xs text-muted">
                  <BedDouble className="size-3.5" aria-hidden="true" />
                  Coach layout is not available for this booking.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fare</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">Base fare</dt>
                  <dd className="tabular-nums text-text">{formatFare(detail.fare.baseFare)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">Reservation charge</dt>
                  <dd className="tabular-nums text-text">{formatFare(detail.fare.reservationCharge)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">GST (5%)</dt>
                  <dd className="tabular-nums text-text">{formatFare(detail.fare.gst)}</dd>
                </div>
                <div className="flex justify-between gap-2 border-t border-border pt-1 font-semibold">
                  <dt className="text-text">Total paid</dt>
                  <dd className="tabular-nums text-text">{formatFare(detail.fare.totalFare)}</dd>
                </div>
                {detail.refund ? (
                  <div className="mt-2 flex justify-between gap-2 rounded-lg bg-success-soft px-3 py-2 text-success">
                    <dt className="font-medium">
                      {detail.refund.label} ({detail.refund.percent}%)
                    </dt>
                    <dd className="font-semibold tabular-nums">{formatFare(detail.refund.amount)}</dd>
                  </div>
                ) : null}
              </dl>
              {detail.cancelledAt ? (
                <p className="mt-2 text-xs text-muted">
                  Cancelled on {formatDayTime(detail.cancelledAt)}.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      {detail.notes || detail.contactEmail || detail.contactMobile ? (
        <Card>
          <CardHeader>
            <CardTitle>Trip details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {detail.notes ? <p className="text-text">{detail.notes}</p> : null}
            {detail.contactEmail ? (
              <p className="flex items-center gap-2 text-muted">
                <Mail className="size-4" aria-hidden="true" />
                {detail.contactEmail}
              </p>
            ) : null}
            {detail.contactMobile ? (
              <p className="flex items-center gap-2 text-muted">
                <Phone className="size-4" aria-hidden="true" />
                {detail.contactMobile}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {detail.disruption ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TriangleAlert className="size-4 text-danger" aria-hidden="true" />
              Disruption
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-text">{detail.disruption.title}</p>
              <div className="flex flex-wrap items-center gap-2">
                {disruptionImpact.data ? (
                  <Badge tone={impactMeta(disruptionImpact.data.impactLevel).tone}>
                    {impactMeta(disruptionImpact.data.impactLevel).label}
                  </Badge>
                ) : null}
                <Badge tone="danger">{detail.disruption.status}</Badge>
              </div>
            </div>

            {disruptionImpact.isLoading ? (
              <p className="text-muted">Checking what this means for your journey…</p>
            ) : disruptionImpact.data ? (
              <>
                <p className="text-text">{disruptionImpact.data.summary}</p>
                <p className="text-xs text-muted">
                  Original arrival {formatDayTime(disruptionImpact.data.originalArrival)}
                  {disruptionImpact.data.newArrival
                    ? ` · now arriving ${formatDayTime(disruptionImpact.data.newArrival)}`
                    : ''}
                  {disruptionImpact.data.refundNote ? ` · ${disruptionImpact.data.refundNote}` : ''}
                </p>
              </>
            ) : (
              <p className="text-muted">
                We could not load the impact details for this journey.
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="cta">
                <Link to={`/app/recovery?journey=${detail.id}`}>View alternatives</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to={`/app/disruptions/${detail.disruption.id}`}>View update</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {hotelImpact.data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hotel className="size-4 text-brand-navy" aria-hidden="true" />
              Stay
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p className="font-medium text-text">{hotelImpact.data.hotelName}</p>
            <VerdictCard
              bookingId={hotelImpact.data.hotelBookingId}
              impact={{
                verdict: hotelImpact.data.verdict,
                summary: hotelImpact.data.summary,
                newArrivalAt: hotelImpact.data.newArrivalAt,
                arrivalVsCheckinMinutes: hotelImpact.data.arrivalVsCheckinMinutes,
                actions: hotelImpact.data.actions,
              }}
            />
            <Button asChild size="sm" variant="outline" className="w-fit">
              <Link to={`/app/hotels/bookings/${hotelImpact.data.hotelBookingId}`}>
                View stay details
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!hotelImpact.data && detail.hotel ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hotel className="size-4 text-brand-navy" aria-hidden="true" />
              Hotel suggestion
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="font-medium text-text">{detail.hotel.name}</p>
            <p className="text-muted">
              {detail.hotel.city} · {detail.hotel.note}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <p className="flex items-center gap-1.5 text-xs text-muted">
        <MapPin className="size-3.5" aria-hidden="true" />
        Route times are the booked schedule and do not reflect live running status.
      </p>

      <EditJourneyDialog
        journey={detail}
        open={editOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeEdit()
          }
        }}
      />
      <CancelJourneyDialog
        target={cancelTarget}
        onOpenChange={(open) => {
          if (!open) {
            setCancelTarget(null)
          }
        }}
      />
    </div>
  )
}

export { JourneyDetailPage }
