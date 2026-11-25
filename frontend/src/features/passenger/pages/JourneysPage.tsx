import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CalendarSearch, Plus, Search, Ticket } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type DataTableColumn } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { normalizeApiError } from '@/lib/apiClient'
import { formatFare } from '@/features/travel/constants'
import { formatLongDate } from '@/features/travel/date'
import { getJourneys, getJourneySummary } from '@/features/journeys/api'
import {
  canCancelJourney,
  canEditJourney,
  JOURNEY_SORTS,
  JOURNEY_STATUS_FILTERS,
  readSortParam,
  readStatusParam,
} from '@/features/journeys/constants'
import { formatSeatList, formatTimeRange } from '@/features/journeys/format'
import type { JourneyListItem, JourneyStatusParam } from '@/features/journeys/types'
import { CancelJourneyDialog, type CancelTarget } from '@/features/journeys/components/CancelJourneyDialog'

const PAGE_SIZE = 10

function JourneysPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = readStatusParam(searchParams.get('status'))
  const query = searchParams.get('q') ?? ''
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''
  const sort = readSortParam(searchParams.get('sort'))
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const rangeInvalid = Boolean(from && to && from > to)
  const hasFilters = status !== 'ALL' || Boolean(query) || Boolean(from) || Boolean(to)

  const [cancelTarget, setCancelTarget] = useState<CancelTarget | null>(null)

  const apply = (patch: Record<string, string | number | null>, resetPage = true) => {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '') {
        next.delete(key)
      } else {
        next.set(key, String(value))
      }
    }
    if (resetPage) {
      next.delete('page')
    }
    setSearchParams(next, { replace: true })
  }

  const summary = useQuery({
    queryKey: ['journeys-summary'],
    queryFn: getJourneySummary,
  })

  const journeys = useQuery({
    queryKey: ['journeys', { status, query, from, to, sort, page }],
    queryFn: () =>
      getJourneys({
        status,
        q: query || undefined,
        from: from || undefined,
        to: to || undefined,
        sort,
        page,
        size: PAGE_SIZE,
      }),
    enabled: !rangeInvalid,
  })

  useEffect(() => {
    const data = journeys.data
    if (data && data.totalPages > 0 && page > data.totalPages) {
      const next = new URLSearchParams(searchParams)
      next.set('page', String(data.totalPages))
      setSearchParams(next, { replace: true })
    }
  }, [journeys.data, page, searchParams, setSearchParams])

  const columns = useMemo<DataTableColumn<JourneyListItem>[]>(
    () => [
      {
        id: 'pnr',
        header: 'PNR',
        cell: (journey) => (
          <span className="font-mono text-sm font-medium tracking-wide">{journey.pnr}</span>
        ),
      },
      {
        id: 'train',
        header: 'Train',
        cell: (journey) => (
          <div className="min-w-0">
            <p className="font-medium text-text">{journey.trainName}</p>
            <p className="text-xs text-muted">
              #{journey.trainNumber}
              {journey.title ? ` · ${journey.title}` : ''}
            </p>
          </div>
        ),
      },
      {
        id: 'route',
        header: 'Route',
        cell: (journey) => (
          <div className="min-w-0">
            <p className="font-medium text-text">
              {journey.from.code} → {journey.to.code}
            </p>
            <p className="max-w-44 truncate text-xs text-muted">
              {journey.from.name} → {journey.to.name}
            </p>
          </div>
        ),
      },
      {
        id: 'travel',
        header: 'Date & time',
        cell: (journey) => (
          <div className="whitespace-nowrap">
            <p className="text-text">{formatLongDate(journey.travelDate)}</p>
            <p className="text-xs text-muted">
              {formatTimeRange(journey.boardingTime, journey.arrivalTime)}
            </p>
          </div>
        ),
      },
      {
        id: 'class',
        header: 'Class & seats',
        cell: (journey) => (
          <div>
            <p className="font-medium text-text">{journey.classCode}</p>
            <p className="text-xs text-muted">{formatSeatList(journey.seatLabels)}</p>
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: (journey) => (
          <div className="flex flex-col items-start gap-1">
            <StatusBadge status={journey.status} />
            {journey.status === 'CANCELLED' && journey.refundAmount != null ? (
              <span className="text-xs text-muted">
                Refund {formatFare(journey.refundAmount)}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        align: 'right',
        cell: (journey) => (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to={`/app/journeys/${journey.id}`}>View</Link>
            </Button>
            {canEditJourney(journey.status) ? (
              <Button asChild size="sm" variant="ghost">
                <Link to={`/app/journeys/${journey.id}?edit=1`}>Edit</Link>
              </Button>
            ) : null}
            {canCancelJourney(journey.status) ? (
              <Button
                size="sm"
                variant="ghost"
                className="text-danger hover:bg-danger-soft"
                onClick={() =>
                  setCancelTarget({
                    id: journey.id,
                    pnr: journey.pnr,
                    trainName: journey.trainName,
                    travelDate: journey.travelDate,
                    boardingTime: journey.boardingTime,
                    totalFare: journey.totalFare,
                  })
                }
              >
                Cancel
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [],
  )

  const clearFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true })
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="My Journeys"
        description="Every booking you have made, with the status, seats and refunds in one place."
        actions={
          <>
            <Button asChild variant="cta">
              <Link to="/app/search">
                <Plus aria-hidden="true" />
                Plan a Journey
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/app/status">
                <CalendarSearch aria-hidden="true" />
                Check Train Status
              </Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-2" role="group" aria-label="Journey status filters">
        {JOURNEY_STATUS_FILTERS.map((filter) => {
          const active = status === filter.value
          const count = summary.data?.[filter.summaryKey]
          return (
            <button
              key={filter.value}
              type="button"
              aria-pressed={active}
              onClick={() => apply({ status: filter.value === 'ALL' ? null : filter.value })}
              className={
                active
                  ? 'flex items-center gap-2 rounded-full border border-brand-navy bg-brand-navy px-3 py-1.5 text-xs font-semibold text-white'
                  : 'flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-muted'
              }
            >
              {filter.label}
              <span
                className={
                  active
                    ? 'rounded-full bg-white/20 px-1.5 text-[11px] tabular-nums'
                    : 'rounded-full bg-surface-muted px-1.5 text-[11px] text-muted tabular-nums'
                }
              >
                {summary.isLoading ? '–' : (count ?? 0)}
              </span>
            </button>
          )
        })}
      </div>

      <div className="rounded-xl border border-border bg-surface p-3">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_200px_160px_160px_190px]">
          <label className="flex w-full flex-col gap-1.5">
            <span className="text-sm font-medium text-text">Search</span>
            <span className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <input
                id="journeys-search"
                type="search"
                value={query}
                placeholder="Train number, station or PNR"
                onChange={(event) => apply({ q: event.target.value })}
                className="h-10 w-full rounded-lg border border-border bg-surface pr-3 pl-9 text-sm text-text placeholder:text-muted/70 focus-visible:border-brand-navy focus-visible:outline-2 focus-visible:outline-brand-navy"
              />
            </span>
          </label>
          <label className="flex w-full flex-col gap-1.5">
            <span className="text-sm font-medium text-text">Status</span>
            <select
              id="journeys-status"
              value={status}
              onChange={(event) =>
                apply({
                  status: event.target.value === 'ALL' ? null : (event.target.value as JourneyStatusParam),
                })
              }
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text focus-visible:border-brand-navy focus-visible:outline-2 focus-visible:outline-brand-navy"
            >
              {JOURNEY_STATUS_FILTERS.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex w-full flex-col gap-1.5">
            <span className="text-sm font-medium text-text">From date</span>
            <input
              id="journeys-from"
              type="date"
              value={from}
              onChange={(event) => apply({ from: event.target.value })}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text focus-visible:border-brand-navy focus-visible:outline-2 focus-visible:outline-brand-navy"
            />
          </label>
          <label className="flex w-full flex-col gap-1.5">
            <span className="text-sm font-medium text-text">To date</span>
            <input
              id="journeys-to"
              type="date"
              value={to}
              onChange={(event) => apply({ to: event.target.value })}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text focus-visible:border-brand-navy focus-visible:outline-2 focus-visible:outline-brand-navy"
            />
          </label>
          <label className="flex w-full flex-col gap-1.5">
            <span className="text-sm font-medium text-text">Sort by</span>
            <select
              id="journeys-sort"
              value={sort}
              onChange={(event) => apply({ sort: event.target.value })}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text focus-visible:border-brand-navy focus-visible:outline-2 focus-visible:outline-brand-navy"
            >
              {JOURNEY_SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {rangeInvalid ? (
          <p role="alert" className="mt-2 text-xs font-medium text-danger">
            The start date must be on or before the end date.
          </p>
        ) : hasFilters ? (
          <div className="mt-2 flex justify-end">
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        ) : null}
      </div>

      {rangeInvalid ? null : journeys.isLoading ? (
        <div className="flex flex-col gap-2" aria-label="Loading journeys">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-16 animate-pulse rounded-xl bg-surface" />
          ))}
        </div>
      ) : journeys.isError ? (
        <ErrorState
          title="We could not load your journeys"
          description={normalizeApiError(journeys.error).message}
          onRetry={() => void journeys.refetch()}
        />
      ) : journeys.data && journeys.data.items.length > 0 ? (
        <>
          <DataTable
            caption="Your booked journeys"
            columns={columns}
            rows={journeys.data.items}
            getRowKey={(journey) => String(journey.id)}
            emptyDescription="No journeys to show."
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted">
              Page {journeys.data.page} of {Math.max(1, journeys.data.totalPages)} ·{' '}
              {journeys.data.totalItems} journey
              {journeys.data.totalItems === 1 ? '' : 's'}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => apply({ page: page - 1 }, false)}
              >
                <ArrowLeft aria-hidden="true" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= journeys.data.totalPages}
                onClick={() => apply({ page: page + 1 }, false)}
              >
                Next
                <ArrowRight aria-hidden="true" />
              </Button>
            </div>
          </div>
        </>
      ) : hasFilters ? (
        <EmptyState
          icon={Search}
          title="No journeys match these filters"
          description="Try a different status, search term or date range."
          action={
            <Button variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <EmptyState
          icon={Ticket}
          title="No journeys planned yet"
          description="Search trains to plan your next trip."
          action={
            <Button asChild variant="cta">
              <Link to="/app/search">
                <Plus aria-hidden="true" />
                Plan a Journey
              </Link>
            </Button>
          }
        />
      )}

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

export { JourneysPage }
