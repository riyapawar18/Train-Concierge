import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Bell,
  CalendarClock,
  Hotel,
  MapPin,
  PlaneTakeoff,
  Repeat,
  Search,
  ShieldCheck,
  Ticket,
  TriangleAlert,
} from 'lucide-react'
import { useSession } from '@/app/SessionProvider'
import { BrandMark } from '@/components/BrandMark'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { StatCard } from '@/components/StatCard'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { normalizeApiError } from '@/lib/apiClient'
import { formatLongDate } from '@/features/travel/date'
import { getJourneys, getJourneySummary } from '@/features/journeys/api'
import { getMyDisruptions } from '@/features/disruptions/api'
import { getNotifications } from '@/features/notifications/api'
import { formatDelay } from '@/features/disruptions/constants'
import {
  formatClock,
  formatDayTime,
  formatJourneyDuration,
  formatSeatList,
  formatTimeRange,
} from '@/features/journeys/format'
import type { JourneyListItem } from '@/features/journeys/types'

const QUICK_ACTIONS = [
  { label: 'Search Trains', to: '/app/search', icon: Search },
  { label: 'My Bookings', to: '/app/journeys', icon: Ticket },
  { label: 'Rebooking', to: '/app/recovery', icon: Repeat },
  { label: 'Hotels & Stays', to: '/app/hotels', icon: Hotel },
]

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{children}</h2>
  )
}

