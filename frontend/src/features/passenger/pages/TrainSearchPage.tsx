import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BellRing, CalendarDays, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/toast'
import { normalizeApiError } from '@/lib/apiClient'
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/features/notifications/api'
import { BookTicketCard } from '@/features/travel/components/BookTicketCard'
import { FiltersPanel } from '@/features/travel/components/FiltersPanel'
import { ModifySearchBar } from '@/features/travel/components/ModifySearchBar'
import { TrainCard } from '@/features/travel/components/TrainCard'
import { searchTrains } from '@/features/travel/api'
import { formatHeaderDate } from '@/features/travel/date'
import { quotaName, SORT_OPTIONS } from '@/features/travel/constants'
import {
  buildRouteParams,
  canShiftDate,
  hasRefinements,
  hasSearch,
  readRouteSearch,
  shiftDate,
  toSearchFilters,
  type RouteSearch,
} from '@/features/travel/searchParams'
import type { SortCode } from '@/features/travel/types'

function ResultsHeader({
  route,
  count,
  fromName,
  toName,
  onDate,
  onSort,
}: {
  route: RouteSearch
  count: number
  fromName: string
  toName: string
  onDate: (days: number) => void
  onSort: (sort: SortCode) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-text" data-testid="results-summary">
            {count} result{count === 1 ? '' : 's'} for {fromName.toUpperCase()} →{' '}
            {toName.toUpperCase()} | {formatHeaderDate(route.date)} | {quotaName(route.quota)}
          </h1>
          <p className="mt-0.5 text-xs text-muted" aria-live="polite">
            {count === 0
              ? 'Try another date or relax the filters.'
              : 'Fares and availability are current as of this search.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="results-sort" className="text-xs font-medium text-muted">
            Sort by
          </label>
          <select
            id="results-sort"
            value={route.sort}
            onChange={(event) => onSort(event.target.value as SortCode)}
            className="h-9 rounded-lg border border-border bg-surface px-2 text-sm text-text focus-visible:border-brand-navy focus-visible:outline-2 focus-visible:outline-brand-navy"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!canShiftDate(route.date, -1)}
          onClick={() => onDate(-1)}
        >
          <ArrowLeft aria-hidden="true" />
          Previous Day
        </Button>
        <span className="flex items-center gap-1.5 rounded-lg bg-surface-muted px-2.5 py-1.5 text-xs font-medium text-text">
          <CalendarDays className="size-3.5 text-brand-navy" aria-hidden="true" />
          {formatHeaderDate(route.date)}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={!canShiftDate(route.date, 1)}
          onClick={() => onDate(1)}
        >
          Next Day
          <ArrowRight aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}

function EmailSeatAlertsToggle() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const preferences = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: getNotificationPreferences,
  })

  const save = useMutation({
    mutationFn: (seatAlertsEnabled: boolean) =>
      updateNotificationPreferences({
        emailEnabled: preferences.data?.emailEnabled ?? true,
        seatAlertsEnabled,
        disruptionAlertsEnabled: preferences.data?.disruptionAlertsEnabled ?? true,
        announcementsEnabled: preferences.data?.announcementsEnabled ?? true,
      }),
    onSuccess: (saved) => {
      queryClient.setQueryData(['notification-preferences'], saved)
      toast({
        title: saved.seatAlertsEnabled ? 'Seat alerts are on' : 'Seat alerts are off',
        description: saved.seatAlertsEnabled
          ? 'We will email you when berths on the trains you search run low.'
          : 'You will not be emailed when berths run low.',
        tone: 'success',
      })
    },
    onError: (error) => {
      toast({
        title: 'Preference not saved',
        description: normalizeApiError(error).message,
        tone: 'danger',
      })
    },
  })

  if (preferences.isError) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted shadow-card">
        <p>We could not load your notification settings.</p>
        <Button variant="outline" size="sm" onClick={() => void preferences.refetch()}>
          Retry
        </Button>
      </div>
    )
  }

  const current = save.data ?? preferences.data
  const seatAlerts = current?.seatAlertsEnabled ?? false
  const hint = seatAlerts
    ? current?.emailEnabled
      ? 'We will email you when berths on a train you searched run low.'
      : 'Seat alerts need Email notifications switched on in your settings.'
    : 'Opt in to be emailed when berths on the trains you search run low.'

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-card">
      <div className="flex min-w-0 items-start gap-2.5">
        <BellRing className="mt-0.5 size-4 shrink-0 text-brand-navy" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-text">Email seat alerts</p>
          <p className="mt-0.5 text-xs text-muted" aria-live="polite">
            {preferences.isLoading ? 'Loading your notification settings…' : hint}
          </p>
        </div>
      </div>
      <Switch
        label="Email seat alerts"
        checked={seatAlerts}
        disabled={preferences.isLoading || save.isPending}
        onCheckedChange={(checked) => save.mutate(checked)}
      />
    </div>
  )
}

