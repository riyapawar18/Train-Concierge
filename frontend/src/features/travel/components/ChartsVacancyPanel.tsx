import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Info, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ErrorState } from '@/components/ErrorState'
import { normalizeApiError } from '@/lib/apiClient'
import { cn } from '@/lib/utils'
import { formatDisplayDate, formatLongDate, todayIso, validateTravelDate } from '../date'
import { formatFare, LEVEL_BAR, LEVEL_META, quotaName } from '../constants'
import { getAvailability } from '../api'
import type { QuotaCode } from '../types'
import { DateField } from './DateField'
import { SeatSelectionPanel } from './SeatSelectionPanel'

const QUOTA_FACTOR: Record<QuotaCode, number> = {
  GENERAL: 1,
  TATKAL: 0.25,
  PREMIUM_TATKAL: 0.1,
  LADIES: 0.4,
  SENIOR_CITIZEN: 1,
}

const QUOTA_FARE_FACTOR: Record<QuotaCode, number> = {
  GENERAL: 1,
  TATKAL: 1.3,
  PREMIUM_TATKAL: 1.5,
  LADIES: 1,
  SENIOR_CITIZEN: 1,
}

function ChartsVacancyPanel() {
  const [trainNumber, setTrainNumber] = useState('')
  const [dateText, setDateText] = useState(formatDisplayDate(todayIso()))
  const [quota, setQuota] = useState<QuotaCode>('GENERAL')
  const [submitted, setSubmitted] = useState<{ trainNumber: string; date: string } | null>(null)
  const [viewClass, setViewClass] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const dateResult = validateTravelDate(dateText)
  const trainValid = /^\d{4,5}$/.test(trainNumber.trim())
  const canCheck = trainValid && Boolean(dateResult.iso)

  const availability = useQuery({
    queryKey: ['charts-availability', submitted?.trainNumber, submitted?.date],
    queryFn: () => getAvailability(submitted?.trainNumber ?? '', submitted?.date ?? ''),
    enabled: submitted !== null,
  })

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
    setViewClass(null)
    setSubmitted({ trainNumber: trainNumber.trim(), date: dateResult.iso })
  }

  const tatkal = quota === 'TATKAL' || quota === 'PREMIUM_TATKAL'

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Look up a train to compare seats left in every class, then open any class to see its coach
        chart and seat map.
      </p>

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Input
            id="charts-train-number"
            label="Train number"
            placeholder="e.g. 12123"
            inputMode="numeric"
            maxLength={5}
            value={trainNumber}
            error={
              error && !trainValid ? error : undefined
            }
            onChange={(event) => {
              setTrainNumber(event.target.value.replace(/\D/g, '').slice(0, 5))
              setError(null)
            }}
          />
          <DateField
            id="charts-date"
            value={dateText}
            onChange={setDateText}
            onBlur={() => {
              if (!dateResult.iso) {
                setError(dateResult.error ?? null)
              }
            }}
            error={submitted === null && error && !dateResult.iso ? error : undefined}
            description="Today to 120 days ahead"
          />
          <div className="flex w-full flex-col gap-1.5">
            <label htmlFor="charts-quota" className="text-sm font-medium text-text">
              Quota
            </label>
            <select
              id="charts-quota"
              value={quota}
              onChange={(event) => setQuota(event.target.value as QuotaCode)}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text focus-visible:border-brand-navy focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand-navy"
            >
              <option value="GENERAL">General</option>
              <option value="TATKAL">Tatkal</option>
              <option value="LADIES">Ladies</option>
              <option value="SENIOR_CITIZEN">Senior Citizen</option>
              <option value="PREMIUM_TATKAL">Premium Tatkal</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" variant="cta" disabled={!canCheck} className="w-full">
              <Search aria-hidden="true" />
              Check seats
            </Button>
          </div>
        </div>
        {error && trainValid && dateResult.iso ? (
          <p className="text-xs font-medium text-danger">{error}</p>
        ) : null}
      </form>

      {submitted === null ? (
        <div className="rounded-xl border border-dashed border-border bg-surface-muted/40 px-4 py-8 text-center">
          <BarChart3 className="mx-auto size-6 text-brand-navy" aria-hidden="true" />
          <p className="mt-2 text-sm text-muted">
            Enter a train number and date to see class-wise vacancy and coach charts.
          </p>
        </div>
      ) : availability.isLoading ? (
        <div className="space-y-2" aria-hidden="true">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-16 animate-pulse rounded-xl bg-surface-muted" />
          ))}
        </div>
      ) : availability.isError ? (
        <ErrorState
          description={normalizeApiError(availability.error).message}
          onRetry={() => void availability.refetch()}
        />
      ) : availability.data ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-text">
                {availability.data.trainName}{' '}
                <span className="font-normal text-muted">· {availability.data.trainNumber}</span>
              </p>
              <p className="text-xs text-muted">
                {formatLongDate(availability.data.date)} · {quotaName(quota)} quota view
              </p>
            </div>
            <Badge tone="info">Charts / Vacancy</Badge>
          </div>

          <ul className="space-y-3">
            {availability.data.classes.map((travelClass) => {
              const percent =
                travelClass.total > 0
                  ? Math.round((travelClass.available / travelClass.total) * 100)
                  : 0
              const quotaSeats = Math.floor(travelClass.available * QUOTA_FACTOR[quota])
              const quotaFare = Math.round(
                (travelClass.baseFare * QUOTA_FARE_FACTOR[quota]) / 5,
              ) * 5
              return (
                <li key={travelClass.code} className="rounded-xl border border-border bg-surface p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-text">
                      {travelClass.code} · {travelClass.name}
                    </span>
                    <Badge tone={LEVEL_META[travelClass.level].tone}>
                      {travelClass.available > 0
                        ? `${travelClass.available} of ${travelClass.total} available`
                        : 'Waitlist'}
                    </Badge>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={`${travelClass.code} availability`}
                    aria-valuemin={0}
                    aria-valuemax={travelClass.total}
                    aria-valuenow={travelClass.available}
                    className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted"
                  >
                    <div
                      className={cn('h-full rounded-full', LEVEL_BAR[travelClass.level])}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted">
                      {formatFare(travelClass.fare)} base fare · {percent}% seats free
                      {quota !== 'GENERAL' ? (
                        <>
                          {' '}
                          · {quotaName(quota)} quota: {quotaSeats} seats ·{' '}
                          {formatFare(quotaFare)}
                        </>
                      ) : null}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setViewClass((current) =>
                          current === travelClass.code ? null : travelClass.code,
                        )
                      }
                    >
                      {viewClass === travelClass.code ? 'Hide seat map' : 'View seat map'}
                    </Button>
                  </div>
                  {viewClass === travelClass.code ? (
                    <div className="mt-3">
                      <SeatSelectionPanel
                        key={`${availability.data.trainNumber}-${travelClass.code}`}
                        trainNumber={availability.data.trainNumber}
                        trainName={availability.data.trainName}
                        date={availability.data.date}
                        initialClass={travelClass.code}
                        baseFare={travelClass.baseFare}
                        quota={quota}
                        onClose={() => setViewClass(null)}
                      />
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>

          {quota !== 'GENERAL' ? (
            <p className="flex items-start gap-1.5 rounded-lg bg-info-soft px-3 py-2 text-xs text-info">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span>
                Quota columns show the fare and seats tracked for the selected quota; the bars
                show physical coach availability. {tatkal
                  ? 'Tatkal and Premium Tatkal bookings open at 10:00 AM one day before travel.'
                  : 'General quota follows the standard reservation window.'}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export { ChartsVacancyPanel }
