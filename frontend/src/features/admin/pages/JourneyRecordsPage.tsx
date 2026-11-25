import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Flag, Search } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type DataTableColumn } from '@/components/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useToast } from '@/components/ui/toast'
import { getAdminJourneys, cancelAdminJourney, flagJourney, type JourneyAdminSummary } from '../api'

export function JourneyRecordsPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)
  const [cancelTarget, setCancelTarget] = useState<JourneyAdminSummary | null>(null)

  const list = useQuery({
    queryKey: ['admin-journeys', search, status, page],
    queryFn: () => getAdminJourneys({ train: search || undefined, status: status || undefined, page, size: 20 }),
  })

  const cancel = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => cancelAdminJourney(id, reason),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['admin-journeys'] }); toast({ title: 'Journey cancelled', tone: 'success' }) },
  })

  const flag = useMutation({
    mutationFn: ({ id, flagged }: { id: number; flagged: boolean }) => flagJourney(id, flagged),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-journeys'] }),
  })

  const STATUSES = ['', 'UPCOMING', 'DISRUPTED', 'REBOOKED', 'CANCELLED']

  const cols: DataTableColumn<JourneyAdminSummary>[] = [
    {
      id: 'journey', header: 'Journey',
      cell: r => (
        <div>
          <p className="font-medium text-text">{r.pnr}</p>
          <p className="text-xs text-muted">{r.trainName} · {r.travelDate}</p>
        </div>
      ),
    },
    { id: 'route', header: 'Route', cell: r => <span className="text-sm">{r.fromName} → {r.toName}</span> },
    {
      id: 'status', header: 'Status',
      cell: r => <Badge tone={r.status === 'DISRUPTED' ? 'danger' : r.status === 'REBOOKED' ? 'success' : 'neutral'}>{r.status}</Badge>,
    },
    {
      id: 'actions', header: '', align: 'right',
      cell: r => (
        <div className="flex gap-1">
          {r.flagged && <Flag className="size-4 text-warning self-center" aria-hidden />}
          <Button size="sm" variant="outline" onClick={() => flag.mutate({ id: r.id, flagged: !r.flagged })}>
            {r.flagged ? 'Unflag' : 'Flag'}
          </Button>
          {r.status !== 'CANCELLED' && (
            <Button size="sm" variant="ghost" className="text-danger" onClick={() => setCancelTarget(r)}>Cancel</Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Journey Management" description="View and manage all passenger journeys." />

      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Train name or number"
            className="h-10 rounded-lg border border-border bg-surface pr-3 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy" />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)} className="h-10 rounded-lg border border-border bg-surface px-3 text-sm">
          {STATUSES.map(s => <option key={s} value={s}>{s || 'All statuses'}</option>)}
        </select>
      </div>

      {list.isLoading
        ? <div className="h-48 animate-pulse rounded-xl bg-surface" />
        : <DataTable caption="Journey records" columns={cols} rows={list.data?.content ?? []} getRowKey={r => String(r.id)} emptyDescription="No journeys found." />
      }

      {list.data && list.data.totalPages > 1 && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="self-center text-sm text-muted">Page {page + 1} / {list.data.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= list.data.totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}

      <ConfirmDialog
        open={cancelTarget !== null}
        onOpenChange={open => { if (!open) setCancelTarget(null) }}
        title="Cancel journey"
        description={`Cancel journey ${cancelTarget?.pnr ?? ''}? This cannot be undone.`}
        confirmLabel="Cancel journey"
        tone="destructive"
        onConfirm={() => {
          if (cancelTarget) cancel.mutate({ id: cancelTarget.id, reason: 'Admin cancellation' })
          setCancelTarget(null)
        }}
      />
    </div>
  )
}
