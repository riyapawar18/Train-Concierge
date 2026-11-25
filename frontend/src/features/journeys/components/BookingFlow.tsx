import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  Download,
  LoaderCircle,
  MessageCircle,
  TimerReset,
  TriangleAlert,
} from 'lucide-react'
import { useSession } from '@/app/SessionProvider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { normalizeApiError } from '@/lib/apiClient'
import { getTrainStatus } from '@/features/travel/api'
import { formatCountdown, formatFare, className as classNameLabel, quotaName } from '@/features/travel/constants'
import { formatLongDate } from '@/features/travel/date'
import { GENDER_OPTIONS } from '../constants'
import { estimateFare } from '../fare'
import { formatSeatList, genderLabel } from '../format'
import { createBooking } from '../api'
import { downloadTicket, buildWhatsAppUrl, type TicketData } from '../ticketDownload'
import { PaymentCheckout } from '@/features/payment/PaymentCheckout'
import type { PaymentAuthorization, PaymentConfirmation, PaymentSubject } from '@/features/payment/types'
import type { BookingResponse, Gender } from '../types'
import type { QuotaCode, SeatHold } from '@/features/travel/types'

export interface BookingRoute {
  from: { code: string; name: string }
  to: { code: string; name: string }
}

interface BookingFlowProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trainNumber: string
  trainName: string
  date: string
  classCode: string
  quota: QuotaCode
  baseFare: number
  route: BookingRoute | null
  holds: SeatHold[]
  onBooked: (booking: BookingResponse) => void
  onHoldsInvalid: (message: string) => void
}

type Step = 'details' | 'review' | 'payment' | 'success'

interface DraftPassenger {
  holdId: number
  name: string
  age: string
  gender: Gender | ''
}

const STEP_LABELS: Array<{ step: Step; label: string }> = [
  { step: 'details', label: 'Passengers' },
  { step: 'review', label: 'Review' },
  { step: 'payment', label: 'Payment' },
]

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MOBILE_PATTERN = /^[+\d][\d\s-]{6,19}$/

function seatText(hold: SeatHold): string {
  return `${hold.coachNo}-${String(hold.seatNo).padStart(2, '0')} · ${hold.berthLabel}`
}

