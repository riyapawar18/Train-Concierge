import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type DataTableColumn } from '@/components/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { Sheet } from '@/components/ui/sheet'
import { getExtensionRequests, resolveExtensionRequest, type ExtensionRequestAdminEntry } from '../api'

export function AdminHotelsPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [page, setPage] = useState(0)
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState<ExtensionRequestAdminEntry | null>(null)
  const [note, setNote] = useState('')

  const list = useQuery({
    queryKey: ['admin-ext-requests', status, page],
    queryFn: () => getExtensionRequests(status || undefined, page, 20),
  })

  const resolve = useMutation({
    mutationFn: ({ id, decision }: { id: number; decision: string }) =>
      resolveExtensionRequest(id, decision, note),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-ext-requests'] })
      setSelected(null)
      toast({ title: 'Request updated', tone: 'success' })
    },
  })

  const cols: DataTableColumn<ExtensionRequestAdminEntry>[] = [
    { id: 'id', header: 'Booking', cell: r => <span className="font-mono text-sm">#{r.hotelBookingId}</span> },
    { id: 'type', header: 'Type', cell: r => <Badge tone="neutral">{r.type.replace('_', ' ')}</Badge> },
    { id: 'status', header: 'Status', cell: r => <Badge tone={r.status === 'APPROVED' ? 'success' : r.status === 'DECLINED' ? 'danger' : 'warning'}>{r.status}</Badge> },
    { id: 'fee', header: 'Fee est.', cell: r => r.feeEstimate != null ? <span>₹{r.feeEstimate}</span> : <span className="text-muted">—</span> },
    {
      id: 'actions', header: '', align: 'right',
      cell: r => r.status === 'REQUESTED'
        ? <Button size="sm" variant="outline" onClick={() => { setSelected(r); setNote('') }}>Review</Button>
        : null,
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Hotel Management" description="Review extension requests from passengers." />

      <div className="flex gap-2">
        <select value={status} onChange={e => setStatus(e.target.value)} className="h-10 rounded-lg border border-border bg-surface px-3 text-sm">
          <option value="">All statuses</option>
          {['REQUESTED', 'APPROVED', 'DECLINED'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {list.isLoading
        ? <div className="h-48 animate-pulse rounded-xl bg-surface" />
        : <DataTable caption="Extension requests" columns={cols} rows={list.data?.content ?? []} getRowKey={r => String(r.id)} emptyDescription="No extension requests." />
      }

      {list.data && list.data.totalPages > 1 && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="self-center text-sm text-muted">Page {page + 1} / {list.data.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= list.data.totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}

      <Sheet open={selected !== null} onOpenChange={open => { if (!open) setSelected(null) }}>
        {selected && (
          <div className="flex flex-col gap-4 p-6">
            <h2 className="text-xl font-semibold">Review extension request</h2>
            <Card>
              <CardContent className="grid grid-cols-2 gap-3 pt-4 text-sm">
                <div><p className="text-muted">Type</p><p className="font-semibold">{selected.type.replace('_', ' ')}</p></div>
                <div><p className="text-muted">Booking</p><p className="font-semibold">#{selected.hotelBookingId}</p></div>
                {selected.feeEstimate != null && <div><p className="text-muted">Fee estimate</p><p className="font-semibold">₹{selected.feeEstimate}</p></div>}
              </CardContent>
            </Card>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Response note (optional)</span>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
                className="rounded-lg border border-border bg-surface p-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy"
                placeholder="Reason or instructions for the passenger…" />
            </label>
            <div className="flex gap-2">
              <Button variant="cta" onClick={() => resolve.mutate({ id: selected.id, decision: 'APPROVED' })} disabled={resolve.isPending}>Approve</Button>
              <Button variant="ghost" className="text-danger" onClick={() => resolve.mutate({ id: selected.id, decision: 'DECLINED' })} disabled={resolve.isPending}>Decline</Button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  )
}
