import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { Clock, Info, MapPin, Search, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ErrorState } from '@/components/ErrorState'
import { StatusBadge } from '@/components/StatusBadge'
import { normalizeApiError } from '@/lib/apiClient'
import { storage } from '@/lib/storage'
import { getTrainStatus } from '@/features/travel/api'
import { formatDisplayDate, formatLongDate, isIsoWithinWindow, todayIso, validateTravelDate } from '@/features/travel/date'
import { DateField } from '@/features/travel/components/DateField'

interface RecentStatus {
  trainNumber: string
  date: string
}

const RECENT_KEY = 'trainconcierge.recent-status'

function readRecent(): RecentStatus[] {
  const raw = storage.get(RECENT_KEY, 'local')
  if (!raw) {
    return []
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
      .flatMap((item) => {
        if (
          item &&
          typeof item === 'object' &&
          typeof (item as RecentStatus).trainNumber === 'string' &&
          typeof (item as RecentStatus).date === 'string' &&
          isIsoWithinWindow((item as RecentStatus).date)
        ) {
          return [{ trainNumber: (item as RecentStatus).trainNumber, date: (item as RecentStatus).date }]
        }
        return []
      })
      .slice(0, 5)
  } catch {
    return []
  }
}

export function TrainStatusPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const trainParam = (searchParams.get('train') ?? '').trim()
  const dateParam = searchParams.get('date') ?? ''
  const dateIso = isIsoWithinWindow(dateParam) ? dateParam : ''
  const ready = /^\d{4,5}$/.test(trainParam) && dateIso !== ''

  const [trainNumber, setTrainNumber] = useState(trainParam)
  const [dateText, setDateText] = useState(formatDisplayDate(dateIso || todayIso()))
  const [error, setError] = useState<string | null>(null)
  const [recent, setRecent] = useState<RecentStatus[]>(readRecent)
  const recentRef = useRef(recent)
  useEffect(() => {
    recentRef.current = recent
  }, [recent])

  const status = useQuery({
    queryKey: ['train-status', trainParam, dateIso],
    queryFn: () => getTrainStatus(trainParam, dateIso),
    enabled: ready,
  })

  useEffect(() => {
    if (!status.data) {
      return
    }
    const data = status.data
    const next = [
      { trainNumber: data.trainNumber, date: data.date },
      ...recentRef.current.filter(
        (item) => item.trainNumber !== data.trainNumber || item.date !== data.date,
      ),
    ].slice(0, 5)
    recentRef.current = next
    setRecent(next)
    storage.set(RECENT_KEY, JSON.stringify(next), 'local')
  }, [status.data])

  const dateResult = validateTravelDate(dateText)
  const trainValid = /^\d{4,5}$/.test(trainNumber.trim())

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!trainValid) {
      setError('Enter a 4 or 5 digit train number.')
      return
    }
    if (!dateResult.iso) {
      setError(dateResult.error ?? 'Choose a valid travel date.')
      return
    }
    setError(null)
    setSearchParams({ train: trainNumber.trim(), date: dateResult.iso }, { replace: true })
  }

  const openRecent = (item: RecentStatus) => {
    setTrainNumber(item.trainNumber)
    setDateText(formatDisplayDate(item.date))
    setError(null)
    setSearchParams({ train: item.trainNumber, date: item.date }, { replace: true })
  }

  const normalizedError = status.isError ? normalizeApiError(status.error) : null
  const schedule = status.data?.schedule ?? []

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-text">Train Status</h1>
        </div>
        <p className="mt-1 text-sm text-muted">
          Follow a train's route and see the delay that affects your connections.
        </p>
      </div>

      <p className="flex items-start gap-2 rounded-lg border border-info/20 bg-info-soft px-3 py-2 text-xs text-info">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Status is derived from the disruption feed tracked for this service. It is not a live
        Indian Railways position and must not be used as travel evidence.
      </p>

      <Card>
        <CardContent className="p-4 sm:p-5">
          <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_auto]">
              <Input
                id="status-train"
                label="Train number"
                description="4 or 5 digits, for example 12123."
                placeholder="e.g. 12123"
                inputMode="numeric"
                maxLength={5}
                value={trainNumber}
                error={error && !trainValid ? error : undefined}
                onChange={(event) => {
                  setTrainNumber(event.target.value.replace(/\D/g, '').slice(0, 5))
                  setError(null)
                }}
              />
              <DateField
                id="status-date"
                value={dateText}
                onChange={(text) => {
                  setDateText(text)
                  setError(null)
                }}
                onBlur={() => {
                  if (!dateResult.iso) {
                    setError(dateResult.error ?? null)
                  }
                }}
                error={error && trainValid && !dateResult.iso ? error : undefined}
              />
              <div className="flex items-end">
                <Button type="submit" variant="cta" className="w-full xl:w-auto">
                  <Search aria-hidden="true" />
                  Check status
                </Button>
              </div>
            </div>
          </form>

          {recent.length > 0 ? (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <span className="text-xs font-medium text-muted">Recent searches</span>
              {recent.map((item) => (
                <button
                  key={`${item.trainNumber}-${item.date}`}
                  type="button"
                  onClick={() => openRecent(item)}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text transition-colors hover:border-brand-navy/30 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
                >
                  <Clock className="size-3 text-muted" aria-hidden="true" />
                  {item.trainNumber}
                  <span className="text-muted">· {formatDisplayDate(item.date)}</span>
                </button>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {!ready ? (
        <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-10 text-center">
          <Clock className="mx-auto size-6 text-brand-navy" aria-hidden="true" />
          <p className="mt-2 text-sm text-muted">
            Enter a train number and date, or pick one of your recent searches.
          </p>
        </div>
      ) : status.isLoading ? (
        <div className="space-y-2" aria-label="Loading train status">
          <div className="h-28 animate-pulse rounded-xl bg-surface" />
          <div className="h-64 animate-pulse rounded-xl bg-surface" />
        </div>
      ) : status.isError ? (
        <ErrorState
          title={normalizedError?.status === 404 ? 'Train not found' : 'We could not load the status'}
          description={
            normalizedError?.status === 404
              ? 'We could not find that train. Check the number and try again.'
              : (normalizedError?.message ?? 'Something went wrong. Please try again.')
          }
          onRetry={() => void status.refetch()}
        />
      ) : status.data ? (
        <>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle>
                    {status.data.trainName}{' '}
                    <span className="font-normal text-muted">· {status.data.trainNumber}</span>
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted">{formatLongDate(status.data.date)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={status.data.status} />
                  <Badge tone={status.data.delayMinutes > 0 ? 'warning' : 'success'}>
                    {status.data.delayMinutes > 0
                      ? `${status.data.delayMinutes} min delay`
                      : '0 min delay'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm text-muted">
                {status.data.status === 'ON_TIME'
                  ? 'Running to schedule at every stop.'
                  : 'This run has an updated running status.'}
              </p>
              {status.data.disruptionHref ? (
                <Link
                  to={status.data.disruptionHref}
                  className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-sm font-medium text-warning hover:underline"
                >
                  <TriangleAlert className="size-4" aria-hidden="true" />
                  {status.data.disruptionTitle ?? 'There is an active disruption on this route.'}
                </Link>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Route and timings</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ol className="relative">
                {schedule.map((stop, index) => (
                  <li key={stop.stopOrder} className="flex gap-3 pb-4 last:pb-0">
                    <div className="flex flex-col items-center" aria-hidden="true">
                      <span className="mt-1.5 size-2.5 shrink-0 rounded-full border-2 border-brand-navy bg-surface" />
                      {index < schedule.length - 1 ? (
                        <span className="mt-1 w-px flex-1 bg-border" />
                      ) : null}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-x-4 gap-y-1">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text">
                          {stop.stationName}{' '}
                          <span className="text-xs font-normal text-muted">{stop.stationCode}</span>
                        </p>
                        <p className="text-[11px] text-muted">
                          Day {stop.dayOffset + 1} · {stop.distanceKm} km
                        </p>
                      </div>
                      <div className="text-right text-xs text-muted">
                        <p>
                          Arr{' '}
                          <span className="font-medium text-text tabular-nums">
                            {stop.arrivalTime ?? '—'}
                          </span>
                        </p>
                        <p>
                          Dep{' '}
                          <span className="font-medium text-text tabular-nums">
                            {stop.departureTime ?? '—'}
                          </span>
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <p className="flex items-start gap-2 text-xs text-muted">
            <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {schedule.length} stops on the timetable for this service.
          </p>
        </>
      ) : null}
    </div>
  )
}