function BookingFlow({
  open,
  onOpenChange,
  trainNumber,
  trainName,
  date,
  classCode,
  quota,
  baseFare,
  route,
  holds,
  onBooked,
  onHoldsInvalid,
}: BookingFlowProps) {
  const { user } = useSession()
  const holdsKey = holds.map((hold) => hold.id).join(',')

  const [step, setStep] = useState<Step>('details')
  const [drafts, setDrafts] = useState<DraftPassenger[]>([])
  const [contactEmail, setContactEmail] = useState('')
  const [contactMobile, setContactMobile] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [booking, setBooking] = useState<BookingResponse | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!open) {
      return
    }
    setStep('details')
    setDrafts(
      holds.map((hold, index) => ({
        holdId: hold.id,
        name: index === 0 ? (user?.fullName ?? '') : '',
        age: '',
        gender: '',
      })),
    )
    setContactEmail(user?.email ?? '')
    setContactMobile('')
    setFieldErrors({})
    setBooking(null)
    setSubmitError(null)
    setSubmitting(false)
    setPaying(false)
    setNow(Date.now())
  }, [open, holdsKey, user?.fullName, user?.email])

  useEffect(() => {
    if (!open || holds.length === 0 || step === 'success') {
      return
    }
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [open, holds.length, step])

  const expiresAt = holds.length
    ? Math.min(...holds.map((hold) => new Date(hold.heldUntil).getTime()))
    : 0
  const remaining = holds.length ? Math.max(0, expiresAt - now) : 0
  const expired = holds.length > 0 && remaining === 0

  const trainStatus = useQuery({
    queryKey: ['train-status', trainNumber, date],
    queryFn: () => getTrainStatus(trainNumber, date),
    enabled: open && route === null,
  })

  const resolvedRoute = useMemo<BookingRoute | null>(() => {
    if (route) {
      return route
    }
    const schedule = trainStatus.data?.schedule ?? []
    if (schedule.length < 2) {
      return null
    }
    const first = schedule[0]
    const last = schedule[schedule.length - 1]
    return {
      from: { code: first.stationCode, name: first.stationName },
      to: { code: last.stationCode, name: last.stationName },
    }
  }, [route, trainStatus.data])

  const fare = estimateFare(baseFare, classCode, quota, holds.length)

  const paymentSubject: PaymentSubject = useMemo(
    () => ({
      title: `${trainName} · ${trainNumber}`,
      route: resolvedRoute
        ? `${resolvedRoute.from.name} (${resolvedRoute.from.code}) → ${resolvedRoute.to.name} (${resolvedRoute.to.code})`
        : 'Loading route…',
      schedule: `${formatLongDate(date)} · ${classNameLabel(classCode)} · ${quotaName(quota)}`,
      lines: [
        {
          label: 'Passengers',
          value:
            drafts
              .map((draft) => draft.name.trim())
              .filter(Boolean)
              .join(', ') || `${holds.length} passenger${holds.length === 1 ? '' : 's'}`,
        },
        { label: 'Seats', value: formatSeatList(holds.map((hold) => seatText(hold))) },
        { label: 'Class · quota', value: `${classNameLabel(classCode)} · ${quotaName(quota)}` },
      ],
      amount: fare.totalFare,
      payerName: user?.fullName ?? 'Passenger',
      payerEmail: user?.email,
      payerMobile: contactMobile.trim() || undefined,
    }),
    [
      trainName,
      trainNumber,
      resolvedRoute,
      date,
      classCode,
      quota,
      drafts,
      holds,
      fare.totalFare,
      user,
      contactMobile,
    ],
  )

  /** Creates the booking once the payment method authorises the debit. */
  async function authorizePayment(
    _authorization: PaymentAuthorization,
  ): Promise<PaymentConfirmation> {
    if (!resolvedRoute) {
      throw new Error('Route details are still loading — please try again.')
    }
    setSubmitting(true)
    try {
      const created = await createBooking({
        trainNumber,
        date,
        from: resolvedRoute.from.code,
        to: resolvedRoute.to.code,
        classCode,
        quota,
        passengers: drafts.map((draft) => ({
          name: draft.name.trim(),
          age: Number(draft.age),
          gender: draft.gender as Gender,
        })),
        holdIds: drafts.map((draft) => draft.holdId),
        contactEmail: contactEmail.trim() || undefined,
        contactMobile: contactMobile.trim() || undefined,
      })
      setBooking(created)
      setStep('success')
      onBooked(created)
      return {
        referenceLabel: 'PNR',
        reference: created.pnr,
        summary: [
          { label: 'Train', value: `${created.trainName} · ${created.trainNumber}` },
          {
            label: 'Route',
            value: `${created.from.code} → ${created.to.code} · ${formatLongDate(created.travelDate)}`,
          },
          { label: 'Class', value: `${created.className} (${created.classCode})` },
          {
            label: 'Seats',
            value: formatSeatList(created.passengers.map((passenger) => passenger.seatLabel)),
          },
          {
            label: 'Passengers',
            value: created.passengers.map((passenger) => passenger.name).join(', '),
          },
        ],
        detailsPath: created.journeyId ? `/app/journeys/${created.journeyId}` : undefined,
      }
    } catch (error) {
      const normalized = normalizeApiError(error)
      if (
        normalized.status === 409 &&
        (normalized.code === 'HOLD_EXPIRED' || normalized.code === 'SEAT_HOLD_INVALID')
      ) {
        setPaying(false)
        onHoldsInvalid(normalized.message)
        throw new Error(normalized.message)
      }
      setSubmitError(normalized.message)
      throw new Error(normalized.message)
    } finally {
      setSubmitting(false)
    }
  }

  const validateDetails = (): Record<string, string> => {
    const errors: Record<string, string> = {}
    for (const draft of drafts) {
      if (draft.name.trim().length < 2) {
        errors[`name-${draft.holdId}`] = 'Enter the passenger name.'
      }
      const age = Number(draft.age)
      if (!draft.age.trim() || !Number.isInteger(age) || age < 1 || age > 120) {
        errors[`age-${draft.holdId}`] = 'Enter an age between 1 and 120.'
      }
      if (!draft.gender) {
        errors[`gender-${draft.holdId}`] = 'Select a gender.'
      }
    }
    if (!EMAIL_PATTERN.test(contactEmail.trim())) {
      errors.contactEmail = 'Enter a valid email address.'
    }
    if (contactMobile.trim() && !MOBILE_PATTERN.test(contactMobile.trim())) {
      errors.contactMobile = 'Enter a valid mobile number.'
    }
    return errors
  }

  const goToReview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const errors = validateDetails()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      return
    }
    setSubmitError(null)
    setStep('review')
  }

  const updateDraft = (holdId: number, patch: Partial<DraftPassenger>) => {
    setDrafts((current) =>
      current.map((draft) => (draft.holdId === holdId ? { ...draft, ...patch } : draft)),
    )
    setFieldErrors((current) => {
      const next = { ...current }
      for (const key of Object.keys(next)) {
        if (key.endsWith(`-${holdId}`) || key === 'contactEmail' || key === 'contactMobile') {
          delete next[key]
        }
      }
      return next
    })
  }

  const clearFieldError = (key: string) => {
    setFieldErrors((current) => {
      if (!(key in current)) {
        return current
      }
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  const handleOpenChange = (next: boolean) => {
    if (!next && (submitting || paying)) {
      return
    }
    onOpenChange(next)
  }

  const title =
    step === 'success'
      ? 'Booking confirmed'
      : step === 'payment'
        ? 'Payment'
        : step === 'review'
          ? 'Review your booking'
          : 'Passenger details'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {trainName} · {trainNumber} · {formatLongDate(date)}
          </DialogDescription>
        </DialogHeader>

        {step === 'success' ? null : (
          <ol className="flex flex-wrap items-center gap-2 text-xs">
            {STEP_LABELS.map((item, index) => {
              const active = item.step === step
              const done =
                (step === 'review' && index === 0) || (step === 'payment' && index < 2)
              return (
                <li
                  key={item.step}
                  aria-current={active ? 'step' : undefined}
                  className={
                    active
                      ? 'rounded-full bg-brand-navy px-2.5 py-1 font-semibold text-white'
                      : done
                        ? 'rounded-full bg-success-soft px-2.5 py-1 font-medium text-success'
                        : 'rounded-full bg-surface-muted px-2.5 py-1 font-medium text-muted'
                  }
                >
                  {index + 1}. {item.label}
                </li>
              )
            })}
          </ol>
        )}

        {step === 'details' ? (
          <form noValidate onSubmit={goToReview} className="flex flex-col gap-3">
            {drafts.map((draft, index) => {
              const hold = holds.find((item) => item.id === draft.holdId)
              return (
                <fieldset
                  key={draft.holdId}
                  className="rounded-xl border border-border bg-surface p-3"
                >
                  <legend className="flex w-full items-center justify-between gap-2 px-1 text-sm font-semibold text-text">
                    <span>Passenger {index + 1}</span>
                    {hold ? (
                      <span className="text-xs font-normal text-muted">{seatText(hold)}</span>
                    ) : null}
                  </legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_100px_140px]">
                    <Input
                      id={`passenger-name-${draft.holdId}`}
                      label="Full name"
                      autoComplete="off"
                      value={draft.name}
                      error={fieldErrors[`name-${draft.holdId}`]}
                      onChange={(event) => updateDraft(draft.holdId, { name: event.target.value })}
                    />
                    <Input
                      id={`passenger-age-${draft.holdId}`}
                      label="Age"
                      inputMode="numeric"
                      maxLength={3}
                      value={draft.age}
                      error={fieldErrors[`age-${draft.holdId}`]}
                      onChange={(event) =>
                        updateDraft(draft.holdId, {
                          age: event.target.value.replace(/\D/g, '').slice(0, 3),
                        })
                      }
                    />
                    <div className="flex w-full flex-col gap-1.5">
                      <label
                        htmlFor={`passenger-gender-${draft.holdId}`}
                        className="text-sm font-medium text-text"
                      >
                        Gender
                      </label>
                      <select
                        id={`passenger-gender-${draft.holdId}`}
                        value={draft.gender}
                        aria-invalid={fieldErrors[`gender-${draft.holdId}`] ? true : undefined}
                        onChange={(event) =>
                          updateDraft(draft.holdId, { gender: event.target.value as Gender })
                        }
                        className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text focus-visible:border-brand-navy focus-visible:outline-2 focus-visible:outline-brand-navy aria-invalid:border-danger"
                      >
                        <option value="">Select</option>
                        {GENDER_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {fieldErrors[`gender-${draft.holdId}`] ? (
                        <p className="text-xs font-medium text-danger">
                          {fieldErrors[`gender-${draft.holdId}`]}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </fieldset>
              )
            })}

            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                id="booking-contact-email"
                label="Contact email"
                type="email"
                description="Prefilled from your profile."
                value={contactEmail}
                error={fieldErrors.contactEmail}
                onChange={(event) => {
                  setContactEmail(event.target.value)
                  clearFieldError('contactEmail')
                }}
              />
              <Input
                id="booking-contact-mobile"
                label="Contact mobile"
                inputMode="tel"
                description="Optional. Used for journey updates."
                value={contactMobile}
                error={fieldErrors.contactMobile}
                onChange={(event) => {
                  setContactMobile(event.target.value)
                  clearFieldError('contactMobile')
                }}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="cta">
                Review booking
              </Button>
            </DialogFooter>
          </form>
        ) : null}

        {step === 'review' || step === 'payment' ? (
          <div className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-surface p-3 text-sm">
                <p className="font-semibold text-text">
                  {trainName} <span className="font-normal text-muted">· {trainNumber}</span>
                </p>
                <p className="mt-1 text-muted">
                  {resolvedRoute
                    ? `${resolvedRoute.from.name} (${resolvedRoute.from.code}) → ${resolvedRoute.to.name} (${resolvedRoute.to.code})`
                    : 'Loading route…'}
                </p>
                <p className="mt-1 text-muted">
                  {formatLongDate(date)} · {classNameLabel(classCode)} · {quotaName(quota)}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-surface p-3 text-sm">
                <p className="font-semibold text-text">Seats</p>
                <ul className="mt-1 space-y-1 text-muted">
                  {drafts.map((draft, index) => {
                    const hold = holds.find((item) => item.id === draft.holdId)
                    return (
                      <li key={draft.holdId} className="flex items-baseline justify-between gap-2">
                        <span className="min-w-0 truncate">
                          {index + 1}. {draft.name}
                          <span className="text-xs">
                            {' '}
                            · {genderLabel(draft.gender)} · {draft.age} yrs
                          </span>
                        </span>
                        <span className="shrink-0 font-medium text-text">
                          {hold ? seatText(hold) : '—'}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-text">Fare breakdown</p>
                <span className="text-xs text-muted">
                  {holds.length} passenger{holds.length === 1 ? '' : 's'}
                </span>
              </div>
              <dl className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">
                    Base fare ({formatFare(fare.perPassenger)} × {holds.length})
                  </dt>
                  <dd className="tabular-nums text-text">{formatFare(fare.baseFare)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">Reservation charge</dt>
                  <dd className="tabular-nums text-text">{formatFare(fare.reservationCharge)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">GST (5%)</dt>
                  <dd className="tabular-nums text-text">{formatFare(fare.gst)}</dd>
                </div>
                <div className="flex justify-between gap-2 border-t border-border pt-1 font-semibold">
                  <dt className="text-text">Total</dt>
                  <dd className="tabular-nums text-text">{formatFare(fare.totalFare)}</dd>
                </div>
              </dl>
              <p className="mt-2 text-xs text-muted">
                The fare is final once the booking is created.
              </p>
            </div>

            {!resolvedRoute ? (
              trainStatus.isError ? (
                <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
                  We could not load the route for this train.{' '}
                  <button
                    type="button"
                    className="font-semibold underline"
                    onClick={() => void trainStatus.refetch()}
                  >
                    Try again
                  </button>
                </p>
              ) : (
                <p className="flex items-center gap-1.5 text-sm text-muted" role="status">
                  <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                  Loading route details…
                </p>
              )
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-muted px-3 py-2 text-sm">
              <span className="flex items-center gap-1.5 font-medium text-warning">
                <TimerReset className="size-4" aria-hidden="true" />
                {expired
                  ? 'Seat hold expired'
                  : `Seats held for ${formatCountdown(remaining)}`}
              </span>
              <span className="text-xs text-muted">
                Contact {contactEmail}
                {contactMobile ? ` · ${contactMobile}` : ''}
              </span>
            </div>

            {expired ? (
              <p role="alert" className="flex items-start gap-1.5 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                Your seat hold expired. Close this and select the seats again.
              </p>
            ) : null}

            {submitError ? (
              <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
                {submitError}
              </p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => setStep(step === 'payment' ? 'review' : 'details')}
              >
                Back
              </Button>
              {step === 'review' ? (
                <Button
                  type="button"
                  variant="cta"
                  disabled={expired || !resolvedRoute}
                  onClick={() => {
                    setSubmitError(null)
                    setPaying(true)
                    setStep('payment')
                  }}
                >
                  Pay Now
                </Button>
              ) : null}
            </DialogFooter>
          </div>
        ) : null}

        {step === 'success' && booking ? (() => {
          const ticketData: TicketData = {
            pnr: booking.pnr,
            trainNumber: booking.trainNumber,
            trainName: booking.trainName,
            travelDate: booking.travelDate,
            boardingTime: booking.boardingTime,
            arrivalTime: booking.arrivalTime,
            fromCode: booking.from.code,
            fromName: booking.from.name,
            toCode: booking.to.code,
            toName: booking.to.name,
            classCode: booking.classCode,
            className: booking.className,
            quota: booking.quota,
            passengers: booking.passengers.map(p => ({
              name: p.name,
              age: p.age,
              gender: p.gender,
              seatLabel: p.seatLabel,
              berthType: p.berthType,
              coachNo: p.coachNo,
            })),
            fare: booking.fare,
            contactMobile: contactMobile.trim() || null,
            contactEmail: contactEmail.trim() || null,
          }
          const whatsappUrl = buildWhatsAppUrl(ticketData, contactMobile.trim() || null)
          return (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-success-soft text-success">
                <CheckCircle2 className="size-7" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm text-muted">Your PNR</p>
                <p className="font-mono text-2xl font-semibold tracking-[0.2em] text-text">
                  {booking.pnr}
                </p>
              </div>
              <div className="w-full rounded-xl border border-border bg-surface p-3 text-left text-sm">
                <p className="font-semibold text-text">
                  {booking.trainName} <span className="font-normal text-muted">· {booking.trainNumber}</span>
                </p>
                <p className="mt-1 text-muted">
                  {booking.from.name} ({booking.from.code}) → {booking.to.name} ({booking.to.code})
                </p>
                <p className="mt-1 text-muted">
                  {formatLongDate(booking.travelDate)} · {booking.className} ({booking.classCode})
                </p>
                <p className="mt-1 text-muted">
                  {formatSeatList(booking.passengers.map((passenger) => passenger.seatLabel))}
                </p>
                <p className="mt-2 flex justify-between border-t border-border pt-2 font-semibold text-text">
                  <span>Total fare</span>
                  <span className="tabular-nums">{formatFare(booking.fare.totalFare)}</span>
                </p>
              </div>

              {/* Ticket download + WhatsApp share */}
              <div className="flex w-full flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => downloadTicket(ticketData)}
                >
                  <Download className="size-4" aria-hidden="true" />
                  Download ticket
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-[#25d366] text-[#25d366] hover:bg-[#25d366]/10"
                  asChild
                >
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="size-4" aria-hidden="true" />
                    Share on WhatsApp
                  </a>
                </Button>
              </div>

              <p className="text-xs text-muted">
                You can also download the ticket later from My Journeys.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button asChild variant="cta">
                  <Link to="/app/journeys">View my journeys</Link>
                </Button>
                {booking.journeyId ? (
                  <Button asChild variant="outline">
                    <Link to={`/app/journeys/${booking.journeyId}`}>View journey</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          )
        })() : null}

        <PaymentCheckout
          open={paying}
          subject={paymentSubject}
          onAuthorize={authorizePayment}
          onCancel={() => {
            setPaying(false)
            setStep('review')
          }}
          onClose={() => setPaying(false)}
          onContinue={() => setPaying(false)}
          continueLabel="See your e-ticket"
          dashboardPath="/app/dashboard"
        />
      </DialogContent>
    </Dialog>
  )
}

export { BookingFlow, type BookingFlowProps }
