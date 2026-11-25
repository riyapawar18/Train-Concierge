import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Bus,
  CheckCircle2,
  Clock3,
  Info,
  Route,
  Search,
  TrainFront,
  TriangleAlert,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { normalizeApiError } from '@/lib/apiClient'
import { formatFare, formatDuration } from '@/features/travel/constants'
import { formatLongDate } from '@/features/travel/date'
import { formatDayTime, parseLocalDateTime } from '@/features/journeys/format'
import { getJourneyImpact, getMyDisruptions, getRecommendations } from '@/features/disruptions/api'
import {
  disruptionStatusMeta,
  formatDelay,
  impactMeta,
  kindMeta,
} from '@/features/disruptions/constants'
import type { Recommendation, RecommendationKind } from '@/features/disruptions/types'

type KindFilter = RecommendationKind | 'ALL'

const KIND_FILTERS: Array<{ value: KindFilter; label: string }> = [
  { value: 'ALL', label: 'All options' },
  { value: 'TRAIN', label: 'Trains' },
  { value: 'BUS', label: 'Buses' },
  { value: 'WAIT', label: 'Wait' },
]

const KIND_ICON = {
  TRAIN: TrainFront,
  BUS: Bus,
  WAIT: Clock3,
} satisfies Record<RecommendationKind, typeof TrainFront>

function durationLabel(recommendation: Recommendation): string {
  const departure = parseLocalDateTime(recommendation.departureAt)
  const arrival = parseLocalDateTime(recommendation.arrivalAt)
  if (!departure || !arrival) return ''
  const minutes = Math.max(1, Math.round((arrival.getTime() - departure.getTime()) / 60_000))
  return formatDuration(minutes)
}

/**
 * Recovery Recommendations page.
 *
 * If `?journey=<id>` is in the URL, shows recommendations for that journey.
 * Otherwise lists all disrupted journeys so the passenger can pick one.
 * Never renders blank — always shows an empty state or error state with actions.
 */
function RecoveryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const journeyIdParam = Number(searchParams.get('journey'))
  const validId = Number.isInteger(journeyIdParam) && journeyIdParam > 0
  const selectedOption = Number(searchParams.get('option'))
  const highlightedOption =
    Number.isInteger(selectedOption) && selectedOption > 0 ? selectedOption : null
  const [kind, setKind] = useState<KindFilter>('ALL')

  // Always load disrupted journeys so we can auto-select or show a list
  const myDisruptions = useQuery({
    queryKey: ['my-disruptions-active'],
    queryFn: () => getMyDisruptions('ACTIVE'),
    refetchInterval: 30_000,
  })

  // Derive the journey id to use — from URL param or auto-select first disrupted journey
  const autoJourneyId = useMemo(() => {
    if (validId) return journeyIdParam
    const first = myDisruptions.data?.[0]
    return first ? first.journeyId : null
  }, [validId, journeyIdParam, myDisruptions.data])

  const impact = useQuery({
    queryKey: ['journey-impact', autoJourneyId],
    queryFn: () => getJourneyImpact(autoJourneyId!),
    enabled: autoJourneyId != null,
    refetchInterval: 30_000,
  })

  const recommendations = useQuery({
    queryKey: ['journey-recommendations', autoJourneyId],
    queryFn: () => getRecommendations(autoJourneyId!),
    enabled: autoJourneyId != null,
    refetchInterval: 30_000,
  })

  const counts = useMemo(() => {
    const map: Record<KindFilter, number> = { ALL: 0, TRAIN: 0, BUS: 0, WAIT: 0 }
    for (const item of recommendations.data ?? []) {
      map.ALL += 1
      map[item.kind] += 1
    }
    return map
  }, [recommendations.data])

  const visible = useMemo(
    () => (recommendations.data ?? []).filter((item) => kind === 'ALL' || item.kind === kind),
    [recommendations.data, kind],
  )

  const data = impact.data
  const level = data ? impactMeta(data.impactLevel) : null
  const disruptionStatus = data ? disruptionStatusMeta(data.disruptionStatus) : null
  const backTo = data ? `/app/disruptions/${data.disruptionId}` : '/app/disruptions'

  // ── Loading state ──────────────────────────────────────────────────────────
  if (myDisruptions.isLoading) {
    return (
      <div className="flex flex-col gap-3" aria-label="Loading recovery options">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-surface" />
        <div className="h-28 animate-pulse rounded-xl bg-surface" />
        <div className="h-48 animate-pulse rounded-xl bg-surface" />
      </div>
    )
  }

  // ── Error loading disruptions ──────────────────────────────────────────────
  if (myDisruptions.isError) {
    return (
      <ErrorState
        title="We could not load your disruptions"
        description={normalizeApiError(myDisruptions.error).message}
        onRetry={() => void myDisruptions.refetch()}
      />
    )
  }

  // ── No disrupted journeys ──────────────────────────────────────────────────
  if (!myDisruptions.isLoading && (myDisruptions.data?.length ?? 0) === 0 && !validId) {
    return (
      <EmptyState
        icon={Route}
        title="Nothing needs your attention right now"
        description="Recovery options appear here when a delay or cancellation affects one of your journeys. Your upcoming journeys are all on schedule."
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="cta">
              <Link to="/app/journeys">View my journeys</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/app/search">
                <Search aria-hidden="true" />
                Search trains
              </Link>
            </Button>
          </div>
        }
      />
    )
  }

  // ── Journey selector — multiple disrupted journeys ─────────────────────────
  const hasMultiple = (myDisruptions.data?.length ?? 0) > 1

  return (
    <div className="flex flex-col gap-4">
      {/* Back link (only when drilled into a specific journey) */}
      {validId && (
        <Link
          to={backTo}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-brand-navy hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to disruption update
        </Link>
      )}

      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-text">Recovery options</h1>
        {data && (
          <p className="text-sm text-muted">
            {data.trainName} · {data.trainNumber} · {data.fromCode} → {data.toCode} ·{' '}
            {formatLongDate((data.newArrival ?? data.originalArrival).slice(0, 10))} ·{' '}
            {formatDelay(data.disruptionType, data.delayMinutes)}
          </p>
        )}
        {!data && !impact.isLoading && (
          <p className="text-sm text-muted">
            Showing alternatives for your disrupted journey.
          </p>
        )}
      </header>

      {/* Journey selector when multiple disrupted journeys */}
      {hasMultiple && myDisruptions.data && (
        <Card>
          <CardHeader>
            <CardTitle>Your affected journeys</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {myDisruptions.data.map((d) => (
              <button
                key={d.journeyId}
                onClick={() => {
                  const next = new URLSearchParams(searchParams)
                  next.set('journey', String(d.journeyId))
                  setSearchParams(next, { replace: true })
                  setKind('ALL')
                }}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm text-left transition-colors ${
                  autoJourneyId === d.journeyId
                    ? 'border-brand-navy bg-brand-navy/5 font-medium text-brand-navy'
                    : 'border-border hover:bg-surface-muted'
                }`}
              >
                <span>
                  {d.trainName} · {d.fromCode} → {d.toCode} ·{' '}
                  {formatLongDate(d.travelDate)}
                </span>
                <Badge tone="danger">Disrupted</Badge>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Impact + loading states */}
      {(impact.isLoading || recommendations.isLoading) && autoJourneyId != null ? (
        <div className="flex flex-col gap-3" aria-label="Loading recovery options">
          <div className="h-28 animate-pulse rounded-xl bg-surface" />
          <div className="h-48 animate-pulse rounded-xl bg-surface" />
        </div>
      ) : impact.isError ? (
        <ErrorState
          title="We could not load this journey impact"
          description={normalizeApiError(impact.error).message}
          onRetry={() => void impact.refetch()}
        />
      ) : recommendations.isError ? (
        <ErrorState
          title="We could not load recovery options"
          description={normalizeApiError(recommendations.error).message}
          onRetry={() => void recommendations.refetch()}
        />
      ) : (
        <>
          {/* Impact summary card */}
          {data && (
            <Card>
              <CardContent className="flex flex-col gap-3 p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  {disruptionStatus && <Badge tone={disruptionStatus.tone}>{disruptionStatus.label}</Badge>}
                  {level && <Badge tone={level.tone}>{level.label}</Badge>}
                </div>
                <p className="text-sm text-text">{data.summary}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
                  <span>
                    Original arrival {formatDayTime(data.originalArrival)}
                    {data.newArrival ? ` · now arriving ${formatDayTime(data.newArrival)}` : ''}
                  </span>
                  {data.refundNote && (
                    <span className="flex items-center gap-1.5 font-medium text-info">
                      <Info className="size-3.5" aria-hidden="true" />
                      {data.refundNote}
                    </span>
                  )}
                </div>
                {data.disruptionStatus === 'RESOLVED' && (
                  <p className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-xs text-muted">
                    This disruption is resolved. These alternatives are kept for reference.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Kind filter tabs */}
          <div className="flex flex-wrap gap-2" role="group" aria-label="Recovery option type">
            {KIND_FILTERS.map((filter) => {
              const active = kind === filter.value
              return (
                <button
                  key={filter.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setKind(filter.value)}
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
                    {counts[filter.value]}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Recommendation cards or empty state */}
          {recommendations.data && recommendations.data.length === 0 ? (
            <EmptyState
              icon={Route}
              title="No alternatives available yet"
              description="We could not find a train or bus that improves this journey right now. This page refreshes every 30 seconds."
              action={
                <Button asChild variant="outline">
                  <Link to={`/app/journeys/${autoJourneyId}`}>View journey details</Link>
                </Button>
              }
            />
          ) : visible.length === 0 ? (
            <EmptyState
              icon={Route}
              title={`No ${kind === 'ALL' ? '' : kind.toLowerCase()} options`}
              description="No options of this type were found for this journey."
              action={<Button variant="outline" onClick={() => setKind('ALL')}>Show all options</Button>}
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {visible.map((item) => {
                const meta = kindMeta(item.kind)
                const Icon = KIND_ICON[item.kind]
                const duration = durationLabel(item)
                return (
                  <li key={item.id}>
                    <Card
                      className={
                        item.id === highlightedOption
                          ? 'border-accent-orange ring-2 ring-accent-orange/30'
                          : item.recommended
                            ? 'border-brand-navy/40 ring-1 ring-brand-navy/15'
                            : ''
                      }
                    >
                      <CardContent className="flex flex-col gap-3 p-4 sm:p-5">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex min-w-0 items-start gap-3">
                            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-muted text-brand-navy">
                              <Icon className="size-5" aria-hidden="true" />
                            </span>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge tone="outline">Option {item.rank}</Badge>
                                <Badge tone={meta.tone}>{meta.label}</Badge>
                                {item.recommended && <Badge tone="success">Best option</Badge>}
                                {item.id === highlightedOption && <Badge tone="warning">Selected option</Badge>}
                              </div>
                              <p className="mt-1 text-base font-semibold text-text">
                                {item.refName ?? (item.kind === 'WAIT' ? 'Wait for your train' : 'Alternative')}
                                {item.refTrainNumber && (
                                  <span className="font-normal text-muted"> · {item.refTrainNumber}</span>
                                )}
                              </p>
                              <p className="text-xs text-muted">
                                {item.fromStation} → {item.toStation}
                                {item.classCode ? ` · ${item.className ?? item.classCode}` : ''}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-text">{formatFare(item.fare)}</p>
                            <p className="flex items-center justify-end gap-1 text-xs text-muted">
                              <Users className="size-3" aria-hidden="true" />
                              {item.seatsAvailable} seat{item.seatsAvailable === 1 ? '' : 's'}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-surface-muted/60 px-3 py-2 text-sm">
                          <span className="text-text">{formatDayTime(item.departureAt)}</span>
                          <span className="text-muted">→</span>
                          <span className="text-text">{formatDayTime(item.arrivalAt)}</span>
                          {duration && <span className="text-xs text-muted">{duration}</span>}
                          <span className="ml-auto text-xs text-muted">Score {item.score}</span>
                        </div>

                        {item.reasons.length > 0 && (
                          <ul className="flex flex-col gap-1">
                            {item.reasons.map((reason) => (
                              <li key={reason} className="flex items-start gap-2 text-xs text-text">
                                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden="true" />
                                {reason}
                              </li>
                            ))}
                          </ul>
                        )}

                        {item.warnings.length > 0 && (
                          <ul className="flex flex-col gap-1">
                            {item.warnings.map((warning) => (
                              <li key={warning} className="flex items-start gap-2 text-xs text-warning">
                                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                                {warning}
                              </li>
                            ))}
                          </ul>
                        )}

                        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                          <Button asChild size="sm" variant="outline">
                            <Link to={`/app/journeys/${autoJourneyId}`}>Journey details</Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                )
              })}
            </ul>
          )}

          <p className="text-xs text-muted">
            Alternatives are ranked by arrival time, seat availability, fare and the class you booked.
            This page refreshes every 30 seconds while open.
          </p>
        </>
      )}
    </div>
  )
}

export { RecoveryPage }