export function TrainSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const route = readRouteSearch(searchParams)
  const ready = hasSearch(route)
  const filters = toSearchFilters(route)
  const [openSeat, setOpenSeat] = useState<{ trainNumber: string; classCode: string } | null>(
    null,
  )

  const search = useQuery({
    queryKey: ['train-search', filters],
    queryFn: () => searchTrains(filters),
    enabled: ready,
  })

  const apply = (patch: Partial<RouteSearch>) => {
    setSearchParams(buildRouteParams({ ...route, ...patch }), { replace: true })
  }

  const resetFilters = () => {
    apply({
      classCodes: [],
      types: [],
      fromStations: [],
      toStations: [],
      depFrom: 0,
      depTo: 1440,
      arrFrom: 0,
      arrTo: 1440,
    })
  }

  const tryAnotherDate = () => {
    const next = shiftDate(route.date, 1)
    apply({ date: next !== route.date ? next : shiftDate(route.date, -1) })
  }

  const openClassFor = (trainNumber: string) =>
    openSeat?.trainNumber === trainNumber ? openSeat.classCode : null

  if (!ready) {
    const hasPartial = Boolean(searchParams.get('from') || searchParams.get('to'))
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-text">Train Search</h1>
          <p className="mt-1 text-sm text-muted">
            Search the network, compare classes and hold a seat.
          </p>
        </div>
        {hasPartial ? (
          <p
            role="alert"
            className="rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-warning"
          >
            This search link is missing a valid travel date. Choose a date to continue.
          </p>
        ) : null}
        <BookTicketCard />
        <EmailSeatAlertsToggle />
      </div>
    )
  }

  const response = search.data
  const fromName = response?.from.name ?? route.from?.name ?? route.from?.code ?? ''
  const toName = response?.to.name ?? route.to?.name ?? route.to?.code ?? ''

  return (
    <div className="flex flex-col gap-4">
      <ModifySearchBar route={route} fromName={fromName} toName={toName} />

      {search.isLoading ? (
        <div className="space-y-3" aria-label="Loading train results">
          <div className="h-16 animate-pulse rounded-xl bg-surface" />
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-40 animate-pulse rounded-xl bg-surface" />
          ))}
        </div>
      ) : search.isError ? (
        <ErrorState
          title="We could not load trains"
          description={normalizeApiError(search.error).message}
          onRetry={() => void search.refetch()}
        />
      ) : response ? (
        <>
          <ResultsHeader
            route={route}
            count={response.count}
            fromName={fromName}
            toName={toName}
            onDate={(days) => apply({ date: shiftDate(route.date, days) })}
            onSort={(sort) => apply({ sort })}
          />
          <EmailSeatAlertsToggle />

          <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
            {response.count > 0 ? (
              <div className="lg:sticky lg:top-20 lg:self-start">
                <FiltersPanel
                  route={route}
                  response={response}
                  onChange={apply}
                  onReset={resetFilters}
                />
              </div>
            ) : null}

            <div className="flex min-w-0 flex-col gap-3">
              {response.count === 0 ? (
                <EmptyState
                  title="No trains found"
                  description={`No trains match ${fromName} → ${toName} on ${formatHeaderDate(route.date)}. Try another date or remove a filter.`}
                  action={
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <Button onClick={tryAnotherDate}>
                        <CalendarDays aria-hidden="true" />
                        Try another date
                      </Button>
                      {hasRefinements(route) ? (
                        <Button variant="outline" onClick={resetFilters}>
                          <RefreshCw aria-hidden="true" />
                          Remove Filter
                        </Button>
                      ) : null}
                    </div>
                  }
                />
              ) : (
                <ul className="flex flex-col gap-3">
                  {response.results.map((train) => (
                    <li key={`${train.trainNumber}-${train.from.code}-${train.to.code}`}>
                      <TrainCard
                        train={train}
                        date={response.date}
                        openClass={openClassFor(train.trainNumber)}
                        quota={route.quota}
                        onOpenClass={(classCode) =>
                          setOpenSeat(
                            classCode
                              ? { trainNumber: train.trainNumber, classCode }
                              : null,
                          )
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
