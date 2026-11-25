import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  BedDouble,
  CalendarClock,
  CircleCheck,
  Info,
  Link2Off,
  Moon,
  Route,
  TriangleAlert,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { normalizeApiError } from '@/lib/apiClient'
import { formatLongDate } from '@/features/travel/date'
import { formatDayTime } from '@/features/journeys/format'
import { getMyDisruption } from '@/features/disruptions/api'
import {
  disruptionStatusMeta,
  formatDelay,
  impactMeta,
  severityMeta,
  typeLabel,
} from '@/features/disruptions/constants'

function DisruptionDetailPage() {
  const { id } = useParams()
  const disruptionId = Number(id)
  const validId = Number.isInteger(disruptionId) && disruptionId > 0

  const disruption = useQuery({
    queryKey: ['my-disruption', disruptionId],
    queryFn: () => getMyDisruption(disruptionId),
    enabled: validId,
    refetchInterval: 30_000,
  })

  const detail = disruption.data

  if (!validId) {
    return (
      <EmptyState
        title="Update not found"
        description="This disruption update does not exist or does not affect one of your journeys."
        action={
          <Button asChild variant="outline">
            <Link to="/app/disruptions">Back to disruption updates</Link>
          </Button>
        }
      />
    )
  }

  if (disruption.isLoading) {
    return (
      <div className="flex flex-col gap-3" aria-label="Loading disruption update">
        <div className="h-9 w-56 animate-pulse rounded-lg bg-surface" />
        <div className="h-40 animate-pulse rounded-xl bg-surface" />
        <div className="h-56 animate-pulse rounded-xl bg-surface" />
      </div>
    )
  }

  if (disruption.isError) {
    const normalized = normalizeApiError(disruption.error)
    if (normalized.status === 404) {
      return (
        <EmptyState
          title="Update not found"
          description="This disruption update does not exist or does not affect one of your journeys."
          action={
            <Button asChild variant="outline">
              <Link to="/app/disruptions">Back to disruption updates</Link>
            </Button>
          }
        />
      )
    }
    return (
      <ErrorState
        title="We could not load this update"
        description={normalized.message}
        onRetry={() => void disruption.refetch()}
      />
    )
  }

  if (!detail) {
    return null
  }

  const statusMeta = disruptionStatusMeta(detail.status)
  const severity = severityMeta(detail.severity)

  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/app/disruptions"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-brand-navy hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to disruption updates
      </Link>

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-text">
            {detail.trainName}{' '}
            <span className="font-normal text-muted">· {detail.trainNumber}</span>
          </h1>
          <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
          <Badge tone={severity.tone}>{severity.label}</Badge>
        </div>
        <p className="text-sm text-muted">
          {formatLongDate(detail.travelDate)} · {typeLabel(detail.type)} ·{' '}
          {formatDelay(detail.type, detail.delayMinutes)} · logged {formatDayTime(detail.createdAt)}
        </p>
        <p className="text-sm text-text">Reason: {detail.reason}</p>
      </header>

      {detail.status === 'RESOLVED' ? (
        <p className="flex items-start gap-2 rounded-lg border border-success/20 bg-success-soft px-3 py-2 text-sm text-success">
          <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          This disruption has been resolved. Alternatives stay on record but are no longer active.
        </p>
      ) : null}

      {detail.type === 'CANCELLATION' ? (
        <p className="flex items-start gap-2 rounded-lg border border-info/20 bg-info-soft px-3 py-2 text-sm text-info">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          A full refund applies to your original ticket. Your estimated refund appears on the
          journey details page.
        </p>
      ) : null}

      {detail.impacts.length === 0 ? (
        <EmptyState
          icon={TriangleAlert}
          title="No journeys affected"
          description="This update no longer lists any of your journeys."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {detail.impacts.map((impact) => {
            const level = impactMeta(impact.impactLevel)
            return (
              <li key={impact.impactId}>
                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <CardTitle>
                        {impact.fromName} → {impact.toName}
                      </CardTitle>
                      <Badge tone={level.tone}>{level.label}</Badge>
                    </div>
                    <p className="text-xs text-muted">
                      {impact.fromCode} → {impact.toCode} · {formatLongDate(impact.travelDate)}
                    </p>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 pt-3">
                    <p className="text-sm text-text">{impact.summary}</p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
                      <span className="flex items-center gap-1.5">
                        <CalendarClock className="size-3.5" aria-hidden="true" />
                        Original arrival {formatDayTime(impact.originalArrival)}
                      </span>
                      {impact.newArrival ? (
                        <span className="flex items-center gap-1.5 font-medium text-text">
                          Now arriving {formatDayTime(impact.newArrival)}
                        </span>
                      ) : null}
                      {impact.missedConnection ? (
                        <span className="flex items-center gap-1.5 text-warning">
                          <Link2Off className="size-3.5" aria-hidden="true" />
                          May miss an onward connection
                        </span>
                      ) : null}
                      {impact.overnight ? (
                        <span className="flex items-center gap-1.5 text-warning">
                          <Moon className="size-3.5" aria-hidden="true" />
                          Now runs overnight
                        </span>
                      ) : null}
                      {impact.needsHotel ? (
                        <span className="flex items-center gap-1.5 text-warning">
                          <BedDouble className="size-3.5" aria-hidden="true" />
                          Hotel needed
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                      <Button asChild size="sm" variant="cta">
                        <Link to={`/app/recovery?journey=${impact.journeyId}`}>
                          <Route aria-hidden="true" />
                          View alternatives
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/app/journeys/${impact.journeyId}`}>Journey details</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      <p className="text-xs text-muted">This update refreshes every 30 seconds while open.</p>
    </div>
  )
}

export { DisruptionDetailPage }
