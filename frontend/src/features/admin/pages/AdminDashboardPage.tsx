import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BedDouble, Bell, Plus, Route, TriangleAlert, Users } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/ErrorState'
import { getAdminStats, getRecentActivity, getDelayTrend } from '../api'
import { NewDisruptionDialog } from '@/features/disruptions/components/NewDisruptionDialog'

export function AdminDashboardPage() {
  const [createOpen, setCreateOpen] = useState(false)

  const stats = useQuery({ queryKey: ['admin-stats'], queryFn: getAdminStats, refetchInterval: 30_000 })
  const activity = useQuery({ queryKey: ['admin-activity'], queryFn: () => getRecentActivity(15) })
  const trend = useQuery({ queryKey: ['delay-trend'], queryFn: () => getDelayTrend(7) })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Operations overview"
        description="Live snapshot of journeys, disruptions and recovery."
        actions={
          <Button variant="cta" onClick={() => setCreateOpen(true)}>
            <Plus aria-hidden="true" /> New disruption
          </Button>
        }
      />

      {stats.isError && (
        <ErrorState
          title="Could not load stats"
          description="Check your connection and try again."
          onRetry={() => void stats.refetch()}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Passengers" value={stats.data?.totalPassengers ?? '—'} />
        <StatCard icon={Route} label="Active journeys" value={stats.data?.activeJourneys ?? '—'} />
        <StatCard icon={TriangleAlert} label="Active disruptions" value={stats.data?.activeDisruptions ?? '—'} />
        <StatCard icon={Users} label="Passengers affected" value={stats.data?.passengersAffected ?? '—'} />
        <StatCard icon={Route} label="Rebooked" value={stats.data?.rebooked ?? '—'} />
        <StatCard icon={Bell} label="Notifications today" value={stats.data?.notificationsSentToday ?? '—'} />
        <StatCard icon={BedDouble} label="Hotel stays at risk" value={stats.data?.hotelStaysAtRisk ?? '—'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader><CardTitle>Disruptions last 7 days</CardTitle></CardHeader>
          <CardContent>
            {trend.isLoading && <div className="h-32 animate-pulse rounded-lg bg-surface" />}
            {trend.data && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted uppercase">
                      <th className="px-2 py-2 text-left">Date</th>
                      <th className="px-2 py-2 text-right">Disruptions</th>
                      <th className="px-2 py-2 text-right">Avg delay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trend.data.map(r => (
                      <tr key={r.date} className="border-b border-border last:border-0">
                        <td className="px-2 py-2 text-text">{r.date}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{r.disruptionCount}</td>
                        <td className="px-2 py-2 text-right tabular-nums">
                          {r.avgDelayMinutes > 0 ? `${Math.round(r.avgDelayMinutes)} min` : '—'}
                        </td>
                      </tr>
                    ))}
                    {trend.data.length === 0 && (
                      <tr><td colSpan={3} className="px-2 py-4 text-center text-muted">No disruptions this week</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
          <CardContent>
            {activity.isLoading && <div className="h-32 animate-pulse rounded-lg bg-surface" />}
            {activity.data && (
              <ul className="space-y-2 text-sm">
                {activity.data.map(a => (
                  <li key={a.id} className="flex items-start justify-between gap-2 border-b border-border pb-2 last:border-0">
                    <div className="min-w-0">
                      <p className="font-medium text-text truncate">{a.action.replace(/_/g, ' ')}</p>
                      {a.details && <p className="text-xs text-muted truncate">{a.details}</p>}
                    </div>
                    <span className="shrink-0 text-xs text-muted whitespace-nowrap">
                      {new Date(a.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </li>
                ))}
                {activity.data.length === 0 && <li className="text-muted">No recent activity</li>}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2 text-sm text-muted">
        <Link to="/admin/disruptions" className="hover:text-brand-navy hover:underline">View all disruptions →</Link>
        <span>·</span>
        <Link to="/admin/passengers" className="hover:text-brand-navy hover:underline">Manage passengers →</Link>
      </div>

      <NewDisruptionDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={() => {}} />
    </div>
  )
}