function UpcomingJourneyCard({ journey }: { journey: JourneyListItem }) {
  const duration = formatJourneyDuration(journey.boardingTime, journey.arrivalTime)

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-text">
            {journey.from.city} — {journey.to.city}
          </p>
          <StatusBadge status={journey.status} />
        </div>

        <p className="text-lg font-semibold tracking-tight text-text">
          {journey.trainName}{' '}
          <span className="text-sm font-normal text-muted">· {journey.trainNumber}</span>
        </p>

        <div className="flex items-center gap-3 rounded-lg bg-surface-muted px-4 py-3">
          <div className="min-w-0">
            <p className="text-base font-semibold tabular-nums text-text">
              {formatClock(journey.boardingTime)}
            </p>
            <p className="truncate text-xs text-muted">{journey.from.name}</p>
          </div>
          <div className="flex flex-1 flex-col items-center gap-0.5 text-muted">
            {duration ? <p className="text-xs tabular-nums">{duration}</p> : null}
            <ArrowRight className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 text-right">
            <p className="text-base font-semibold tabular-nums text-text">
              {formatClock(journey.arrivalTime)}
            </p>
            <p className="truncate text-xs text-muted">{journey.to.name}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <p className="text-xs text-muted">
            PNR <span className="font-mono text-text">{journey.pnr}</span> ·{' '}
            {formatSeatList(journey.seatLabels)}
          </p>
          <Link
            to={`/app/journeys/${journey.id}`}
            className="flex items-center gap-1 text-xs font-medium text-brand-navy hover:underline"
          >
            View ticket
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const { user } = useSession()
  const firstName = user?.fullName.split(' ')[0] ?? 'traveller'

  const summary = useQuery({
    queryKey: ['journeys-summary'],
    queryFn: getJourneySummary,
  })

  const upcoming = useQuery({
    queryKey: ['journeys', { status: 'UPCOMING', size: 3, sort: 'TRAVEL_DATE_ASC' }],
    queryFn: () => getJourneys({ status: 'UPCOMING', size: 3, sort: 'TRAVEL_DATE_ASC' }),
  })

  const recent = useQuery({
    queryKey: ['journeys', { size: 5, sort: 'CREATED_DESC' }],
    queryFn: () => getJourneys({ size: 5, sort: 'CREATED_DESC' }),
  })

  const activeDisruptions = useQuery({
    queryKey: ['my-disruptions', 'ACTIVE'],
    queryFn: () => getMyDisruptions('ACTIVE'),
    refetchInterval: 30_000,
  })

  const seatAlerts = useQuery({
    queryKey: ['notifications', { filter: 'SEATS', size: 1 }],
    queryFn: () => getNotifications({ filter: 'SEATS', size: 1 }),
  })

  const count = (value: number | undefined) => (summary.isLoading ? '—' : (value ?? 0))

  const nextJourney = upcoming.data?.items[0]
  const otherJourneys = upcoming.data?.items.slice(1) ?? []

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl bg-brand-navy p-5 shadow-card sm:p-6">
        <BrandMark onDark size="sm" />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white">
          Welcome back, {firstName}!
        </h1>
        <p className="mt-1 text-sm text-white/70">Your journey, intelligently managed.</p>

        <div className="mt-5 rounded-xl bg-surface p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-text">
            <MapPin className="size-4 shrink-0 text-brand-navy" aria-hidden="true" />
            Where would you like to go?
          </p>
          <Button asChild variant="cta" className="mt-3 w-full">
            <Link to="/app/search">
              <Search aria-hidden="true" />
              Search Trains
            </Link>
          </Button>
        </div>
      </section>

      {summary.isError ? (
        <ErrorState
          title="We could not load your journey summary"
          description={normalizeApiError(summary.error).message}
          onRetry={() => void summary.refetch()}
        />
      ) : (
        <section className="flex flex-col gap-3">
          <SectionTitle>Travel overview</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Link to="/app/journeys" aria-label="View all bookings">
              <StatCard label="Total bookings" value={count(summary.data?.total)} icon={Ticket} />
            </Link>
            <Link to="/app/journeys?status=UPCOMING" aria-label="View upcoming journeys">
              <StatCard
                label="Upcoming journeys"
                value={count(summary.data?.upcoming)}
                icon={CalendarClock}
              />
            </Link>
            <Link to="/app/disruptions" aria-label="View active disruptions">
              <StatCard
                label="Active disruptions"
                value={count(summary.data?.disruptions)}
                icon={TriangleAlert}
              />
            </Link>
            <Link to="/app/notifications" aria-label="View seat alerts">
              <StatCard
                label="Seat alerts"
                value={seatAlerts.data ? seatAlerts.data.total : '—'}
                icon={Bell}
              />
            </Link>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionTitle>Upcoming journey</SectionTitle>
          <Link
            to="/app/journeys?status=UPCOMING"
            className="flex items-center gap-1 text-xs font-medium text-brand-navy hover:underline"
          >
            View all
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>

        {upcoming.isLoading ? (
          <div
            className="h-48 animate-pulse rounded-xl bg-surface-muted"
            aria-label="Loading upcoming journeys"
          />
        ) : upcoming.isError ? (
          <p className="text-sm text-muted">
            Could not load upcoming journeys.{' '}
            <button
              type="button"
              className="font-medium text-brand-navy underline"
              onClick={() => void upcoming.refetch()}
            >
              Try again
            </button>
          </p>
        ) : nextJourney ? (
          <div className="flex flex-col gap-2">
            <UpcomingJourneyCard journey={nextJourney} />
            {otherJourneys.length > 0 ? (
              <ul className="flex flex-col gap-1">
                {otherJourneys.map((journey) => (
                  <li key={journey.id}>
                    <Link
                      to={`/app/journeys/${journey.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 transition-colors hover:bg-surface-muted"
                    >
                      <span className="text-sm text-text">
                        {journey.trainName}{' '}
                        <span className="text-xs text-muted">· {journey.trainNumber}</span>
                      </span>
                      <span className="text-xs text-muted">
                        {formatLongDate(journey.travelDate)} ·{' '}
                        {formatTimeRange(journey.boardingTime, journey.arrivalTime)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <EmptyState
            icon={Ticket}
            title="No upcoming journeys"
            description="Search trains to plan your next trip."
            action={
              <Button asChild variant="cta" size="sm">
                <Link to="/app/search">
                  <Search aria-hidden="true" />
                  Search Trains
                </Link>
              </Button>
            }
            className="border-0 py-6"
          />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionTitle>Live travel updates</SectionTitle>
        <Card>
          <CardHeader>
            <CardTitle>Travel alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {activeDisruptions.isLoading ? (
              <div className="flex flex-col gap-2" aria-label="Loading travel alerts">
                {[0, 1].map((item) => (
                  <div key={item} className="h-14 animate-pulse rounded-lg bg-surface-muted" />
                ))}
              </div>
            ) : activeDisruptions.isError ? (
              <p className="text-sm text-muted">
                Could not load travel alerts.{' '}
                <button
                  type="button"
                  className="font-medium text-brand-navy underline"
                  onClick={() => void activeDisruptions.refetch()}
                >
                  Try again
                </button>
              </p>
            ) : activeDisruptions.data && activeDisruptions.data.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {activeDisruptions.data.slice(0, 3).map((alert) => (
                  <li key={alert.impactId}>
                    <Link
                      to={`/app/disruptions/${alert.id}`}
                      className="block rounded-lg border border-danger/20 bg-danger-soft/50 p-3 transition-colors hover:bg-danger-soft"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-text">
                          {alert.trainName}{' '}
                          <span className="font-normal text-muted">· {alert.trainNumber}</span>
                        </p>
                        <span className="text-xs font-medium text-danger">
                          {formatDelay(alert.type, alert.delayMinutes)}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted">{alert.summary}</p>
                      <p className="mt-1 text-xs text-muted">
                        {alert.fromCode} → {alert.toCode} · updated{' '}
                        {formatDayTime(alert.createdAt)}
                      </p>
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    to="/app/disruptions"
                    className="flex items-center gap-1 text-xs font-medium text-brand-navy hover:underline"
                  >
                    View all disruption updates
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </li>
              </ul>
            ) : (
              <EmptyState
                icon={ShieldCheck}
                title="All clear"
                description="No disruptions affecting your journeys."
                className="border-0 bg-surface-muted/40 py-6"
              />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <SectionTitle>Quick actions</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.label}
              to={action.to}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-card transition-colors hover:bg-surface-muted"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-navy/10 text-brand-navy">
                <action.icon className="size-4" aria-hidden="true" />
              </span>
              <span className="text-sm font-medium text-text">{action.label}</span>
              <ArrowRight className="ml-auto size-4 text-muted" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.isLoading ? (
            <div className="h-24 animate-pulse rounded-lg bg-surface-muted" />
          ) : recent.isError ? (
            <p className="text-sm text-muted">
              Could not load recent activity.{' '}
              <button
                type="button"
                className="font-medium text-brand-navy underline"
                onClick={() => void recent.refetch()}
              >
                Try again
              </button>
            </p>
          ) : recent.data && recent.data.items.length > 0 ? (
            <ul className="divide-y divide-border">
              {recent.data.items.map((journey) => (
                <li key={journey.id} className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm text-text">
                      Booked {journey.trainName} · {journey.from.code} → {journey.to.code}
                    </p>
                    <p className="text-xs text-muted">
                      {formatDayTime(journey.createdAt)} · PNR{' '}
                      <span className="font-mono">{journey.pnr}</span>
                    </p>
                  </div>
                  <Link
                    to={`/app/journeys/${journey.id}`}
                    className="flex items-center gap-1 text-xs font-medium text-brand-navy hover:underline"
                  >
                    View
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted">
              <PlaneTakeoff className="size-4" aria-hidden="true" />
              Book a ticket to see your activity here.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
