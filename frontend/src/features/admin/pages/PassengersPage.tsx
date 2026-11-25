import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type DataTableColumn } from '@/components/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { Sheet } from '@/components/ui/sheet'
import { getPassengers, getPassenger, setPassengerEnabled, type PassengerSummary } from '../api'

export function PassengersPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const list = useQuery({
    queryKey: ['admin-passengers', q, page],
    queryFn: () => getPassengers(q || undefined, page, 20),
  })

  const detail = useQuery({
    queryKey: ['admin-passenger', selectedId],
    queryFn: () => getPassenger(selectedId!),
    enabled: selectedId !== null,
  })

  const toggle = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) => setPassengerEnabled(id, enabled),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-passengers'] })
      void qc.invalidateQueries({ queryKey: ['admin-passenger', selectedId] })
      toast({ title: 'Account updated', tone: 'success' })
    },
  })

  const columns: DataTableColumn<PassengerSummary>[] = [
    {
      id: 'name', header: 'Name',
      cell: r => (
        <div>
          <p className="font-medium text-text">{r.fullName}</p>
          <p className="text-xs text-muted">{r.email}</p>
        </div>
      ),
    },
    { id: 'mobile', header: 'Mobile', cell: r => <span className="text-sm text-muted">{r.mobile ?? '—'}</span> },
    { id: 'journeys', header: 'Journeys', cell: r => <span className="tabular-nums text-sm">{r.journeyCount}</span> },
    { id: 'status', header: 'Status', cell: r => <Badge tone={r.enabled ? 'success' : 'neutral'}>{r.enabled ? 'Active' : 'Disabled'}</Badge> },
    { id: 'actions', header: '', align: 'right', cell: r => <Button size="sm" variant="outline" onClick={() => setSelectedId(r.id)}>View</Button> },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Passenger Management" description="Search and manage passenger accounts." />

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <input value={q} onChange={e => { setQ(e.target.value); setPage(0) }} placeholder="Search by name or email"
          className="h-10 w-full max-w-sm rounded-lg border border-border bg-surface pr-3 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy" />
      </div>

      {list.isLoading
        ? <div className="h-48 animate-pulse rounded-xl bg-surface" />
        : <DataTable caption="Passengers" columns={columns} rows={list.data?.content ?? []} getRowKey={r => String(r.id)} emptyDescription="No passengers found." />
      }

      {list.data && list.data.totalPages > 1 && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="self-center text-sm text-muted">Page {page + 1} / {list.data.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= list.data.totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}

      <Sheet open={selectedId !== null} onOpenChange={open => { if (!open) setSelectedId(null) }}>
        {detail.data && (
          <div className="flex flex-col gap-4 p-6">
            <h2 className="text-xl font-semibold">{detail.data.summary.fullName}</h2>
            <p className="text-sm text-muted">{detail.data.summary.email}</p>
            <Badge tone={detail.data.summary.enabled ? 'success' : 'neutral'} className="w-fit">
              {detail.data.summary.enabled ? 'Active' : 'Disabled'}
            </Badge>
            <Card>
              <CardContent className="grid grid-cols-2 gap-3 pt-4 text-sm">
                <div><p className="text-muted">Journeys</p><p className="font-semibold">{detail.data.journeyCount}</p></div>
                <div><p className="text-muted">Hotel bookings</p><p className="font-semibold">{detail.data.hotelBookings}</p></div>
              </CardContent>
            </Card>
            {detail.data.recentNotifications.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Recent notifications</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    {detail.data.recentNotifications.map(n => (
                      <li key={n.id} className="flex items-center justify-between gap-2">
                        <span className="truncate text-text">{n.title}</span>
                        <Badge tone={n.deliveryStatus === 'SENT' ? 'success' : 'neutral'}>{n.deliveryStatus}</Badge>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
            <Button
              variant="outline"
              className={detail.data.summary.enabled ? 'text-danger' : ''}
              onClick={() => toggle.mutate({ id: detail.data!.summary.id, enabled: !detail.data!.summary.enabled })}
              disabled={toggle.isPending}
            >
              {detail.data.summary.enabled ? 'Disable account' : 'Enable account'}
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  )
}
