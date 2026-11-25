import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, RefreshCw, Search, TriangleAlert } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type DataTableColumn } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { normalizeApiError } from '@/lib/apiClient'
import { formatLongDate } from '@/features/travel/date'
import { formatDayTime } from '@/features/journeys/format'
import { getAdminDisruptions } from '@/features/disruptions/api'
import {
  disruptionStatusMeta,
  formatDelay,
  severityMeta,
  STATUS_FILTERS,
} from '@/features/disruptions/constants'
import type { AdminDisruption, DisruptionStatus } from '@/features/disruptions/types'
import { NewDisruptionDialog } from '@/features/disruptions/components/NewDisruptionDialog'
import { AdminDisruptionDrawer } from '@/features/disruptions/components/AdminDisruptionDrawer'

function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function AdminDisruptionsPage() {
  const [status, setStatus] = useState<DisruptionStatus | 'ALL'>('ACTIVE')
  const [train, setTrain] = useState('')
  const [date, setDate] = useState('')
  const debouncedTrain = useDebounced(train)
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const disruptions = useQuery({
    queryKey: ['admin-disruptions', { status, train: debouncedTrain, date }],
    queryFn: () =>
      getAdminDisruptions({
        status,
        train: debouncedTrain.trim() || undefined,
        date: date || undefined,
      }),
    refetchInterval: 30_000,
  })

  const hasFilters = train.trim().length > 0 || date.length > 0

  const columns = useMemo<DataTableColumn<AdminDisruption>[]>(
    () => [
      {
        id: 'train',
        header: 'Train',
        cell: (row) => (
          <div className="min-w-0">
            <p className="font-medium text-text">{row.trainName}</p>
            <p className="text-xs text-muted">#{row.trainNumber}</p>
          </div>
        ),
      },
      {
        id: 'date',
        header: 'Travel date',
        cell: (row) => (
          <span className="whitespace-nowrap text-sm text-text">{formatLongDate(row.travelDate)}</span>
        ),
      },
      {
        id: 'disruption',
        header: 'Disruption',
        cell: (row) => (
          <div className="min-w-0">
            <p className="text-sm font-medium text-text">
              {formatDelay(row.type, row.delayMinutes)}
            </p>
            <p className="max-w-52 truncate text-xs text-muted">{row.reason}</p>
          </div>
        ),
      },
      {
        id: 'severity',
        header: 'Severity',
        cell: (row) => {
          const meta = severityMeta(row.severity)
          return <Badge tone={meta.tone}>{meta.label}</Badge>
        },
      },
      {
        id: 'affected',
        header: 'Affected',
        cell: (row) => (
          <div className="whitespace-nowrap">
            <p className="text-sm text-text">
              {row.affectedPassengers} passenger{row.affectedPassengers === 1 ? '' : 's'}
            </p>
            <p className="text-xs text-muted">
              {row.affectedBookings} booking{row.affectedBookings === 1 ? '' : 's'} ·{' '}
              {row.recommendationCount} options
            </p>
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: (row) => {
          const meta = disruptionStatusMeta(row.status)
          return (
            <div className="flex flex-col items-start gap-1">
              <Badge tone={meta.tone}>{meta.label}</Badge>
              <span className="text-xs text-muted">
                {row.status === 'RESOLVED' && row.resolvedAt
                  ? `Resolved ${formatDayTime(row.resolvedAt)}`
                  : `Logged ${formatDayTime(row.createdAt)}`}
              </span>
            </div>
          )
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        align: 'right',
        cell: (row) => (
          <Button size="sm" variant="outline" onClick={() => setSelectedId(row.id)}>
            View
          </Button>
        ),
      },
    ],
    [],
  )

  const clearFilters = () => {
    setStatus('ALL')
    setTrain('')
    setDate('')
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Disruption Management"
        description="Record delays and cancellations, see which journeys are affected and resolve them once the network recovers."
        actions={
          <>
            <Button variant="outline" onClick={() => void disruptions.refetch()}>
              <RefreshCw aria-hidden="true" />
              Refresh
            </Button>
            <Button variant="cta" onClick={() => setCreateOpen(true)}>
              <Plus aria-hidden="true" />
              New disruption
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Disruption status filters">
        {STATUS_FILTERS.map((filter) => {
          const active = status === filter.value
          return (
            <button
              key={filter.value}
              type="button"
              aria-pressed={active}
              onClick={() => setStatus(filter.value)}
              className={
                active
                  ? 'rounded-full border border-brand-navy bg-brand-navy px-3 py-1.5 text-xs font-semibold text-white'
                  : 'rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-muted'
              }
            >
              {filter.label}
            </button>
          )
        })}
      </div>

      <div className="rounded-xl border border-border bg-surface p-3">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_200px_auto]">
          <label className="flex w-full flex-col gap-1.5">
            <span className="text-sm font-medium text-text">Train</span>
            <span className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <input
                id="admin-disruptions-train"
                type="search"
                value={train}
                placeholder="Train name or number"
                onChange={(event) => setTrain(event.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-surface pr-3 pl-9 text-sm text-text placeholder:text-muted/70 focus-visible:border-brand-navy focus-visible:outline-2 focus-visible:outline-brand-navy"
              />
            </span>
          </label>
          <label className="flex w-full flex-col gap-1.5">
            <span className="text-sm font-medium text-text">Travel date</span>
            <input
              id="admin-disruptions-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text focus-visible:border-brand-navy focus-visible:outline-2 focus-visible:outline-brand-navy"
            />
          </label>
          <div className="flex items-end">
            <Button variant="ghost" onClick={clearFilters} disabled={!hasFilters}>
              Clear filters
            </Button>
          </div>
        </div>
      </div>

      {disruptions.isLoading ? (
        <div className="flex flex-col gap-2" aria-label="Loading disruptions">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-16 animate-pulse rounded-xl bg-surface" />
          ))}
        </div>
      ) : disruptions.isError ? (
        <ErrorState
          title="We could not load disruptions"
          description={normalizeApiError(disruptions.error).message}
          onRetry={() => void disruptions.refetch()}
        />
      ) : disruptions.data && disruptions.data.length > 0 ? (
        <DataTable
          caption="Disruptions across the network"
          columns={columns}
          rows={disruptions.data}
          getRowKey={(row) => String(row.id)}
          emptyDescription="No disruptions to show."
        />
      ) : hasFilters ? (
        <EmptyState
          icon={Search}
          title="No disruptions match these filters"
          description="Try another status, train or travel date."
          action={
            <Button variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <EmptyState
          icon={TriangleAlert}
          title={
            status === 'RESOLVED'
              ? 'No resolved disruptions'
              : status === 'ACTIVE'
                ? 'No active disruptions'
                : 'No disruptions logged'
          }
          description={
            status === 'RESOLVED'
              ? 'Resolved disruptions stay on record here with their affected journeys.'
              : 'When a train is delayed or cancelled, log it here to alert affected passengers and prepare alternatives.'
          }
          action={
            status === 'RESOLVED' ? undefined : (
              <Button variant="cta" onClick={() => setCreateOpen(true)}>
                <Plus aria-hidden="true" />
                New disruption
              </Button>
            )
          }
        />
      )}

      <p className="text-xs text-muted">
        Refreshes every 30 seconds. Resolving a disruption restores affected journeys and stops
        showing alternatives.
      </p>

      <NewDisruptionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => setSelectedId(id)}
      />
      <AdminDisruptionDrawer
        disruptionId={selectedId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null)
          }
        }}
      />
    </div>
  )
}

export { AdminDisruptionsPage }
