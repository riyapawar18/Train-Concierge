import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LoaderCircle, RefreshCw, TimerReset, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { ErrorState } from '@/components/ErrorState'
import { isNormalizedApiError, normalizeApiError } from '@/lib/apiClient'
import { cn } from '@/lib/utils'
import { BookingFlow, type BookingRoute } from '@/features/journeys/components/BookingFlow'
import type { BookingResponse } from '@/features/journeys/types'
import { formatLongDate } from '../date'
import { formatCountdown, LEVEL_BAR } from '../constants'
import {
  createSeatHold,
  getAvailability,
  getCoaches,
  getSeatMap,
  releaseSeatHold,
} from '../api'
import type { QuotaCode, Seat, SeatHold } from '../types'
import { ClassTabs } from './ClassTabs'
import { CoachSelector } from './CoachSelector'
import { SeatLegend } from './SeatLegend'
import { SeatMap } from './SeatMap'

interface SeatSelectionPanelProps {
  trainNumber: string
  trainName: string
  date: string
  initialClass: string
  onClose: () => void
  route?: BookingRoute | null
  baseFare?: number | null
  quota?: QuotaCode
}

function SeatSelectionPanel({
  trainNumber,
  trainName,
  date,
  initialClass,
  onClose,
  route = null,
  baseFare = null,
  quota = 'GENERAL',
}: SeatSelectionPanelProps) {
  const { toast } = useToast()
  const [selectedClass, setSelectedClass] = useState(initialClass)
  const [coachId, setCoachId] = useState<number | null>(null)
  const [passengerCount, setPassengerCount] = useState(1)
  const [holds, setHolds] = useState<SeatHold[]>([])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [expiryNotice, setExpiryNotice] = useState<string | null>(null)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [confirmedPnr, setConfirmedPnr] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const availability = useQuery({
    queryKey: ['availability', trainNumber, date],
    queryFn: () => getAvailability(trainNumber, date),
    refetchInterval: 30_000,
  })

  const coaches = useQuery({
    queryKey: ['coaches', trainNumber, date, selectedClass],
    queryFn: () => getCoaches(trainNumber, date, selectedClass),
    refetchInterval: 30_000,
  })

  const seats = useQuery({
    queryKey: ['seats', trainNumber, date, selectedClass, coachId],
    queryFn: () => getSeatMap(trainNumber, date, selectedClass, coachId ?? 0),
    enabled: coachId !== null,
    refetchInterval: 30_000,
  })

  useEffect(() => {
    const list = coaches.data?.coaches ?? []
    if (coachId !== null && list.some((coach) => coach.id === coachId)) {
      return
    }
    setCoachId(list[0]?.id ?? null)
  }, [coachId, coaches.data])

  const holdsRef = useRef<SeatHold[]>(holds)
  useEffect(() => {
    holdsRef.current = holds
  }, [holds])

  useEffect(
    () => () => {
      for (const hold of holdsRef.current) {
        void releaseSeatHold(hold.id).catch(() => undefined)
      }
    },
    [],
  )

  useEffect(() => {
    if (holds.length === 0) {
      return
    }
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [holds.length])

  const expiresAt =
    holds.length > 0 ? Math.min(...holds.map((hold) => new Date(hold.heldUntil).getTime())) : 0
  const remaining = holds.length > 0 ? Math.max(0, expiresAt - now) : 0

  useEffect(() => {
    if (holds.length === 0 || remaining > 0 || confirmedPnr) {
      return
    }
    setHolds([])
    setExpiryNotice('Your seat hold expired. The seats were released.')
    void seats.refetch()
    void availability.refetch()
    void coaches.refetch()
  }, [remaining, holds.length, seats, availability, coaches, confirmedPnr])

  const releaseAll = (list: SeatHold[]) => {
    for (const hold of list) {
      void releaseSeatHold(hold.id).catch(() => undefined)
    }
  }

  const changeClass = (classCode: string) => {
    if (classCode === selectedClass) {
      return
    }
    releaseAll(holds)
    setHolds([])
    setCoachId(null)
    setSelectedClass(classCode)
    setNotice(null)
    setExpiryNotice(null)
    setConfirmedPnr(null)
  }

  const changeCoach = (nextCoachId: number) => {
    if (nextCoachId === coachId) {
      return
    }
    releaseAll(holds)
    setHolds([])
    setCoachId(nextCoachId)
    setNotice(null)
    setExpiryNotice(null)
    setConfirmedPnr(null)
  }

  const changePassengerCount = (value: number) => {
    setPassengerCount(value)
    setNotice(null)
    setConfirmedPnr(null)
    if (holds.length > value) {
      const keep = holds.slice(0, value)
      const drop = holds.slice(value)
      setHolds(keep)
      releaseAll(drop)
      void seats.refetch()
    }
  }

  const refreshAvailability = () => {
    void seats.refetch()
    void availability.refetch()
    void coaches.refetch()
  }

  const toggleSeat = (seat: Seat) => {
    if (!coachId || busy) {
      return
    }
    const existing = holds.find((hold) => hold.coachId === coachId && hold.seatNo === seat.seatNo)
    if (existing) {
      setHolds((current) => current.filter((hold) => hold.id !== existing.id))
      setConfirmedPnr(null)
      setNotice(null)
      void releaseSeatHold(existing.id)
        .catch(() => undefined)
        .finally(refreshAvailability)
      return
    }
    if (holds.length >= passengerCount) {
      setNotice(
        `You can select up to ${passengerCount} seat${passengerCount === 1 ? '' : 's'} for ${passengerCount} passenger${passengerCount === 1 ? '' : 's'}. Deselect a seat to choose another.`,
      )
      return
    }
    setBusy(true)
    setNotice(null)
    setExpiryNotice(null)
    void createSeatHold({
      trainNumber,
      date,
      coachId,
      seatNo: seat.seatNo,
    })
      .then((hold) => {
        setHolds((current) => [...current, hold])
        setNow(Date.now())
        setConfirmedPnr(null)
      })
      .catch((error: unknown) => {
        if (isNormalizedApiError(error) && error.status === 409) {
          toast({
            title: 'That seat was just taken',
            description: 'Another passenger held it first. The seat map has been refreshed.',
            tone: 'danger',
          })
        } else {
          toast({
            title: 'Could not hold that seat',
            description: normalizeApiError(error).message,
            tone: 'danger',
          })
        }
        refreshAvailability()
      })
      .finally(() => {
        setBusy(false)
      })
  }

  const handleBook = () => {
    if (holds.length === 0) {
      return
    }
    setNotice(null)
    setExpiryNotice(null)
    setBookingOpen(true)
  }

  const handleBooked = (booking: BookingResponse) => {
    setConfirmedPnr(booking.pnr)
    setNotice(null)
    setExpiryNotice(null)
    toast({
      title: 'Booking confirmed',
      description: `PNR ${booking.pnr} · ${booking.trainName} on ${formatLongDate(booking.travelDate)}.`,
      tone: 'success',
    })
    refreshAvailability()
  }

  const handleHoldsInvalid = (message: string) => {
    setBookingOpen(false)
    setHolds([])
    setExpiryNotice(message)
    refreshAvailability()
  }

  const handleBookingOpenChange = (open: boolean) => {
    setBookingOpen(open)
    if (!open && confirmedPnr) {
      setHolds([])
    }
  }

  const selectedSeats = useMemo(
    () =>
      new Set(
        holds.filter((hold) => hold.coachId === coachId).map((hold) => hold.seatNo),
      ),
    [coachId, holds],
  )

  const classEntry = availability.data?.classes.find((item) => item.code === selectedClass)
  const available = seats.data?.classSummary.available ?? classEntry?.available ?? 0
  const total = seats.data?.classSummary.total ?? classEntry?.total ?? 0
  const coachCount = coaches.data?.coaches.length ?? 0
  const loadingSeats = coachId !== null && seats.isLoading
  const percent = total > 0 ? Math.round((available / total) * 100) : 0
  const waitlistLabel = available === 0 ? 'open' : '0'
  const bookingLabel =
    holds.length === 0
      ? 'Booking: 0 seats selected — select a seat to hold it for 10 minutes'
      : `Booking: ${holds.length} seat${holds.length === 1 ? '' : 's'} selected (${holds
          .map(
            (hold) =>
              `${hold.coachNo}-${String(hold.seatNo).padStart(2, '0')}, ${hold.berthLabel}`,
          )
          .join('; ')})`

  return (
    <section
      aria-label={`Seat selection for ${trainName}`}
      className="rounded-xl border border-brand-navy/15 bg-surface-muted/40 p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text">
            {trainName} <span className="font-normal text-muted">· {trainNumber}</span>
          </p>
          <p className="text-xs text-muted">{formatLongDate(date)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1 text-[11px] text-muted sm:flex">
            <RefreshCw className="size-3" aria-hidden="true" />
            Refreshes every 30s
          </span>
          <Button variant="ghost" size="icon" aria-label="Close seat map" onClick={onClose}>
            <X aria-hidden="true" />
          </Button>
        </div>
      </div>

      {availability.isError ? (
        <ErrorState
          className="mt-3"
          description={normalizeApiError(availability.error).message}
          onRetry={() => void availability.refetch()}
        />
      ) : (
        <>
          <div className="mt-3">
            {availability.isLoading ? (
              <div className="h-8 w-72 animate-pulse rounded-lg bg-surface" />
            ) : (
              <ClassTabs
                classes={availability.data?.classes ?? []}
                value={selectedClass}
                onChange={changeClass}
              />
            )}
          </div>

          <div className="mt-3 border-y border-border py-2">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <p className="text-sm">
                <span className="font-semibold text-brand-navy">
                  {selectedClass}: {available} left
                </span>{' '}
                <span className="text-xs text-muted">
                  of {total} across {coachCount} coach{coachCount === 1 ? '' : 'es'}
                </span>
              </p>
              <SeatLegend />
            </div>
            <div
              role="progressbar"
              aria-label={`${selectedClass} availability`}
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={available}
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface"
            >
              <div
                className={cn(
                  'h-full rounded-full',
                  classEntry ? LEVEL_BAR[classEntry.level] : 'bg-brand-navy',
                )}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          {coaches.isError ? (
            <ErrorState
              className="mt-3"
              description={normalizeApiError(coaches.error).message}
              onRetry={() => void coaches.refetch()}
            />
          ) : coaches.isLoading ? (
            <div className="mt-3 h-14 animate-pulse rounded-lg bg-surface" />
          ) : coachCount === 0 ? (
            <p className="mt-3 text-sm text-muted">No coaches are configured for this class.</p>
          ) : (
            <div className="mt-3">
              <CoachSelector
                coaches={coaches.data?.coaches ?? []}
                value={coachId}
                onChange={changeCoach}
              />
            </div>
          )}

          <div className="mt-3">
            {coachId === null ? null : loadingSeats ? (
              <div className="grid grid-cols-6 gap-2">
                {Array.from({ length: 12 }).map((_, index) => (
                  <span
                    key={index}
                    className="h-12 w-10 animate-pulse rounded-md bg-surface"
                    aria-hidden="true"
                  />
                ))}
              </div>
            ) : seats.isError ? (
              <ErrorState
                description={normalizeApiError(seats.error).message}
                onRetry={() => void seats.refetch()}
              />
            ) : seats.data ? (
              <SeatMap
                seats={seats.data.seats}
                layout={seats.data.coach.layout}
                selectedSeats={selectedSeats}
                onToggle={toggleSeat}
                busy={busy}
                coachNo={seats.data.coach.coachNo}
              />
            ) : (
              <p className="flex items-center gap-2 text-sm text-muted">
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                Loading the seat map…
              </p>
            )}
          </div>

          <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label htmlFor="seat-passengers" className="flex items-center gap-2 text-sm text-text">
                Passengers
                <select
                  id="seat-passengers"
                  value={passengerCount}
                  onChange={(event) => changePassengerCount(Number(event.target.value))}
                  className="h-9 rounded-lg border border-border bg-surface px-2 text-sm focus-visible:border-brand-navy focus-visible:outline-2 focus-visible:outline-brand-navy"
                >
                  {[1, 2, 3, 4, 5, 6].map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs text-muted">
                Seats are held while you complete the booking. The hold expires automatically.
              </p>
            </div>

            {holds.length > 0 && remaining > 0 ? (
              <p className="flex items-center gap-1.5 text-sm font-medium text-warning" role="status">
                <TimerReset className="size-4" aria-hidden="true" />
                Seats held for {formatCountdown(remaining)}
              </p>
            ) : null}
            {expiryNotice ? (
              <p className="text-sm font-medium text-danger" role="status">
                {expiryNotice}
              </p>
            ) : null}
            {notice ? (
              <p className="text-sm font-medium text-warning" role="status">
                {notice}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="min-w-0 text-xs text-muted" aria-live="polite">
                <span className="font-medium text-text">
                  Available {available} / {total}
                </span>
                {' · '}
                Waitlist {waitlistLabel}
                {' · '}
                {bookingLabel}
              </p>
              <Button disabled={holds.length === 0} onClick={handleBook}>
                Book Now
              </Button>
            </div>
            {confirmedPnr ? (
              <p className="text-sm text-success" role="status">
                Booking {confirmedPnr} confirmed. Your seats are listed in My Journeys.
              </p>
            ) : null}
          </div>
        </>
      )}

      <BookingFlow
        open={bookingOpen}
        onOpenChange={handleBookingOpenChange}
        trainNumber={trainNumber}
        trainName={trainName}
        date={date}
        classCode={selectedClass}
        quota={quota}
        baseFare={baseFare ?? classEntry?.baseFare ?? 0}
        route={route}
        holds={holds}
        onBooked={handleBooked}
        onHoldsInvalid={handleHoldsInvalid}
      />
    </section>
  )
}

export { SeatSelectionPanel, type SeatSelectionPanelProps }
