import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type DataTableColumn } from '@/components/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { getAdminNotifications, retryNotification, sendAnnouncement, type NotificationAdminEntry } from '../api'

export function AdminNotificationsPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [page, setPage] = useState(0)
  const [channel, setChannel] = useState('')
  const [status, setStatus] = useState('')
  const [showAnnounce, setShowAnnounce] = useState(false)
  const [target, setTarget] = useState('ALL')
  const [annTitle, setAnnTitle] = useState('')
  const [annBody, setAnnBody] = useState('')

  const list = useQuery({
    queryKey: ['admin-notifications', channel, status, page],
    queryFn: () => getAdminNotifications(channel || undefined, status || undefined, page, 20),
  })

  const retry = useMutation({
    mutationFn: retryNotification,
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['admin-notifications'] }); toast({ title: 'Retry queued', tone: 'success' }) },
  })

  const announce = useMutation({
    mutationFn: () => sendAnnouncement(target, annTitle, annBody),
    onSuccess: () => { setShowAnnounce(false); setAnnTitle(''); setAnnBody(''); toast({ title: 'Announcement sent', tone: 'success' }) },
  })

  const cols: DataTableColumn<NotificationAdminEntry>[] = [
    { id: 'title', header: 'Title', cell: r => <span className="text-sm text-text">{r.title}</span> },
    { id: 'type', header: 'Type', cell: r => <Badge tone="neutral">{r.type}</Badge> },
    { id: 'channel', header: 'Channel', cell: r => <span className="text-xs">{r.channel}</span> },
    { id: 'status', header: 'Status', cell: r => <Badge tone={r.deliveryStatus === 'SENT' ? 'success' : r.deliveryStatus === 'FAILED' ? 'danger' : 'warning'}>{r.deliveryStatus}</Badge> },
    {
      id: 'actions', header: '', align: 'right',
      cell: r => r.deliveryStatus === 'FAILED'
        ? <Button size="sm" variant="outline" onClick={() => retry.mutate(r.id)} disabled={retry.isPending}>Retry</Button>
        : null,
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Notification Management"
        description="Delivery log and announcement tools."
        actions={<Button variant="cta" onClick={() => setShowAnnounce(v => !v)}>Send announcement</Button>}
      />

      {showAnnounce && (
        <Card>
          <CardHeader><CardTitle>Send announcement</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex gap-2">
              {['ALL', 'TRAIN', 'USER'].map(t => (
                <button key={t} onClick={() => setTarget(t)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${target === t ? 'border-brand-navy bg-brand-navy text-white' : 'border-border text-muted'}`}>
                  {t}
                </button>
              ))}
            </div>
            <input value={annTitle} onChange={e => setAnnTitle(e.target.value)} placeholder="Title"
              className="h-10 rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy" />
            <textarea value={annBody} onChange={e => setAnnBody(e.target.value)} rows={3} placeholder="Message body"
              className="rounded-lg border border-border bg-surface p-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy" />
            <Button variant="cta" onClick={() => announce.mutate()} disabled={!annTitle || !annBody || announce.isPending}>
              {announce.isPending ? 'Sending…' : 'Send'}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <select value={channel} onChange={e => setChannel(e.target.value)} className="h-10 rounded-lg border border-border bg-surface px-3 text-sm">
          <option value="">All channels</option>
          {['IN_APP', 'EMAIL'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)} className="h-10 rounded-lg border border-border bg-surface px-3 text-sm">
          <option value="">All statuses</option>
          {['PENDING', 'SENT', 'FAILED'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {list.isLoading
        ? <div className="h-48 animate-pulse rounded-xl bg-surface" />
        : <DataTable caption="Notifications" columns={cols} rows={list.data?.content ?? []} getRowKey={r => String(r.id)} emptyDescription="No notifications." />
      }

      {list.data && list.data.totalPages > 1 && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="self-center text-sm text-muted">Page {page + 1} / {list.data.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= list.data.totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  )
}
