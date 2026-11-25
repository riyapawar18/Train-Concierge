import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BedDouble,
  CalendarClock,
  Link2Off,
  Moon,
  Route,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { normalizeApiError } from '@/lib/apiClient'
import { formatLongDate } from '@/features/travel/date'
import { formatDayTime } from '@/features/journeys/format'
import { getMyDisruptions } from '@/features/disruptions/api'
import {
  disruptionStatusMeta,
  formatDelay,
  impactMeta,
  PASSENGER_STATUS_FILTERS,
  severityMeta,
} from '@/features/disruptions/constants'
import type { DisruptionStatus } from '@/features/disruptions/types'

function DisruptionsPage() {
  const [status, setStatus] = useState<DisruptionStatus | 'ALL'>('ACTIVE')

  const disruptions = useQuery({
    queryKey: ['my-disruptions', status],
    queryFn: () => getMyDisruptions(status === 'ALL' ? undefined : status),
    refetchInterval: 30_000,
  })

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Disruption updates"
        description="Delays, cancellations and missed connections that affect your journeys, with the latest update first."
        actions={
          <Button asChild variant="outline">
            <Link to="/app/journeys">My Journeys</Link>
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2" role="group" aria-label="Disruption status filters">
        {PASSENGER_STATUS_FILTERS.map((filter) => {
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

      {disruptions.isLoading ? (
        <div className="flex flex-col gap-3" aria-label="Loading disruption updates">
          {[0, 1].map((item) => (
            <div key={item} className="h-40 animate-pulse rounded-xl bg-surface" />
          ))}
        </div>
      ) : disruptions.isError ? (
        <ErrorState
          title="We could not load disruption updates"
          description={normalizeApiError(disruptions.error).message}
          onRetry={() => void disruptions.refetch()}
        />
      ) : disruptions.data && disruptions.data.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {disruptions.data.map((item) => {
            const statusMeta = disruptionStatusMeta(item.status)
            const level = impactMeta(item.impactLevel)
            const severity = severityMeta(item.severity)
            return (
              <li key={item.impactId}>
                <Card
                  className={
                    item.status === 'ACTIVE'
                      ? 'border-l-4 border-l-danger'
                      : 'border-l-4 border-l-success'
                  }
                >
                  <CardContent className="flex flex-col gap-3 p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base font-semibold text-text">
                            {item.trainName}{' '}
                            <span className="font-normal text-muted">· {item.trainNumber}</span>
                          </h2>
                          <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                          <Badge tone={level.tone}>{level.label}</Badge>
                          <Badge tone={severity.tone}>{severity.label}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted">
                          {formatLongDate(item.travelDate)} · {item.fromCode} → {item.toCode} ·{' '}
                          {formatDelay(item.type, item.delayMinutes)}
                        </p>
                      </div>
                      <p className="text-xs text-muted">Updated {formatDayTime(item.createdAt)}</p>
                    </div>

                    <p className="text-sm text-text">{item.summary}</p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
                      <span className="flex items-center gap-1.5">
                        <CalendarClock className="size-3.5" aria-hidden="true" />
                        Original arrival {formatDayTime(item.originalArrival)}
                      </span>
                      {item.newArrival ? (
                        <span className="flex items-center gap-1.5 font-medium text-text">
                          Now arriving {formatDayTime(item.newArrival)}
                        </span>
                      ) : null}
                      {item.missedConnection ? (
                        <span className="flex items-center gap-1.5 text-warning">
                          <Link2Off className="size-3.5" aria-hidden="true" />
                          May miss an onward connection
                        </span>
                      ) : null}
                      {item.overnight ? (
                        <span className="flex items-center gap-1.5 text-warning">
                          <Moon className="size-3.5" aria-hidden="true" />
                          Now runs overnight
                        </span>
                      ) : null}
                      {item.needsHotel ? (
                        <span className="flex items-center gap-1.5 text-warning">
                          <BedDouble className="size-3.5" aria-hidden="true" />
                          Hotel needed
                        </span>
                      ) : null}
                    </div>

                    <p className="text-xs text-muted">Reason: {item.reason}</p>

                    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/app/disruptions/${item.id}`}>View update</Link>
                      </Button>
                      <Button asChild size="sm" variant="cta">
                        <Link to={`/app/recovery?journey=${item.journeyId}`}>
                          <Route aria-hidden="true" />
                          View alternatives
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="ghost">
                        <Link to={`/app/journeys/${item.journeyId}`}>
                          Journey details
                          <ArrowRight aria-hidden="true" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      ) : status === 'ACTIVE' ? (
        <EmptyState
          icon={ShieldCheck}
          title="All clear"
          description="There are no delays or cancellations affecting your journeys right now. We will update this page if anything changes."
          action={
            <Button asChild variant="outline">
              <Link to="/app/journeys">View my journeys</Link>
            </Button>
          }
        />
      ) : (
        <EmptyState
          icon={TriangleAlert}
          title="No disruption updates"
          description={
            status === 'RESOLVED'
              ? 'Resolved disruptions will stay here as a record once they are cleared.'
              : 'There are no disruption updates for your journeys yet.'
          }
        />
      )}

      <p className="text-xs text-muted">This page refreshes every 30 seconds while it is open.</p>
    </div>
  )
}

export { DisruptionsPage }
